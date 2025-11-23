#!/usr/bin/env python3
"""
pipeline_all_in_one_enhanced.py

Single-file pipeline: scrape (Nitter+Selenium) -> analyze (tweet-specialized model) -> aggregate.
Enhancements implemented:
 - emoji normalization (if `emoji` installed)
 - negation token handling (simple rule-based)
 - store logits, confidence, model version, analysis_version
 - confidence thresholding (mark "Uncertain")
 - compute weighted tweet_score using credibility (followers/verified) and recency
 - save user_followers and user_verified in scrape (best-effort)
 - store sentiment.score_weighted for use in aggregation
 - keep original Mongo schema compatibility (tweet_id, scraped_at, etc.)

Requirements: pymongo, selenium, transformers, torch, langdetect (optional), emoji (optional), python-dateutil (optional)
"""
import os
import sys
import time
import random
import re
import traceback
import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

# -----------------------
# Configuration (env-overridable)
# -----------------------
MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
)
DB_NAME = os.environ.get("DB_NAME", "crypto_tweets_db")

# Expanded queries per coin (used for searching with Nitter)
COIN_QUERIES = {
    "BTC": ["#BTC", "BTC", "Bitcoin", "#Bitcoin", "bitcoin"],
    "ETH": ["#ETH", "ETH", "Ethereum", "#Ethereum", "ethereum"],
    "SOLANA": ["#SOL", "#SOLANA", "SOL", "SOLANA", "Solana", "solana"],
}

MAX_TWEETS_PER_COIN = int(os.environ.get("MAX_TWEETS_PER_COIN", "200"))
SCRAPE_INTERVAL_MINUTES = int(os.environ.get("SCRAPE_INTERVAL_MINUTES", "35"))
ANALYSIS_BATCH_SIZE = int(os.environ.get("ANALYSIS_BATCH_SIZE", "64"))
SENTIMENT_MODEL = os.environ.get("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))
ANALYSIS_VERSION = os.environ.get("ANALYSIS_VERSION", "v1_twitter_roberta_with_weighting")

# -----------------------
# Dependencies and imports
# -----------------------
try:
    from pymongo import MongoClient, UpdateOne
except Exception as e:
    print("Missing pymongo. Install with: pip install pymongo")
    raise

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import NoSuchElementException, TimeoutException
except Exception:
    webdriver = None
    By = None
    Options = None
    NoSuchElementException = Exception
    TimeoutException = Exception

# Transformers / Torch
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    from torch.nn.functional import softmax as torch_softmax
except Exception:
    torch = None
    AutoTokenizer = None
    AutoModelForSequenceClassification = None
    torch_softmax = None

# Langdetect fallback (best-effort)
try:
    from langdetect import detect, detect_langs, DetectorFactory
    DetectorFactory.seed = 0
except Exception:
    detect = None
    detect_langs = None


# emoji normalization (optional)
try:
    import emoji
    def normalize_emojis(text: str) -> str:
        # replace emoji with textual description which helps model tokenization
        return emoji.replace_emoji(text, replace=lambda c: ' ' + emoji.demojize(c).replace(':',' ') + ' ')
except Exception:
    emoji = None
    def normalize_emojis(text: str) -> str:
        return text

# dateutil parser (optional)
try:
    from dateutil import parser as dateutil_parser
except Exception:
    dateutil_parser = None

# -----------------------
# MongoDB connection & collections
# -----------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
raw_collection = db["latest_tweets"]
agg_collection = db["sentiment_trends_agg"]

def ensure_indexes():
    try:
        raw_collection.create_index("tweet_id", unique=True, background=True)
    except Exception:
        pass
    try:
        agg_collection.create_index([("coin", 1), ("unit", 1), ("time_bucket", 1)], unique=True, background=True)
    except Exception:
        pass

# -----------------------
# Utility helpers
# -----------------------
def now_iso():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

def parse_iso_to_dt(s: str) -> datetime:
    if not s:
        return datetime.utcnow()
    try:
        if dateutil_parser:
            return dateutil_parser.parse(s)
        else:
            return datetime.fromisoformat(s)
    except Exception:
        try:
            return datetime.strptime(s, "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return datetime.utcnow()

# a small set of very common English stopwords
EN_STOPWORDS = {
    "the", "and", "to", "is", "in", "for", "on", "of", "with", "this",
    "that", "it", "you", "i", "was", "are", "be", "as", "at", "have",
    "from", "or", "by", "an", "if", "but", "so", "not", "will", "would",
}

# slightly larger common English words to check ratio
EN_COMMON_WORDS = {
    "bitcoin", "crypto", "price", "market", "buy", "sell", "hold",
    "up", "down", "today", "tomorrow", "bullish", "bearish",
    "good", "bad", "going", "think", "know", "time", "people",
    "make", "like", "just", "now", "really", "very", "big", "small",
    "new", "news", "trend", "support", "resistance"
} | EN_STOPWORDS


def is_english_text(text: str) -> bool:
    if not text:
        return False

    s = text.strip()
    if len(s) < 10:
        # very short tweets are often noisy or emoji; skip
        return False

    # 1) Use langdetect with probabilities if available
    if detect and detect_langs:
        try:
            langs = detect_langs(s)
            # require English to be dominant and confident
            for lang in langs:
                if lang.lang == "en" and lang.prob >= 0.90:
                    return True
            return False
        except Exception:
            # fall back to heuristic below
            pass

    # 2) Heuristic fallback: stricter than before
    tokens = re.findall(r"[a-zA-Z]+", s.lower())
    if len(tokens) < 3:
        return False

    # how many tokens are common English stopwords
    stop_matches = sum(1 for t in tokens if t in EN_STOPWORDS)
    if stop_matches < 2:
        # require at least two real English stopwords
        return False

    # how many tokens look like common English words
    english_like = sum(1 for t in tokens if t in EN_COMMON_WORDS)
    english_ratio = english_like / max(1, len(tokens))

    # require that a decent chunk of the words look English
    if english_ratio < 0.4:
        return False

    # also keep the ASCII check to avoid weird scripts
    ascii_ratio = sum(1 for c in s if ord(c) < 128) / len(s)
    if ascii_ratio < 0.9:
        return False

    return True


NEGATION_TOKENS = {"not", "no", "never", "n't", "cannot", "can't", "dont", "don't"}

def apply_negation_prefix(text: str, window: int = 3) -> str:
    """Simple negation handling: when a negation token is found, prefix the next `window` words with NOT_."""
    if not text:
        return text
    toks = text.split()
    out = []
    i = 0
    while i < len(toks):
        t = toks[i]
        out.append(t)
        if t.lower().strip(".,!?')(") in NEGATION_TOKENS:
            # prefix next window non-punct tokens
            j = i + 1
            added = 0
            while j < len(toks) and added < window:
                if re.search(r"[a-zA-Z0-9]", toks[j]):
                    toks[j] = "NOT_" + toks[j]
                    added += 1
                j += 1
        i += 1
    return " ".join(toks)

def is_bot_username(username: str) -> bool:
    if not username:
        return False
    u = username.lower()
    if "bot" in u:
        return True
    if re.search(r"\d{5,}", u):
        return True
    return False

def contains_spam_keywords(text: str) -> bool:
    if not text:
        return False
    k = ["giveaway", "airdrop", "free", "follow", "retweet", "subscribe", "win", "dm to"]
    tl = text.lower()
    return any(kw in tl for kw in k)

# parse followers text like '1.2K' or '3,234' -> int
def parse_followers(text: str) -> int:
    if not text:
        return 0
    t = text.strip().upper().replace(',', '')
    try:
        if t.endswith('K'):
            return int(float(t[:-1]) * 1000)
        if t.endswith('M'):
            return int(float(t[:-1]) * 1000000)
        return int(float(t))
    except Exception:
        # try extract digits
        m = re.search(r"(\d[\d,\.KkMm]*)", text)
        if m:
            try:
                return int(m.group(1).replace(',', ''))
            except Exception:
                return 0
        return 0

# -----------------------
# Scraper class (CoinTweetScraper)
# -----------------------
class CoinTweetScraper:
    def __init__(self, mongo_uri, db_name="crypto_tweets_db", collection_name="latest_tweets", headless=True):
        self.SCRAPE_INTERVAL_MINUTES = SCRAPE_INTERVAL_MINUTES
        self.SCROLL_DELAY_MIN = 2.0
        self.SCROLL_DELAY_MAX = 5.0
        self.PAGE_LOAD_DELAY = 6.0
        self.TARGET_HASHTAGS = list(COIN_QUERIES.keys())

        self.nitter_instances = [
            "https://nitter.net",
            "https://nitter.poast.org",
            "https://twitt.re",
            "https://nitter.kavin.rocks",
        ]
        self.current_instance = None
        self.tweet_selector = '.main-tweet'

        # MongoDB
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client[db_name]
        self.collection = self.db[collection_name]
        try:
            self.collection.create_index("tweet_id", unique=True)
        except Exception:
            pass
        print(f"🗄️ MongoDB setup complete. Target collection: '{collection_name}'")

        # Selenium setup
        chrome_options = Options() if Options else None
        if chrome_options:
            if headless:
                try:
                    chrome_options.add_argument("--headless=new")
                except Exception:
                    chrome_options.add_argument("--headless")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
        try:
            if webdriver and Options:
                self.driver = webdriver.Chrome(options=chrome_options)
            else:
                self.driver = None
                print("[scraper] Selenium webdriver not available; scraper will be disabled.")
        except Exception as e:
            self.driver = None
            print("[scraper] Error initializing Chrome driver:", e)

    def try_nitter_instance(self, instance_url, hashtag, language='en'):
        search_url = f"{instance_url}/search?f=tweets&q=%23{hashtag}&l={language}"
        try:
            if not self.driver:
                return False
            self.driver.get(search_url)
            time.sleep(self.PAGE_LOAD_DELAY)
            tweets = self.driver.find_elements(By.CSS_SELECTOR, '.main-tweet')
            if not tweets:
                tweets = self.driver.find_elements(By.CSS_SELECTOR, '.timeline-item')
                if len(tweets) > 0:
                    self.tweet_selector = '.timeline-item'
                else:
                    raise ValueError("No tweets found.")
            else:
                self.tweet_selector = '.main-tweet'
            self.current_instance = instance_url
            return True
        except Exception:
            return False

    def find_working_instance(self, hashtag, language='en'):
        print("Finding a working Nitter instance...")
        for instance in random.sample(self.nitter_instances, len(self.nitter_instances)):
            if self.try_nitter_instance(instance, hashtag, language):
                print(f"✓ Using {self.current_instance}")
                return True
            time.sleep(1)
        print("❌ Could not find a working Nitter instance.")
        return False

    def scroll_and_collect(self, max_scrolls=80):
        tweets_collected = []
        seen_urls = set()
        no_new_content_count = 0
        if not self.driver:
            return tweets_collected

        for scroll in range(max_scrolls):
            try:
                tweet_elements = self.driver.find_elements(By.CSS_SELECTOR, self.tweet_selector)
            except Exception:
                tweet_elements = []
            previous_count = len(tweets_collected)
            for tweet_elem in tweet_elements:
                try:
                    link_elem = tweet_elem.find_element(By.CSS_SELECTOR, '.tweet-date a')
                    tweet_url = link_elem.get_attribute('href')
                    if tweet_url and tweet_url not in seen_urls:
                        seen_urls.add(tweet_url)
                        tweets_collected.append(tweet_elem)
                except Exception:
                    continue
            new_tweets = len(tweets_collected) - previous_count
            if new_tweets == 0:
                no_new_content_count += 1
                if no_new_content_count >= 5:
                    break
            else:
                no_new_content_count = 0
            try:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            except Exception:
                pass
            time.sleep(random.uniform(self.SCROLL_DELAY_MIN, self.SCROLL_DELAY_MAX))
        return tweets_collected

    def is_irrelevant_spam(self, text):
        spam_keywords = [
            "giveaway", "claim now", "airdrop scam", "free btc", "join telegram", "discord.gg"
        ]
        text_lower = text.lower() if text else ""
        non_english_chars = len(re.findall(r"[^a-zA-Z0-9\s.,!?$#@]", text_lower))
        if len(text_lower) > 0 and (non_english_chars / len(text_lower)) > 0.4:
            return True
        for keyword in spam_keywords:
            if keyword in text_lower:
                return True
        return False

    def extract_tweet_data(self, tweet_element, hashtag):
        data = {}
        coin_map = {"BTC": "Bitcoin", "ETH": "Ethereum", "SOLANA": "Solana"}
        try:
            text_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-content')
            raw_text = text_elem.text.strip()
            if not raw_text:
                return None
            # normalize emojis and apply negation processing
            text_norm = normalize_emojis(raw_text)
            text_norm = apply_negation_prefix(text_norm)
            data['text'] = text_norm
            if self.is_irrelevant_spam(data['text']):
                return None
            link_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-date a')
            tweet_url_nitter = link_elem.get_attribute('href')
            data['tweet_id'] = tweet_url_nitter.split('/')[-1]
            data['url'] = tweet_url_nitter.replace(self.current_instance, 'https://twitter.com')
            data['created_at'] = link_elem.get_attribute('title')
            header_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-header')
            try:
                data['username'] = header_elem.find_element(By.CSS_SELECTOR, '.username').text.replace('@', '').strip()
            except Exception:
                data['username'] = ''
            bot_patterns = ["giveaway", "promo", "airdrop"]
            if any(bp in (data['username'] or '').lower() for bp in bot_patterns):
                return None
            data['verified'] = self._check_verified(header_elem)
            # followers - best-effort parsing (not all nitter instances expose this)
            data['user_followers'] = 0
            try:
                fol_el = header_elem.find_element(By.CSS_SELECTOR, '.followers')
                data['user_followers'] = parse_followers(fol_el.text)
            except Exception:
                # try to look elsewhere in element text
                try:
                    header_text = header_elem.text
                    m = re.search(r"(\d[\d,\.KMk]*) followers", header_text, re.IGNORECASE)
                    if m:
                        data['user_followers'] = parse_followers(m.group(1))
                except Exception:
                    data['user_followers'] = 0

            # stats
            try:
                stats_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-stats')
                data['replies'] = self._extract_stat(stats_elem, 'icon-comment')
                data['retweets'] = self._extract_stat(stats_elem, 'icon-retweet')
                data['likes'] = self._extract_stat(stats_elem, 'icon-heart')
            except Exception:
                data['replies'] = data['retweets'] = data['likes'] = 0
            data['hashtag'] = hashtag
            data['coin'] = coin_map.get(hashtag, 'Unknown')
            data['scraped_at'] = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
            # language & bot heuristics
            if not is_english_text(data['text']):
                return None
            if is_bot_username(data['username']):
                return None

            # determine actionability and sarcasm heuristics (simple)
            data['is_actionable'] = not contains_spam_keywords(data['text']) and ('join' not in data['text'].lower())
            data['is_sarcastic'] = False
            if re.search(r"/s$|\bsarcasm\b|\bsarcastic\b", data['text'].lower()):
                data['is_sarcastic'] = True

            return data
        except Exception:
            return None

    def _check_verified(self, header_element):
        try:
            header_element.find_element(By.CSS_SELECTOR, '.icon-verified')
            return True
        except Exception:
            return False

    def _extract_stat(self, stats_elem, icon_class):
        try:
            el = stats_elem.find_element(By.CSS_SELECTOR, f'.{icon_class}')
            stat_text_el = el.find_element(By.XPATH, './following-sibling::span[1]')
            stat_text = stat_text_el.text.strip().replace(',', '')
            if 'K' in stat_text:
                return int(float(stat_text.replace('K', '')) * 1000)
            elif 'M' in stat_text:
                return int(float(stat_text.replace('M', '')) * 1000000)
            elif stat_text.isdigit():
                return int(stat_text)
            else:
                return 0
        except Exception:
            return 0

    def save_to_mongodb(self, tweets_list):
        if not tweets_list:
            print("⚠️ No tweets to save to MongoDB.")
            return 0
        inserted = 0
        modified = 0
        for tweet in tweets_list:
            filter_query = {'tweet_id': tweet['tweet_id']}
            update_data = {'$set': tweet}
            try:
                result = self.collection.update_one(filter_query, update_data, upsert=True)
                if result.upserted_id:
                    inserted += 1
                elif result.modified_count > 0:
                    modified += 1
            except Exception as e:
                print(f"[scraper] Database error on tweet {tweet.get('tweet_id')}: {e}")
        print(f"🗄️ MongoDB: {inserted} new tweets inserted, {modified} tweets updated.")
        return inserted

    def scrape_hashtag(self, hashtag, max_tweets=100, language='en'):
        print(f"\n{'='*60}\n⚙️ Running Scrape for #{hashtag}\n{'='*60}")
        if not self.find_working_instance(hashtag, language):
            return 0
        tweet_elements = self.scroll_and_collect(max_scrolls=80)
        print(f"🔍 Total tweet elements collected: {len(tweet_elements)}")
        tweets_list = []
        filtered_out = 0
        for tweet_elem in tweet_elements:
            if len(tweets_list) >= max_tweets:
                break
            tweet_data = self.extract_tweet_data(tweet_elem, hashtag)
            if tweet_data:
                tweets_list.append(tweet_data)
            else:
                filtered_out += 1
        print(f"✅ {len(tweets_list)} tweets passed filters | ❌ {filtered_out} filtered out")
        inserted_count = self.save_to_mongodb(tweets_list)
        return inserted_count

    def run_scheduled_scraper(self, max_tweets_per_tag=100, language='en'):
        print("\n" + "="*60)
        print(f"🟢 STARTING SCHEDULED SCRAPER (Interval: {self.SCRAPE_INTERVAL_MINUTES} min)")
        print("="*60)
        while True:
            start_time = time.time()
            total_inserted = 0
            for hashtag in self.TARGET_HASHTAGS:
                inserted = self.scrape_hashtag(
                    hashtag=hashtag,
                    max_tweets=max_tweets_per_tag,
                    language=language
                )
                total_inserted += inserted
            duration = time.time() - start_time
            wait_time = (self.SCRAPE_INTERVAL_MINUTES * 60) - duration
            print(f"\n--- Cycle Complete ---")
            print(f"Total inserted in this cycle: {total_inserted}")
            print(f"Duration: {duration:.2f} seconds.")
            if wait_time > 0:
                print(f"Waiting for {wait_time/60:.2f} minutes until next run...")
                time.sleep(wait_time)
            else:
                print("⚠️ Scrape duration exceeded interval. Running next cycle immediately.")

    def close(self):
        try:
            if self.driver:
                self.driver.quit()
            self.mongo_client.close()
            print("\n👋 Closed all connections.")
        except Exception:
            pass

# -----------------------
# Analyzer (transformers)
# -----------------------
class SentimentAnalyzer:
    def __init__(self, model_name: str = SENTIMENT_MODEL, device: Optional[str] = None):
        self.model_name = model_name
        self.device = device or ("cuda" if torch and torch.cuda.is_available() else "cpu")
        self.model = None
        self.tokenizer = None
        self.labels = None
        if AutoTokenizer and AutoModelForSequenceClassification:
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, use_fast=True)
                self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
                self.model.to(self.device)
                self.labels = ["negative", "neutral", "positive"]
            except Exception as e:
                print("[analyzer] model load error:", e)
                self.model = None
                self.tokenizer = None
        else:
            print("[analyzer] transformers/torch not available; analyzer will not run.")

    def get_unscored(self, batch_size: int = ANALYSIS_BATCH_SIZE) -> List[Dict]:
        q = {"is_irrelevant": {"$ne": True}, "sentiment": {"$exists": False}}
        docs = list(raw_collection.find(q).sort("scraped_at", 1).limit(batch_size))
        return docs

    def compute_weighted_score(self, doc: Dict, scores: Dict[str, float]) -> float:
        # base_score in [-1, 1]
        p_pos = scores.get("positive", 0.0)
        p_neg = scores.get("negative", 0.0)
        base_score = p_pos - p_neg

        # credibility
        followers = int(doc.get("user_followers") or 0)
        verified = bool(doc.get("verified") or doc.get("user_verified"))
        cred = 1.0
        if verified:
            cred += 0.5
        if followers > 0:
            cred += math.log10(1 + followers) / 5.0

        # recency – make both datetimes timezone-aware in UTC
        scraped_at = doc.get("scraped_at") or doc.get("created_at") or now_iso()
        dt = parse_iso_to_dt(scraped_at)

        # if dt is naive (no tzinfo), force it to UTC
        if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
            dt = dt.replace(tzinfo=timezone.utc)

        # use an aware "now" in UTC
        now_dt = datetime.now(timezone.utc)
        age_sec = max(0.0, (now_dt - dt).total_seconds())
        time_weight = math.exp(-age_sec / (3600 * 24 * 7))  # ~1-week decay

        tweet_score = base_score * cred * time_weight
        return tweet_score

    def analyze_batch(self, docs: List[Dict]) -> List[tuple]:
        out = []
        if not docs:
            return out
        if not self.model or not self.tokenizer:
            return out
        texts = [(d.get("text") or "")[:512] for d in docs]
        enc = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
        enc = {k: v.to(self.device) for k, v in enc.items()}
        with torch.no_grad():
            model_out = self.model(**enc)
            logits = model_out.logits
            probs = torch_softmax(logits, dim=1).cpu().tolist()
            logits_list = logits.cpu().tolist()
        for doc, p, logit in zip(docs, probs, logits_list):
            scores = dict(zip(self.labels, p))
            max_idx = int(max(range(len(p)), key=lambda i: p[i]))
            label_raw = self.labels[max_idx]
            confidence = float(max(p))
            label = label_raw.capitalize() if confidence >= CONFIDENCE_THRESHOLD else "Uncertain"
            tweet_score = self.compute_weighted_score(doc, scores)
            sent = {
                "label": label,
                "scores": scores,
                "logits": logit,
                "confidence": confidence,
                "score_weighted": tweet_score,
                "model": self.model_name,
                "analysis_version": ANALYSIS_VERSION,
                "analyzed_at": now_iso(),
            }
            out.append((doc, sent))
            # print to terminal
            try:
                text_preview = (doc.get("text") or "")[:200].replace("\n", " ")
                print(f"SCORED: id={doc.get('tweet_id')} label={label} confidence={confidence:.3f} scores={scores} text={text_preview}")
            except Exception:
                pass
        return out

    def update_db(self, results: List[tuple]) -> int:
        if not results:
            return 0
        ops = []
        for doc, sent in results:
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": {"sentiment": sent}}))
        if ops:
            try:
                raw_collection.bulk_write(ops, ordered=False)
                return len(ops)
            except Exception as e:
                print("[analyzer] bulk write error:", e)
                return 0
        return 0

# -----------------------
# Aggregator
# -----------------------
def aggregate_for_unit(unit: str = "day", lookback_days: int = 90):
    match_stage = {"$match": {"sentiment.scores": {"$exists": True}}}
    pipeline = [
        match_stage,
        {"$addFields": {
            "scraped_at_dt": {
                "$cond": [
                    {"$eq": [{"$type": "$scraped_at"}, "string"]},
                    {"$dateFromString": {"dateString": "$scraped_at"}},
                    "$scraped_at"
                ]
            }
        }},
        {"$group": {
            "_id": {"coin": "$coin", "time": {"$dateTrunc": {"date": "$scraped_at_dt", "unit": unit}}},
            "avg_pos": {"$avg": "$sentiment.scores.positive"},
            "avg_neg": {"$avg": "$sentiment.scores.negative"},
            "avg_weighted": {"$avg": "$sentiment.score_weighted"},
            "count": {"$sum": 1}
        }},
        {"$project": {
            "coin": "$_id.coin",
            "time_bucket": "$_id.time",
            "score": {"$subtract": ["$avg_pos", "$avg_neg"]},
            "score_weighted": "$avg_weighted",
            "tweet_count": "$count",
            "_id": 0
        }},
        {"$addFields": {"unit": unit}}
    ]
    pipeline.append({
        "$merge": {
            "into": agg_collection.name,
            "on": ["coin", "unit", "time_bucket"],
            "whenMatched": "replace",
            "whenNotMatched": "insert"
        }
    })
    try:
        list(raw_collection.aggregate(pipeline, allowDiskUse=True))
    except Exception as e:
        print(f"[aggregator] aggregation error for unit={unit}: {e}")

def run_aggregation_all():
    ensure_indexes()
    for u in ("hour", "day", "week"):
        aggregate_for_unit(unit=u)

# -----------------------
# Orchestrator
# -----------------------
def run_pipeline_once(scrape_headless=True):
    print(f"[{now_iso()}] Pipeline cycle start")
    scraped = 0
    try:
        scraper = CoinTweetScraper(mongo_uri=MONGO_URI, db_name=DB_NAME, collection_name="latest_tweets", headless=scrape_headless)
        scraper.TARGET_HASHTAGS = list(COIN_QUERIES.keys())
        total_ops = 0
        for coin, queries in COIN_QUERIES.items():
            inserted_for_coin = 0
            for q in queries:
                q_tag = q.lstrip('#')
                try:
                    if not scraper.find_working_instance(q_tag, language='en'):
                        continue
                    elems = scraper.scroll_and_collect(max_scrolls=80)
                    tweets_found = []
                    for el in elems:
                        doc = scraper.extract_tweet_data(el, coin)
                        if doc:
                            tweets_found.append(doc)
                            if len(tweets_found) >= MAX_TWEETS_PER_COIN:
                                break
                    if tweets_found:
                        inserted = scraper.save_to_mongodb(tweets_found)
                        inserted_for_coin += inserted
                        total_ops += inserted
                except Exception as e:
                    print(f"[pipeline] error scraping query={q} for coin={coin}: {e}")
            print(f"[pipeline] coin={coin} inserted_total={inserted_for_coin}")
        scraped = total_ops
    except Exception as e:
        print("[pipeline] scraping failed:", e)
        traceback.print_exc()

    print(f"[{now_iso()}] Scraper saved {scraped} tweets (upserts).")

    analyzer = SentimentAnalyzer()
    analyzed_total = 0
    try:
        while True:
            docs = analyzer.get_unscored(batch_size=ANALYSIS_BATCH_SIZE)
            if not docs:
                break
            results = analyzer.analyze_batch(docs)
            cnt = analyzer.update_db(results)
            analyzed_total += cnt
            print(f"[{now_iso()}] Analyzed batch: updated ~{cnt} docs. Total analyzed so far in this run: {analyzed_total}")
            time.sleep(0.5 + random.random() * 0.5)
    except Exception as e:
        print("[pipeline] analyzer failed during execution:", e)
        traceback.print_exc()

    try:
        print(f"[{now_iso()}] Starting aggregation...")
        run_aggregation_all()
        print(f"[{now_iso()}] Aggregation completed.")
    except Exception as e:
        print("[pipeline] aggregation failed:", e)
        traceback.print_exc()

    print(f"[{now_iso()}] Pipeline cycle finished. scraped={scraped} analyzed={analyzed_total}")
    return {"scraped": scraped, "analyzed": analyzed_total}

def run_pipeline_loop(poll_minutes: int = SCRAPE_INTERVAL_MINUTES):
    print("Starting pipeline loop. Press Ctrl+C to stop.")
    try:
        while True:
            start = datetime.utcnow()
            run_pipeline_once(scrape_headless=True)
            elapsed = (datetime.utcnow() - start).total_seconds()
            sleep_for = max(0, poll_minutes * 60 - elapsed)
            print(f"[{now_iso()}] Cycle elapsed {elapsed:.1f}s. Sleeping {sleep_for:.1f}s.")
            time.sleep(sleep_for)
    except KeyboardInterrupt:
        print("Shutting down pipeline loop.")

# -----------------------
# Main
# -----------------------
if __name__ == "__main__":
    print("Pipeline (scrape -> analyze -> aggregate) starting.")
    ensure_indexes()
    if "--once" in sys.argv:
        run_pipeline_once(scrape_headless=True)
    else:
        run_pipeline_loop(poll_minutes=SCRAPE_INTERVAL_MINUTES)
