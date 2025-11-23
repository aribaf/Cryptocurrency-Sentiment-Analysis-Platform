#!/usr/bin/env python3
"""
Enhanced Reddit -> FinBERT pipeline with fixes:
- safe unique index creation with duplicate detection
- optional --dedupe run to remove duplicate 'id' docs (keeps newest)
- snapshots CSV write no longer fails due to '_id'
- VADER availability message & install hint
- logs FinBERT id2label mapping
- minor robustness improvements
"""
import os
import re
import json
import time
import argparse
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import praw
from dotenv import load_dotenv
from pymongo import MongoClient, errors

# NLP / Sentiment
import spacy
from langdetect import detect, DetectorFactory

# Transformers
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# VADER (secondary sentiment)
try:
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
except Exception:
    SentimentIntensityAnalyzer = None

# --- Initialize deterministic langdetect ---
DetectorFactory.seed = 0

# ---------- CONFIGURATION ----------
load_dotenv()

# Required env vars (script will error if not found)
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "crypto-sentiment-bot/0.1")
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "crypto")
MONGO_COLLECTION_POSTS = os.getenv("MONGO_COLLECTION_POSTS", "reddit_posts")
MONGO_COLLECTION_SNAPSHOTS = os.getenv("MONGO_COLLECTION_SNAPSHOTS", "snapshots")

# Pipeline settings (tweakable)
FETCH_INTERVAL = int(os.getenv("FETCH_INTERVAL", 1800))  # seconds
SUBREDDITS = os.getenv("SUBREDDITS", "CryptoCurrency,Bitcoin,ethtrader,CryptoMarkets,Solana,sol").split(",")
FINBERT_MODEL = os.getenv("FINBERT_MODEL", "ProsusAI/finbert")
OUTPUT_POSTS = os.getenv("OUTPUT_POSTS", "reddit_crypto_posts.jsonl")
OUTPUT_SNAPSHOTS = os.getenv("OUTPUT_SNAPSHOTS", "sentiment_snapshots.csv")

# Filters
MIN_UPVOTES = int(os.getenv("MIN_UPVOTES", 5))
MIN_TEXT_LENGTH = int(os.getenv("MIN_TEXT_LENGTH", 30))
MIN_AUTHOR_ACCOUNT_AGE_DAYS = int(os.getenv("MIN_AUTHOR_ACCOUNT_AGE_DAYS", 7))
MIN_AUTHOR_KARMA = int(os.getenv("MIN_AUTHOR_KARMA", 10))  # link + comment combined
MAX_COMMENTS_TO_FETCH = int(os.getenv("MAX_COMMENTS_TO_FETCH", 5))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 8))
HALF_LIFE_SECONDS = int(os.getenv("HALF_LIFE_SECONDS", 6 * 3600))  # for time-weighting snapshots

# Bot-detection heuristics (simple)
BOT_USERNAME_PATTERNS = [r"bot$", r"^bot", r"auto", r"feed", r"news", r"ticker"]
BOT_REGEX = re.compile("|".join(BOT_USERNAME_PATTERNS), re.I)

# Rate-limit between subreddits to be polite
SLEEP_BETWEEN_SUBS = float(os.getenv("SLEEP_BETWEEN_SUBS", 1.0))

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("reddit-finbert")

# ---------- Basic env validation ----------
missing = [k for k, v in {
    "REDDIT_CLIENT_ID": REDDIT_CLIENT_ID,
    "REDDIT_CLIENT_SECRET": REDDIT_CLIENT_SECRET,
    "MONGO_URI": MONGO_URI,
}.items() if not v]
if missing:
    log.error("Missing required environment variables: %s", ", ".join(missing))
    raise SystemExit(1)

# ---------- Setup clients ----------
reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent=REDDIT_USER_AGENT,
)

mongo_client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
db = mongo_client[MONGO_DB]
posts_collection = db[MONGO_COLLECTION_POSTS]
snapshots_collection = db[MONGO_COLLECTION_SNAPSHOTS]

# ---------- Helper: dedupe existing duplicates (keeps newest per 'created_utc') ----------
def dedupe_posts_collection(dry_run: bool = False) -> Dict[str, int]:
    """
    Finds duplicate 'id' values in posts_collection and deletes older docs keeping the newest.
    Returns summary dict {checked: n, duplicates_fixed: m}
    dry_run=True will log what would be removed without deleting.
    """
    log.info("Starting dedupe operation (dry_run=%s). This may take time for large collections.", dry_run)
    pipeline = [
        {"$group": {"_id": "$id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dup_cursor = posts_collection.aggregate(pipeline, allowDiskUse=True)
    checked = 0
    fixed = 0
    for dup in dup_cursor:
        checked += 1
        post_id = dup["_id"]
        # fetch all docs with this id, sort by created_utc desc (newest first)
        docs = list(posts_collection.find({"id": post_id}).sort("created_utc", -1))
        if len(docs) <= 1:
            continue
        keep = docs[0]
        to_remove = docs[1:]
        remove_count = len(to_remove)
        fixed += remove_count
        if dry_run:
            log.info("Would remove %d duplicates for id=%s (keeping _id=%s)", remove_count, post_id, keep.get("_id"))
        else:
            ids_to_remove = [d["_id"] for d in to_remove]
            try:
                posts_collection.delete_many({"_id": {"$in": ids_to_remove}})
                log.info("Removed %d duplicates for id=%s (kept _id=%s)", remove_count, post_id, keep.get("_id"))
            except Exception as e:
                log.error("Error deleting duplicates for id=%s: %s", post_id, e)
    log.info("Dedupe complete: checked %d duplicate groups, removed %d documents.", checked, fixed)
    return {"checked_groups": checked, "removed_documents": fixed}

# Create unique index on post ID to avoid duplicate inserts (safe attempt)
def ensure_unique_index_on_id():
    try:
        posts_collection.create_index("id", unique=True)
        log.info("Unique index on 'id' ensured.")
    except Exception as e:
        log.warning("Could not create unique index on 'id': %s", e)
        # attempt to show a few duplicate id examples for debugging
        try:
            dup = posts_collection.aggregate([
                {"$group": {"_id": "$id", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gt": 1}}},
                {"$limit": 5}
            ])
            dup_list = list(dup)
            if dup_list:
                log.warning("Found duplicate id examples (first 5): %s", dup_list)
            else:
                log.warning("No duplicate groups found when checking sample, but index creation still failed.")
        except Exception:
            log.debug("Failed to enumerate duplicates while handling index creation error.", exc_info=True)

# ---------- NLP models ----------
# spaCy (for NER + lemmatization)
try:
    nlp = spacy.load("en_core_web_sm", disable=["parser"])  # keep NER + tagger + lemmatizer
    log.info("spaCy loaded.")
except OSError:
    log.error("spaCy model 'en_core_web_sm' not found. Please install: python -m spacy download en_core_web_sm")
    raise

# VADER fallback
vader = None
if SentimentIntensityAnalyzer is not None:
    try:
        vader = SentimentIntensityAnalyzer()
        log.info("VADER initialized.")
    except Exception:
        vader = None
        log.warning("VADER import succeeded but initialization failed.")
else:
    log.warning("VADER not available. To enable, run: pip install nltk && run Python: import nltk; nltk.download('vader_lexicon')")

# ---------- FinBERT / Transformers setup ----------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
log.info("Device for PyTorch: %s", device)

log.info("Loading FinBERT tokenizer and model '%s' (this may take a minute)...", FINBERT_MODEL)
tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
model.to(device)
# safe label mapping from model config
if hasattr(model.config, "id2label"):
    sentiment_labels = [model.config.id2label[i] for i in sorted(model.config.id2label.keys())]
else:
    sentiment_labels = ["negative", "neutral", "positive"]
log.info("Sentiment labels: %s", sentiment_labels)
log.info("FinBERT id2label mapping: %s", getattr(model.config, "id2label", {}))

# ---------- Utilities: text cleaning & preprocessing ----------
URL_REGEX = re.compile(r"https?://\S+|www\.\S+")
MENTION_REGEX = re.compile(r"/u/\w+|u/\w+|@\w+")
EXTRA_WHITESPACE = re.compile(r"\s+")
EMOJI_REGEX = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "]+",
    flags=re.UNICODE,
)

CONTRACTIONS = {
    "can't": "cannot", "won't": "will not", "n't": " not", "'re": " are", "'s": " is", "'d": " would",
    "'ll": " will", "'t": " not", "'ve": " have", "'m": " am"
}

NEGATION_WORDS = {"not", "no", "never", "n't", "cannot", "neither", "nor"}


def expand_contractions(text: str) -> str:
    for k, v in CONTRACTIONS.items():
        text = re.sub(k, v, text, flags=re.I)
    return text


def simple_negation_mark(text: str) -> str:
    tokens = text.split()
    out = []
    negate = False
    for t in tokens:
        if any(t.lower().startswith(n) for n in NEGATION_WORDS):
            negate = True
            out.append(t)
            continue
        if negate:
            if any(ch in t for ch in ".!?;"):
                out.append("NOT_" + t)
                negate = False
            else:
                out.append("NOT_" + t)
        else:
            out.append(t)
    return " ".join(out)


def clean_and_lemmatize(text: str) -> str:
    if not text:
        return ""
    text = URL_REGEX.sub(" ", text)
    text = MENTION_REGEX.sub(" ", text)
    text = EMOJI_REGEX.sub(" ", text)
    text = expand_contractions(text)
    text = EXTRA_WHITESPACE.sub(" ", text).strip()
    text = text.lower()
    doc = nlp(text)
    lemmas = []
    for token in doc:
        if token.is_space or token.is_punct:
            continue
        lemmas.append(token.lemma_)
    cleaned = " ".join(lemmas)
    cleaned = simple_negation_mark(cleaned)
    return cleaned

# ---------- Helper functions for Reddit & Mongo ----------
def is_author_valid(author) -> bool:
    try:
        if author is None:
            return False
        name = getattr(author, "name", None)
        if not name or name.lower() in {"[deleted]", "automoderator"}:
            return False
        if BOT_REGEX.search(name):
            return False
        created_utc = getattr(author, "created_utc", None)
        if created_utc:
            acc_age_days = (datetime.utcnow() - datetime.utcfromtimestamp(created_utc)).days
            if acc_age_days < MIN_AUTHOR_ACCOUNT_AGE_DAYS:
                return False
        link_karma = getattr(author, "link_karma", 0) or 0
        comment_karma = getattr(author, "comment_karma", 0) or 0
        if (link_karma + comment_karma) < MIN_AUTHOR_KARMA:
            return False
        return True
    except Exception:
        return False


def safe_fetch_comments(post, limit=MAX_COMMENTS_TO_FETCH) -> str:
    comments_texts = []
    try:
        post.comment_sort = "top"
        post.comments.replace_more(limit=0)
        count = 0
        for c in post.comments:
            if count >= limit:
                break
            body = getattr(c, "body", None)
            if body:
                comments_texts.append(body)
                count += 1
    except Exception as e:
        log.debug("Error fetching comments for %s: %s", getattr(post, "id", "unknown"), e)
    return " ".join(comments_texts)


def detect_english(text: str) -> bool:
    try:
        if len(text) < 50:
            return False
        return detect(text) == "en"
    except Exception:
        return False

# ---------- Sentiment inference (FinBERT + VADER ensemble) ----------
def finbert_predict(texts: List[str], batch_size: int = BATCH_SIZE) -> List[Dict[str, Any]]:
    results = []
    model.eval()
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            inputs = tokenizer(batch, padding=True, truncation=True, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()
            for p in probs:
                neg, neu, pos = p[0], p[1], p[2]
                eps = 1e-12
                import math
                entropy = -sum([x * math.log(x + eps) for x in p])
                label = sentiment_labels[p.argmax()]
                results.append({
                    "label": label,
                    "neg": float(neg),
                    "neu": float(neu),
                    "pos": float(pos),
                    "entropy": float(entropy)
                })
    return results


def vader_predict(text: str) -> Dict[str, float]:
    if vader is None:
        return {"compound": 0.0, "neg": 0.0, "neu": 0.0, "pos": 0.0}
    scores = vader.polarity_scores(text)
    return scores


def ensemble_decision(finbert_out: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    polarity = finbert_out["pos"] - finbert_out["neg"]
    fin_label = finbert_out["label"]
    entropy = finbert_out["entropy"]
    import math
    max_entropy = math.log(3)
    norm_entropy = min(entropy / max_entropy, 1.0)
    base_conf = 1.0 - norm_entropy

    vader_scores = vader_predict(raw_text)
    vader_compound = vader_scores.get("compound", 0.0)
    vader_sign = 1 if vader_compound > 0.05 else (-1 if vader_compound < -0.05 else 0)
    fin_sign = 1 if polarity > 0.05 else (-1 if polarity < -0.05 else 0)
    agreement = (vader_sign != 0 and vader_sign == fin_sign)

    conf = base_conf
    if agreement:
        conf = min(1.0, conf + 0.15)
    if not agreement and abs(vader_compound) > 0.25 and base_conf < 0.5:
        conf = max(0.0, conf - 0.2)

    final_label = fin_label

    return {
        "label": final_label,
        "polarity_score": polarity,
        "confidence": float(conf),
        "finbert": finbert_out,
        "vader": vader_scores
    }

# ---------- Core pipeline functions ----------
COIN_KEYWORDS = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth", "ether"],
    "SOL": ["solana", "sol"],
}

def fetch_posts(limit_per_sub=50) -> List[Dict[str, Any]]:
    try:
        recent = list(posts_collection.find({}, {"id": 1}).sort("created_utc", -1).limit(2000))
        scraped_ids = {d["id"] for d in recent if "id" in d}
    except Exception:
        scraped_ids = set()

    posts_out = []
    for sub in SUBREDDITS:
        try:
            subreddit = reddit.subreddit(sub.strip())
        except Exception as e:
            log.warning("Could not access subreddit %s: %s", sub, e)
            continue

        try:
            for post in subreddit.new(limit=limit_per_sub):
                pid = getattr(post, "id", None)
                if not pid or pid in scraped_ids:
                    continue

                if getattr(post, "crosspost_parent", None):
                    continue
                if getattr(post, "stickied", False):
                    continue
                if getattr(post, "removed_by_category", None):
                    continue

                if getattr(post, "score", 0) < MIN_UPVOTES:
                    continue

                author = getattr(post, "author", None)
                if not is_author_valid(author):
                    continue

                post_text = (getattr(post, "title", "") or "") + " " + (getattr(post, "selftext", "") or "")
                if len(post_text) < MIN_TEXT_LENGTH:
                    comments_text = safe_fetch_comments(post, limit=MAX_COMMENTS_TO_FETCH)
                    if len(post_text + " " + comments_text) < MIN_TEXT_LENGTH:
                        continue
                else:
                    comments_text = safe_fetch_comments(post, limit=MAX_COMMENTS_TO_FETCH)

                if not detect_english(post_text + " " + comments_text):
                    continue

                combined_raw = post_text + " " + comments_text
                cleaned = clean_and_lemmatize(combined_raw)

                low = cleaned.lower()
                detected_coin = "UNKNOWN"
                for coin, keys in COIN_KEYWORDS.items():
                    if any(k in low for k in keys):
                        detected_coin = coin
                        break

                posts_out.append({
                    "id": pid,
                    "title": getattr(post, "title", ""),
                    "text_comments_raw": combined_raw,
                    "text_for_finbert": cleaned,
                    "created_utc": datetime.utcfromtimestamp(getattr(post, "created_utc", time.time())),
                    "subreddit": getattr(post, "subreddit", "").display_name if getattr(post, "subreddit", None) else sub,
                    "url": getattr(post, "url", None),
                    "permalink": getattr(post, "permalink", None),
                    "coin": detected_coin,
                    "upvotes": getattr(post, "score", 0),
                    "num_comments": getattr(post, "num_comments", 0),
                    "author": getattr(author, "name", None) if author else None,
                })
                scraped_ids.add(pid)
            time.sleep(SLEEP_BETWEEN_SUBS)
        except Exception as e:
            log.warning("Error iterating subreddit %s: %s", sub, e)
    return posts_out

def add_sentiment(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not posts:
        return posts
    texts = [p["text_for_finbert"] or "" for p in posts]
    finbert_outs = finbert_predict(texts, batch_size=BATCH_SIZE)
    for i, p in enumerate(posts):
        fin = finbert_outs[i]
        ensemble = ensemble_decision(fin, p["text_comments_raw"])
        p["sentiment"] = {
            "label": ensemble["label"],
            "scores": {
                "positive": ensemble["finbert"]["pos"],
                "neutral": ensemble["finbert"]["neu"],
                "negative": ensemble["finbert"]["neg"],
            },
            "polarity": float(ensemble["polarity_score"]),
            "confidence": float(ensemble["confidence"]),
            "vader": ensemble["vader"],
        }
    return posts

def save_posts(posts: List[Dict[str, Any]]):
    if not posts:
        return
    posts_to_save = []
    for p in posts:
        doc = {k: v for k, v in p.items() if k != "text_for_finbert"}
        created = doc.get("created_utc")
        if isinstance(created, datetime):
            created_str = created.strftime("%Y-%m-%dT%H:%M:%S")
        else:
            created_str = str(created)
        doc["created_utc"] = created_str
        doc["created_at"] = created_str
        doc["text"] = doc.pop("text_comments_raw", "")
        doc["_ingested_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        posts_to_save.append(doc)

    try:
        with open(OUTPUT_POSTS, "a", encoding="utf-8") as f:
            for doc in posts_to_save:
                f.write(json.dumps(doc, default=str) + "\n")
    except Exception as e:
        log.warning("Failed to write local JSONL: %s", e)

    try:
        posts_collection.insert_many(posts_to_save, ordered=False)
        log.info("Saved %d posts to MongoDB.", len(posts_to_save))
    except errors.BulkWriteError as bwe:
        log.warning("BulkWriteError while inserting posts: %s", bwe.details)
    except Exception as e:
        log.error("Unexpected error inserting posts: %s", e)

def summarize_and_snapshot(posts: List[Dict[str, Any]]):
    if not posts:
        return
    now = datetime.utcnow()
    coin_groups = {}
    for p in posts:
        coin = p.get("coin", "UNKNOWN")
        coin_groups.setdefault(coin, []).append(p)
    snapshots = []
    for coin, items in coin_groups.items():
        values = []
        for it in items:
            created = it.get("created_utc")
            if isinstance(created, datetime):
                created_dt = created
            else:
                try:
                    created_dt = datetime.strptime(str(created), "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    created_dt = now
            time_diff = (now - created_dt).total_seconds()
            weight = 2 ** (-time_diff / HALF_LIFE_SECONDS)
            polarity = float(it.get("sentiment", {}).get("polarity", 0.0))
            values.append({"polarity": polarity, "weight": weight, "label": it.get("sentiment", {}).get("label")})
        if not values:
            continue
        numerator = sum(v["polarity"] * v["weight"] for v in values)
        denom = sum(v["weight"] for v in values) or 1.0
        time_weighted_polarity = numerator / denom
        from collections import Counter
        labels = [v["label"] for v in values if v.get("label")]
        counter = Counter(labels)
        total = len(labels) or 1
        snapshot = {
            "time": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "coin": coin,
            "positive": (counter.get("positive", 0) / total) * 100,
            "neutral": (counter.get("neutral", 0) / total) * 100,
            "negative": (counter.get("negative", 0) / total) * 100,
            "total_posts": len(values),
            "avg_polarity": sum(v["polarity"] for v in values) / len(values),
            "time_weighted_polarity": float(time_weighted_polarity),
        }
        snapshots.append(snapshot)

    if snapshots:
        try:
            snapshots_collection.insert_many(snapshots, ordered=False)
            log.info("Saved %d snapshots to MongoDB.", len(snapshots))
        except Exception as e:
            log.warning("Could not save snapshots to MongoDB: %s", e)

        # CSV append: only expected fields (strip _id or extra keys)
        import csv
        file_exists = os.path.isfile(OUTPUT_SNAPSHOTS)
        fieldnames = ["time", "coin", "positive", "neutral", "negative", "total_posts", "avg_polarity", "time_weighted_polarity"]
        try:
            with open(OUTPUT_SNAPSHOTS, "a", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                if not file_exists:
                    writer.writeheader()
                for s in snapshots:
                    row = {k: s.get(k, "") for k in fieldnames}
                    writer.writerow(row)
        except Exception as e:
            log.warning("Could not write snapshots CSV: %s", e)

# ---------- Main runner ----------
def run_once(limit_per_sub=50):
    log.info("Starting single-run fetch (limit_per_sub=%d)...", limit_per_sub)
    posts = fetch_posts(limit_per_sub=limit_per_sub)
    log.info("Fetched %d candidate posts.", len(posts))
    if not posts:
        log.info("No posts after filtering.")
        return
    posts = add_sentiment(posts)
    save_posts(posts)
    summarize_and_snapshot(posts)
    log.info("Single-run complete. Processed %d posts.", len(posts))

def run_loop(limit_per_sub=50, sleep_interval=FETCH_INTERVAL):
    log.info("Starting main loop: fetch every %d seconds.", sleep_interval)
    try:
        while True:
            try:
                run_once(limit_per_sub=limit_per_sub)
            except Exception as e:
                log.exception("Unhandled error during run_once: %s", e)
            log.info("Sleeping for %d seconds...", sleep_interval)
            time.sleep(sleep_interval)
    except KeyboardInterrupt:
        log.info("Shutting down on user interrupt.")

# ---------- CLI ----------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reddit FinBERT Sentiment Pipeline (enhanced)")
    parser.add_argument("--once", action="store_true", help="Run single iteration and exit")
    parser.add_argument("--limit", type=int, default=50, help="Posts per subreddit to fetch (default:50)")
    parser.add_argument("--interval", type=int, default=FETCH_INTERVAL, help="Loop interval in seconds")
    parser.add_argument("--dedupe", action="store_true", help="Run dedupe routine on posts collection (keeps newest by created_utc) and exit")
    parser.add_argument("--dedupe-dry", action="store_true", help="Run dedupe dry-run (log removals) and exit")
    args = parser.parse_args()

    # If user requests dedupe, do it first and exit (or continue if you want)
    if args.dedupe or args.dedupe_dry:
        dry = bool(args.dedupe_dry)
        res = dedupe_posts_collection(dry_run=dry)
        # After dedupe attempt to create the unique index
        ensure_unique_index_on_id()
        log.info("Dedupe finished: %s", res)
        if args.dedupe:
            log.info("Dedupe completed. Exiting as requested (--dedupe).")
            raise SystemExit(0)
        else:
            log.info("Dedupe dry-run completed. Exiting as requested (--dedupe-dry).")
            raise SystemExit(0)

    # Ensure unique index now (attempt; may warn and show duplicates)
    ensure_unique_index_on_id()

    if args.once:
        run_once(limit_per_sub=args.limit)
    else:
        run_loop(limit_per_sub=args.limit, sleep_interval=args.interval)
