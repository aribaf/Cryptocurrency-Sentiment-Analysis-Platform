import logging, time
from playwright.sync_api import sync_playwright
from transformers import pipeline
from pymongo import MongoClient
import os

# ---------------- DATABASE CONNECTION ----------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets")

client = MongoClient(MONGO_URI)
db = client["crypto_news_db"]           # ✅ database name
news_collection = db["latest_news"]     # ✅ collection name

# ---------------- SETUP ----------------
logging.basicConfig(level=logging.INFO)

# FinBERT Sentiment Pipeline (finance-specific)
logging.info("Loading FinBERT model...")
sentiment_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
logging.info("FinBERT model loaded successfully.")

# ---------------- KEYWORDS ----------------
CRYPTO_KEYWORDS = [
    "crypto", "cryptocurrency", "bitcoin", "btc", "ethereum", "eth",
    "blockchain", "defi", "altcoin", "altcoins", "token", "tokens",
    "nft", "nfts", "stablecoin", "stablecoins", "web3", "ico", "ido",
    "dao", "dapp", "smart contract", "layer 2", "layer2", "staking",
    "mining", "hashrate", "wallet", "exchange", "binance", "coinbase",
    "ripple", "xrp", "solana", "dogecoin", "doge", "litecoin", "ltc",
    "cardano", "ada", "polkadot", "dot", "shiba", "shib", "tron", "trx"
]

COIN_MAP = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth"],
    "DOGE": ["dogecoin", "doge"],
    "ADA": ["cardano", "ada"],
    "SOL": ["solana", "sol"],
    "XRP": ["ripple", "xrp"],
  
}

# ---------------- HELPERS ----------------
def is_crypto_related(title: str) -> bool:
    if not title:
        return False
    title_lower = title.lower()
    return any(keyword in title_lower for keyword in CRYPTO_KEYWORDS)

def detect_coins(title: str):
    title_lower = title.lower()
    tags = []
    for coin, keywords in COIN_MAP.items():
        if any(k in title_lower for k in keywords):
            tags.append(coin)
    return tags or ["GENERIC"]

def analyze_sentiment(text: str):
    try:
        result = sentiment_pipeline(text[:512])[0]  # truncate long text
        return {
            "label": result["label"].lower(),
            "score": round(result["score"], 3)
        }
    except Exception as e:
        logging.warning(f"Sentiment failed for '{text[:50]}...': {e}")
        return {"label": "neutral", "score": 0.0}

# ---------------- MAIN SCRAPER ----------------
def scrape_news(news_sites=None):
    logging.info("Starting news scraping pipeline...")
    saved = 0

    default_sites = [
        {"name": "coindesk", "url": "https://www.coindesk.com/"},
        {"name": "cointelegraph", "url": "https://cointelegraph.com/"},
        {"name": "fxstreet", "url": "https://www.fxstreet.com/news"},
        {"name": "dailyfx", "url": "https://www.dailyfx.com/"}
    ]
    sites = news_sites or default_sites

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for site in sites:
            try:
                logging.info("Scraping %s...", site["name"])
                # In news.py, increase the timeout parameter:
                page.goto(site["url"], timeout=30000)  # Changed from 15000 to 30000ms (30 seconds)
                page.wait_for_load_state("networkidle", timeout=30000) # Changed from 15000 to 30000ms

                links = page.query_selector_all("a")
                for a in links:
                    try:
                        href = a.get_attribute("href")
                        text = a.inner_text().strip()
                        if href and text and len(text) > 10 and ("https" in href or href.startswith("/")):
                            if not href.startswith("http"):
                                href = site["url"].rstrip("/") + href

                            if is_crypto_related(text):
                                sentiment = analyze_sentiment(text)
                                coins = detect_coins(text)

                                doc = {
                                    "title": text,
                                    "url": href,
                                    "source": site["name"],
                                    "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                    "sentiment": sentiment,
                                    "coin_tags": coins
                                }

                                news_collection.update_one({"url": doc["url"]}, {"$set": doc}, upsert=True)
                                saved += 1
                                logging.info(f"✅ Saved: {text} | {sentiment['label']} | {coins}")

                    except Exception as inner_err:
                        logging.warning("Inner error: %s", inner_err)

            except Exception as e:
                logging.warning("Error scraping %s: %s", site["name"], e)

        browser.close()

    logging.info("Finished news scraping. Total saved: %d", saved)
    return saved

# ---------------- RUN ----------------
if __name__ == "__main__":
    scrape_news()
