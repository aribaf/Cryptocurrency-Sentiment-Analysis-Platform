
import os
import time
import logging
import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import feedparser
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dtparser
from dateutil.tz import tzutc
from pymongo import MongoClient, ASCENDING
from urllib.parse import urlparse, quote_plus

# Transformers imports (model will be downloaded automatically)
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

# ---------- Configuration ----------
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority",
)
DB_NAME = "crypto_news_db"
COLLECTION_NAME = "articles"

RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://www.theblock.co/feed",
    "https://decrypt.co/feed",
    # add more feeds you trust
]

# Only these three coins
TARGET_COINS = {
    "Bitcoin": ["bitcoin", "btc"],
    "Ethereum": ["ethereum", "eth"],
    "Solana": ["solana", "sol"],
}

DAYS_BACK = 30

# Polling interval for "real-time" updates (in seconds). Default: 1 hour.
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "3600"))

# NewsAPI config
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "76e8b553d9174152a46ea6e280e2205d")
NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything"
# maximum pages to fetch per coin (pageSize up to 100). Adjust if you want more backfill.
NEWSAPI_PAGE_SIZE = 100
NEWSAPI_MAX_PAGES = 5  # cautious default (up to 500 results per coin)

# Transformer model used for finance sentiment
MODEL_NAME = os.getenv("SENTIMENT_MODEL", "ProsusAI/finbert")  # FinBERT financial sentiment model

# Choose device: -1 for CPU, 0+ for GPU index
# Use env TRANSFORMER_DEVICE to override
DEVICE = int(os.getenv("TRANSFORMER_DEVICE", "-1"))

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# ---------- Utilities ----------
def get_db_collection():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    coll = db[COLLECTION_NAME]
    coll.create_index([("url", ASCENDING)], unique=True, sparse=True)
    coll.create_index([("published_at", ASCENDING)], background=True)
    coll.create_index([("coin", ASCENDING)], background=True)
    return coll


def fetch_rss(feed_url: str) -> List[Dict]:
    logging.info(f"Fetching RSS: {feed_url}")
    try:
        parsed = feedparser.parse(feed_url)
    except Exception as e:
        logging.exception("feedparser failed for %s: %s", feed_url, e)
        return []

    entries = []
    for e in parsed.entries:
        entry = {
            "title": e.get("title", "").strip(),
            "url": e.get("link") or e.get("id"),
            "published": e.get("published") or e.get("pubDate") or e.get("updated"),
            "raw": e,
            "source_name": (e.get("source", {}).get("title") if isinstance(e.get("source"), dict) else None),
        }
        entries.append(entry)
    return entries


def fetch_page_summary(url: str, max_chars: int = 900) -> str:
    if not url:
        return ""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; CryptoSentimentBot/1.0; +https://example.com/bot)"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
    except Exception as e:
        logging.debug("Failed to fetch page %s: %s", url, e)
        return ""

    soup = BeautifulSoup(r.text, "html.parser")

    # try meta description
    meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if meta_desc and meta_desc.get("content"):
        txt = meta_desc["content"].strip()
        return txt[:max_chars]

    # fallback: first substantial <p>
    for p in soup.find_all("p"):
        text = p.get_text(separator=" ", strip=True)
        if len(text) > 60:
            return text[:max_chars]

    full_text = soup.get_text(separator=" ", strip=True)
    return (full_text[:max_chars]) if full_text else ""


def extract_published_from_page(url: str) -> Optional[datetime]:
    """Try multiple meta tags and <time> to find article published date from page."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; CryptoSentimentBot/1.0)"}
        r = requests.get(url, headers=headers, timeout=8)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        meta_candidates = [
            ("property", "article:published_time"),
            ("name", "article:published_time"),
            ("name", "pubdate"),
            ("name", "publication_date"),
            ("itemprop", "datePublished"),
            ("property", "og:pubdate"),
            ("name", "pub_date"),
        ]
        for attr, val in meta_candidates:
            meta = soup.find("meta", attrs={attr: val})
            if meta and meta.get("content"):
                try:
                    dt = dtparser.parse(meta["content"])
                    if not dt.tzinfo:
                        dt = dt.replace(tzinfo=tzutc())
                    return dt.astimezone(tzutc())
                except Exception:
                    continue
        # fallback: <time datetime="...">
        time_tag = soup.find("time")
        if time_tag:
            dt_str = time_tag.get("datetime") or time_tag.get_text()
            if dt_str:
                try:
                    dt = dtparser.parse(dt_str)
                    if not dt.tzinfo:
                        dt = dt.replace(tzinfo=tzutc())
                    return dt.astimezone(tzutc())
                except Exception:
                    pass
    except Exception as exc:
        logging.debug("extract_published_from_page failed for %s: %s", url, exc)
        return None
    return None


def parse_published_date(published_str: Optional[str]) -> Optional[datetime]:
    if not published_str:
        return None
    try:
        dt = dtparser.parse(published_str)
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=tzutc())
        return dt.astimezone(tzutc())
    except Exception:
        return None


def detect_target_coin(title: str, summary: str) -> Optional[str]:
    text = (title + " " + summary).lower()
    found = []
    for coin, keywords in TARGET_COINS.items():
        for kw in keywords:
            # boundary-insensitive, but adequate for headlines
            if kw.lower() in text:
                found.append(coin)
                break
    if not found:
        return None
    # prefer order Bitcoin, Ethereum, Solana
    for coin in ["Bitcoin", "Ethereum", "Solana"]:
        if coin in found:
            return coin
    return found[0]


# ---------- NewsAPI integration ----------
def fetch_newsapi_for_coin(coin_name: str, keywords: List[str], cutoff_dt: datetime) -> List[Dict]:
    """
    Query NewsAPI for articles matching the coin keywords in the last DAYS_BACK days.
    Returns a list of entries similar to RSS entries: dicts with title,url,published,raw,source_name.
    """
    logging.info("NewsAPI backfill for %s (keywords=%s)", coin_name, keywords)
    entries = []
    if not NEWSAPI_KEY:
        logging.warning("No NEWSAPI_KEY provided, skipping NewsAPI backfill.")
        return entries

    # build q parameter, e.g. "bitcoin OR btc"
    q = " OR ".join([quote_plus(k) for k in keywords])
    headers = {"Authorization": NEWSAPI_KEY}
    now = datetime.utcnow().replace(tzinfo=tzutc())
    from_date = max((now - timedelta(days=DAYS_BACK)).date(), (now - timedelta(days=DAYS_BACK)).date())
    params_base = {
        "q": q,
        "from": from_date.isoformat(),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": NEWSAPI_PAGE_SIZE,
    }

    for page in range(1, NEWSAPI_MAX_PAGES + 1):
        params = dict(params_base)
        params["page"] = page
        try:
            resp = requests.get(NEWSAPI_ENDPOINT, params=params, headers=headers, timeout=10)
            if resp.status_code != 200:
                logging.warning("NewsAPI returned status %s: %s", resp.status_code, resp.text)
                break
            data = resp.json()
            articles = data.get("articles", [])
            if not articles:
                break
            for a in articles:
                entries.append(
                    {
                        "title": (a.get("title") or "").strip(),
                        "url": a.get("url"),
                        "published": a.get("publishedAt") or a.get("publishedAt"),
                        "raw": a,
                        "source_name": (a.get("source") or {}).get("name"),
                    }
                )
            # pagination: stop early if we've got fewer than page size
            total_results = data.get("totalResults")
            if not total_results:
                break
            # NewsAPI sometimes caps results; break if last page
            if len(articles) < NEWSAPI_PAGE_SIZE:
                break
            # avoid hitting rate limits too fast
            time.sleep(1)
        except Exception as exc:
            logging.exception("Error fetching NewsAPI page %s for %s: %s", page, coin_name, exc)
            break

    logging.info("NewsAPI found %d articles for %s", len(entries), coin_name)
    return entries


# ---------- Transformer sentiment wrapper ----------
class TransformerSentiment:
    def __init__(self, model_name: str = MODEL_NAME, device: int = DEVICE):
        logging.info("Loading transformer model %s on device %s ...", model_name, device)
        # Load tokenizer and model explicitly to avoid some pipeline download issues
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        # create a pipeline that returns all scores (probabilities for each class)
        self.pipe = pipeline(
            "sentiment-analysis",
            model=self.model,
            tokenizer=self.tokenizer,
            device=device,
            return_all_scores=True,
        )
        logging.info("Transformer model loaded.")

    def analyze(self, text: str) -> Dict:
        """
        Returns:
        {
            "score": float (in -1..1),
            "scores": {"positive": p_pos, "negative": p_neg, "neutral": p_neu},
            "raw": pipeline_output
        }
        We map probabilities to an overall score: pos_prob - neg_prob (range -1..1)
        """
        if not text:
            text = ""
        try:
            outputs = self.pipe(text[:1000])  # limit length for safety; model has own tokenization
            if not outputs or not outputs[0]:
                return {"score": 0.0, "scores": {"positive": 0.0, "negative": 0.0, "neutral": 0.0}, "raw": outputs}

            scores_list = outputs[0]
            p_pos = p_neg = p_neu = 0.0
            for item in scores_list:
                lab = item.get("label", "").upper()
                scr = float(item.get("score", 0.0))
                if "POS" in lab:
                    p_pos = scr
                elif "NEG" in lab:
                    p_neg = scr
                elif "NEU" in lab:
                    p_neu = scr
            overall = p_pos - p_neg
            return {
                "score": float(overall),
                "scores": {"positive": float(p_pos), "negative": float(p_neg), "neutral": float(p_neu)},
                "raw": scores_list,
            }
        except Exception as exc:
            logging.exception("Transformer pipeline failed: %s", exc)
            return {"score": 0.0, "scores": {"positive": 0.0, "negative": 0.0, "neutral": 1.0}, "raw": None}


# ---------- Main flow ----------
def process_feed_entries(entries: List[Dict], coll, analyzer: TransformerSentiment, cutoff_dt: datetime, date_source: str):
    inserted = 0
    updated = 0
    skipped = 0

    for e in entries:
        title = e.get("title", "") or ""
        url = e.get("url") or ""
        published_raw = e.get("published")
        published_dt = parse_published_date(published_raw)

        # if no published date from feed/API, try page meta extraction
        used_date_source = date_source
        if not published_dt and url:
            published_dt = extract_published_from_page(url)
            if published_dt:
                used_date_source = "page_meta"

        # fallback: if still no date, use scraped_at as last resort but mark date_source
        if not published_dt:
            # we choose to skip entries without any date to reliably enforce last-30-days rule
            logging.debug("Skipping (no published date) %s", title)
            skipped += 1
            continue

        # enforce date cutoff
        if published_dt < cutoff_dt:
            logging.debug("Skipping (older than cutoff) %s -> %s", title, published_dt.isoformat())
            skipped += 1
            continue

        # summary (page fetch)
        summary = fetch_page_summary(url) or (e.get("raw", {}).get("description") if isinstance(e.get("raw", {}), dict) else "") or ""

        # coin detection
        coin = detect_target_coin(title, summary)
        if not coin:
            logging.debug("Skipping (not target coin) %s", title)
            skipped += 1
            continue

        # sentiment - use transformer
        full_text = f"{title}\n\n{summary}"
        sentiment = analyzer.analyze(full_text)

        # extract domain as source
        source = ""
        try:
            source = urlparse(url).netloc or e.get("source_name") or ""
        except Exception:
            source = e.get("source_name") or ""

        doc = {
            "title": title,
            "url": url,
            "source": source,
            "published_at": published_dt.isoformat(),
            "scraped_at": datetime.utcnow().replace(tzinfo=tzutc()).isoformat(),
            "summary": summary,
            "sentiment": sentiment,
            "coin": coin,
            "date_source": used_date_source,
        }

        if not url:
            logging.debug("Skipping entry without URL: %s", title)
            skipped += 1
            continue

        try:
            res = coll.update_one(
                {"url": url},
                {"$set": doc, "$setOnInsert": {"first_seen": datetime.utcnow().replace(tzinfo=tzutc()).isoformat()}},
                upsert=True,
            )
            if res.upserted_id:
                inserted += 1
            else:
                updated += 1
        except Exception as exc:
            logging.exception("Failed to upsert url %s: %s", url, exc)
            skipped += 1

    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def run_once(coll, analyzer: TransformerSentiment):
    """
    Single scrape cycle: RSS + NewsAPI for last DAYS_BACK days.
    Logic is identical to the original main(), just moved here so we can call it repeatedly.
    """
    cutoff_dt = datetime.utcnow().replace(tzinfo=tzutc()) - timedelta(days=DAYS_BACK)
    logging.info("Cutoff datetime (UTC): %s", cutoff_dt.isoformat())

    total_inserted = 0
    total_updated = 0
    total_skipped = 0

    # 1) RSS feeds (fresh)
    for feed in RSS_FEEDS:
        try:
            entries = fetch_rss(feed)
            if not entries:
                logging.info("No entries for feed: %s", feed)
                continue
            logging.info("Found %d entries in %s", len(entries), feed)
            stats = process_feed_entries(entries, coll, analyzer, cutoff_dt, date_source="rss")
            logging.info("Feed stats: %s", stats)
            total_inserted += stats["inserted"]
            total_updated += stats["updated"]
            total_skipped += stats["skipped"]
            time.sleep(1)
        except Exception:
            logging.exception("Processing feed failed: %s", feed)

    # 2) NewsAPI backfill/search for each target coin (ensures better 30-day coverage)
    try:
        for coin, keywords in TARGET_COINS.items():
            entries = fetch_newsapi_for_coin(coin, keywords, cutoff_dt)
            if not entries:
                logging.info("No NewsAPI entries for %s", coin)
                continue
            logging.info("Processing %d NewsAPI entries for %s", len(entries), coin)
            stats = process_feed_entries(entries, coll, analyzer, cutoff_dt, date_source="newsapi")
            logging.info("NewsAPI stats for %s: %s", coin, stats)
            total_inserted += stats["inserted"]
            total_updated += stats["updated"]
            total_skipped += stats["skipped"]
            # be polite to API / avoid bursts
            time.sleep(1)
    except Exception:
        logging.exception("NewsAPI backfill failed")

    logging.info(
        "Cycle done. total_inserted=%d total_updated=%d total_skipped=%d",
        total_inserted,
        total_updated,
        total_skipped,
    )


def main():
    coll = get_db_collection()
    analyzer = TransformerSentiment(model_name=MODEL_NAME, device=DEVICE)

    logging.info(
        "Starting real-time scraper with interval %d seconds (~%.2f minutes)",
        POLL_INTERVAL_SECONDS,
        POLL_INTERVAL_SECONDS / 60.0,
    )

    while True:
        cycle_start = datetime.utcnow().replace(tzinfo=tzutc())
        logging.info("=== Scrape cycle started at %s ===", cycle_start.isoformat())
        try:
            run_once(coll, analyzer)
        except Exception:
            logging.exception("Unexpected error during scrape cycle")
        logging.info("Sleeping for %d seconds before next cycle", POLL_INTERVAL_SECONDS)
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()