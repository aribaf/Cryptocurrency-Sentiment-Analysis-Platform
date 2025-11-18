import sys
import time
import random
import logging
import json
import traceback
import re
from datetime import datetime
from pymongo import MongoClient, UpdateOne
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# --- 1. Global Configuration ---
# !!! IMPORTANT: Replace with your actual MongoDB URI !!!
MONGO_CONNECTION_STRING = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME = "latest_tweets"
AGGREGATED_COLLECTION = "sentiment_trends_agg"
TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"]
FINBERT_MODEL = "ProsusAI/finbert"
TIMEZONE = "Asia/Karachi"

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 2. CoinTweetScraper Class (Data Acquisition) ---

class CoinTweetScraper:
    def __init__(self, mongo_uri, db_name=DB_NAME, collection_name=COLLECTION_NAME, headless=True):
        """
        Initialize scraper and MongoDB connection.
        """
        # --- Scheduling and Delay Configuration ---
        # Note: The scheduling is now managed by the main loop, but these delays are used in the scrape function.
        self.SCROLL_DELAY_MIN = 6.0
        self.SCROLL_DELAY_MAX = 10.0
        self.PAGE_LOAD_DELAY = 7.0
        
        # --- Nitter Configuration ---
        self.TARGET_HASHTAGS = TARGET_HASHTAGS
        self.nitter_instances = [
            "https://nitter.net",
            "https://twitt.re",
            "https://nitter.privacydev.net",
            "https://nitter.poast.org",
            "https://nitter.kavin.rocks",
            "https://xcancel.com"
        ]
        self.current_instance = None
        self.tweet_selector = '.main-tweet'
        
        # --- MongoDB Setup ---
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client[db_name]
        self.collection = self.db[collection_name]
        self.collection.create_index("tweet_id", unique=True)
        logger.info(f"🗄️ Scraper MongoDB setup complete. Target collection: '{collection_name}'")
        
        # --- Selenium Setup ---
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
        self.driver = webdriver.Chrome(options=chrome_options)

    # --- Nitter Instance Handling ---
    def try_nitter_instance(self, instance_url, hashtag, language='en'):
        # ... (try_nitter_instance logic remains the same)
        search_url = f"{instance_url}/search?f=tweets&q=%23{hashtag}&l={language}"
        try:
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
        except (NoSuchElementException, TimeoutException, ValueError, Exception):
            return False

    def find_working_instance(self, hashtag, language='en'):
        logger.info(f"Finding a working Nitter instance for #{hashtag}...")
        for instance in random.sample(self.nitter_instances, len(self.nitter_instances)):
            if self.try_nitter_instance(instance, hashtag, language):
                logger.info(f"✓ Using {self.current_instance}")
                return True
            time.sleep(1)
        logger.warning("❌ Could not find a working Nitter instance.")
        return False

    # --- Scroll Logic ---
    def scroll_and_collect(self, max_scrolls=20): # reduced default scrolls for efficiency in a tight loop
        # ... (scroll_and_collect logic remains the same)
        tweets_collected = []
        seen_urls = set()
        no_new_content_count = 0
        
        for scroll in range(max_scrolls):
            tweet_elements = self.driver.find_elements(By.CSS_SELECTOR, self.tweet_selector)
            previous_count = len(tweets_collected)
            for tweet_elem in tweet_elements:
                try:
                    link_elem = tweet_elem.find_element(By.CSS_SELECTOR, '.tweet-date a')
                    tweet_url = link_elem.get_attribute('href')
                    if tweet_url not in seen_urls:
                        seen_urls.add(tweet_url)
                        tweets_collected.append(tweet_elem)
                except NoSuchElementException:
                    continue
            new_tweets = len(tweets_collected) - previous_count
            if new_tweets == 0:
                no_new_content_count += 1
                if no_new_content_count >= 10:
                    break
            else:
                no_new_content_count = 0
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            delay = self.SCROLL_DELAY_MIN + random.uniform(0, self.SCROLL_DELAY_MAX - self.SCROLL_DELAY_MIN)
            time.sleep(delay)
        return tweets_collected

    # --- Enhanced Spam and Language Filter ---
    def is_irrelevant_spam(self, text):
        # ... (is_irrelevant_spam logic remains the same)
        spam_keywords = [
            "giveaway", "retweet", "follow", "airdrop", "win", "winner", "claim", "join",
            "competition", "whitelist", "launching", "listing", "ido", "presale", "ama",
            "reward", "bonus", "contest", "nft", "drop", "exclusive", "don't miss", "free",
            "$", "🚀", "moon", "pump", "soon", "hodl", "telegram", "discord", "air drop"
        ]
        text_lower = text.lower()
        
        # Heuristic language detection (non-English filter)
        non_english_chars = len(re.findall(r"[^a-zA-Z0-9\s.,!?$]", text_lower))
        if len(text_lower) > 0 and (non_english_chars / len(text_lower)) > 0.3:
            return True

        for keyword in spam_keywords:
            if keyword in text_lower:
                return True
        return False

    # --- Data Extraction Helpers ---
    def _check_verified(self, header_element):
        try:
            header_element.find_element(By.CSS_SELECTOR, '.icon-verified')
            return True
        except NoSuchElementException:
            return False

    def _extract_stat(self, stats_elem, icon_class):
        try:
            stat_text_element = stats_elem.find_element(By.CSS_SELECTOR, f'.{icon_class}').find_element(By.XPATH, './following-sibling::span[1]')
            stat_text = stat_text_element.text.strip().replace(',', '')
            if 'K' in stat_text:
                return int(float(stat_text.replace('K', '')) * 1000)
            elif 'M' in stat_text:
                return int(float(stat_text.replace('M', '')) * 1000000)
            elif stat_text.isdigit():
                return int(stat_text)
            else:
                return 0
        except:
            return 0
            
    # --- Data Extraction ---
    def extract_tweet_data(self, tweet_element, hashtag):
        # ... (extract_tweet_data logic remains the same)
        data = {}
        coin_map = {"BTC": "Bitcoin", "ETH": "Ethereum", "SOLANA": "Solana"}
        try:
            text_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-content')
            data['text'] = text_elem.text.strip()
            if not data['text']: return None
            if self.is_irrelevant_spam(data['text']): return None

            link_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-date a')
            tweet_url_nitter = link_elem.get_attribute('href')
            data['tweet_id'] = tweet_url_nitter.split('/')[-1]
            data['url'] = tweet_url_nitter.replace(self.current_instance, 'https://twitter.com')
            data['created_at'] = link_elem.get_attribute('title')

            header_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-header')
            data['username'] = header_elem.find_element(By.CSS_SELECTOR, '.username').text.replace('@', '').strip()
            bot_patterns = ["bot", "giveaway", "airdrop", "promo", "nft", "token", "crypto_", "_eth", "_btc", "_sol"]
            if any(bp in data['username'].lower() for bp in bot_patterns): return None

            data['verified'] = self._check_verified(header_elem)
            stats_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-stats')
            data['replies'] = self._extract_stat(stats_elem, 'icon-comment')
            data['retweets'] = self._extract_stat(stats_elem, 'icon-retweet')
            data['likes'] = self._extract_stat(stats_elem, 'icon-heart')

            data['hashtag'] = hashtag
            data['coin'] = coin_map.get(hashtag, 'Unknown')
            data['scraped_at'] = datetime.now().isoformat()
            return data
        except (NoSuchElementException, Exception):
            return None

    # --- MongoDB Saving ---
    def save_to_mongodb(self, tweets_list):
        # ... (save_to_mongodb logic remains the same)
        if not tweets_list:
            logger.warning("⚠️ No tweets to save to MongoDB.")
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
                logger.error(f"Database error on tweet {tweet['tweet_id']}: {e}")
        logger.info(f"🗄️ Scraper MongoDB: {inserted} new tweets inserted, {modified} tweets updated.")
        return inserted

    # --- Main Scrape Function ---
    def scrape_hashtag(self, hashtag, max_tweets=100, language='en'):
        logger.info(f"\n{'='*60}\n⚙️ Running Scrape for #{hashtag}\n{'='*60}")
        if not self.find_working_instance(hashtag, language):
            return 0
        tweet_elements = self.scroll_and_collect(max_scrolls=20)
        tweets_list = []
        for tweet_elem in tweet_elements:
            if len(tweets_list) >= max_tweets: break
            tweet_data = self.extract_tweet_data(tweet_elem, hashtag)
            if tweet_data:
                tweets_list.append(tweet_data)
        inserted_count = self.save_to_mongodb(tweets_list)
        return inserted_count

    def close(self):
        try:
            self.driver.quit()
            self.mongo_client.close()
            logger.info("👋 Scraper closed all connections.")
        except Exception:
            pass

# --- 3. SentimentAnalyzer Class (Data Processing) ---

class SentimentAnalyzer:
    def __init__(self, mongo_uri=MONGO_CONNECTION_STRING, db_name=DB_NAME, collection_name=COLLECTION_NAME):
        self.BATCH_SIZE = 256
        
        # 1. MongoDB Connection
        try:
            self.client = MongoClient(mongo_uri)
            self.db = self.client[db_name]
            self.collection = self.db[collection_name]
            self.client.admin.command('ping')
            logger.info("🗄️ Analyzer connected to MongoDB.")
        except Exception as e:
            logger.error(f"❌ Error connecting to MongoDB: {e}")
            sys.exit(1)

        # 2. Load FinBERT Model
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
            self.model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            logger.info(f"🧠 FinBERT Model loaded on device: {self.device}")
        except Exception as e:
            logger.error(f"❌ Error loading FinBERT model: {e}")
            sys.exit(1)

        self.sentiment_labels = {0: 'Negative', 1: 'Neutral', 2: 'Positive'}

    def get_unscored_tweets(self, batch_size: int):
        query = {"sentiment": {"$exists": False}}
        tweets_cursor = self.collection.find(query).sort("scraped_at", 1).limit(batch_size)
        return list(tweets_cursor)

    def analyze_batch(self, tweets: list):
        texts = [tweet.get('text', '') for tweet in tweets if tweet.get('text')]
        if not texts: return []
        
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        probabilities = torch.softmax(outputs.logits, dim=1)
        results = []

        for i, probs in enumerate(probabilities):
            score_dict = {
                'negative': probs[0].item(),
                'neutral': probs[1].item(),
                'positive': probs[2].item(),
            }
            predicted_class = torch.argmax(probs).item()

            results.append({
                'tweet_id': tweets[i]['tweet_id'],
                'sentiment': {
                    'label': self.sentiment_labels[predicted_class],
                    'scores': score_dict,
                    'model': FINBERT_MODEL,
                    'analyzed_at': datetime.now().isoformat()
                }
            })
        return results

    def update_mongodb(self, results: list):
        updated_count = 0
        updates = [
            UpdateOne(
                {'tweet_id': result['tweet_id']}, 
                {'$set': {'sentiment': result['sentiment']}} 
            ) for result in results
        ]
        
        if updates:
            try:
                update_result = self.collection.bulk_write(updates)
                updated_count = update_result.modified_count
            except Exception as e:
                logger.error(f"Bulk write error: {e}")
        return updated_count

    def run_analysis_cycle(self):
        """Runs a single cycle of the sentiment analysis process."""
        logger.info(f"--- Starting Analysis Cycle (Batch Size: {self.BATCH_SIZE}) ---")
        
        tweets_to_analyze = self.get_unscored_tweets(self.BATCH_SIZE)
        num_fetched = len(tweets_to_analyze)
        logger.info(f"🔍 Found {num_fetched} unscored tweets.")
        
        if num_fetched == 0:
            return 0
        
        analysis_results = self.analyze_batch(tweets_to_analyze)
        updated = self.update_mongodb(analysis_results)
        
        logger.info(f"✅ Successfully analyzed and updated {updated} tweets.")
        return updated
    
    def close(self):
        self.client.close()
        logger.info("👋 Analyzer closed MongoDB connection.")

# --- 4. SentimentAggregator Class (Data Summarization) ---

class SentimentAggregator:
    def __init__(self, mongo_uri=MONGO_CONNECTION_STRING, db_name=DB_NAME):
        try:
            self.client = MongoClient(mongo_uri)
            self.db = self.client[db_name]
            self.collection = self.db[COLLECTION_NAME]
            self.agg_collection = self.db[AGGREGATED_COLLECTION]
            self.client.admin.command("ping")
            logger.info("🗄️ Aggregator connected to MongoDB.")
            self.ensure_unique_index()
        except Exception as e:
            logger.error(f"❌ Error connecting to MongoDB: {e}")
            sys.exit(1)

    def ensure_unique_index(self):
        try:
            self.agg_collection.create_index(
                [("coin", 1), ("unit", 1), ("time_bucket", 1)],
                unique=True,
                name="unique_trend_key"
            )
            logger.info(f"📄 Ensured unique index on {AGGREGATED_COLLECTION}.")
        except Exception as e:
            logger.warning(f"⚠️ Warning: Could not ensure unique index. Error: {e}")

    def get_time_series_sentiment(self, coin: str, unit: str, output_to_mongo=False):
        """Calculates mean sentiment for a specific coin and stores in MongoDB."""

        coin_mapping = {
            "BTC": ["BTC", "Bitcoin"],
            "ETH": ["ETH", "Ethereum"],
            "SOLANA": ["SOLANA", "SOL", "Solana"]
        }

        pipeline = [
            {"$match": {
                "$or": [
                    {"hashtag": {"$in": coin_mapping.get(coin, [coin])}},
                    {"coin": {"$in": coin_mapping.get(coin, [coin])}}
                ],
                "sentiment.scores": {"$exists": True}
            }},
            {"$group": {
                "_id": {
                    "time_bucket": {
                        "$dateTrunc": {
                            "date": {"$dateFromString": {"dateString": "$scraped_at"}},
                            "unit": unit,
                            "timezone": TIMEZONE
                        }
                    }
                },
                "avg_positive": {"$avg": "$sentiment.scores.positive"},
                "avg_negative": {"$avg": "$sentiment.scores.negative"},
                "total_count": {"$sum": 1}
            }},
            {"$project": {
                "coin": coin,
                "time_bucket": "$_id.time_bucket",
                "mean_sentiment_score": {"$subtract": ["$avg_positive", "$avg_negative"]},
                "tweet_count": "$total_count",
                "unit": unit,
                "_id": 0
            }},
            {"$sort": {"time_bucket": 1}}
        ]

        if output_to_mongo:
            pipeline.append({
                "$merge": {
                    "into": AGGREGATED_COLLECTION,
                    "on": ["coin", "unit", "time_bucket"],
                    "whenMatched": "replace",
                    "whenNotMatched": "insert"
                }
            })
            self.collection.aggregate(pipeline)
            return 
        else:
            return list(self.collection.aggregate(pipeline))

    def run_aggregation(self):
        """Runs aggregation for all coins and time units."""
        logger.info("\n" + "=" * 70)
        logger.info("📊 GENERATING CRYPTO SENTIMENT TRENDS")
        logger.info("=" * 70)

        results = {}
        time_units = ["hour", "day", "week"]

        logger.info("\n🚀 Phase 1: Storing Aggregated Trends in MongoDB...")
        total_merged = 0
        for coin in TARGET_HASHTAGS:
            for unit in time_units:
                self.get_time_series_sentiment(coin, unit, output_to_mongo=True)
                total_merged += 1
        logger.info(f"✅ Completed merging {total_merged} trends into '{AGGREGATED_COLLECTION}'.")

        logger.info("\n💻 Phase 2: Retrieving Latest Trends for Display...")
        
        # This part ensures the trend data is calculated and saved before being read back.
        # It also saves a JSON file for easy external access.
        for coin in TARGET_HASHTAGS:
            results[coin] = {}
            logger.info(f"\n--- Coin: #{coin} ---")

            for unit in time_units:
                query = {"coin": coin, "unit": unit}
                data = list(self.agg_collection.find(query).sort("time_bucket", 1))
                results[coin][unit] = data

                latest = self.agg_collection.find(query).sort("time_bucket", -1).limit(1)
                try:
                    latest_doc = next(latest)
                    score = latest_doc["mean_sentiment_score"]
                    mood = "BULLISH 🟢" if score > 0.05 else ("BEARISH 🔴" if score < -0.05 else "NEUTRAL 🟡")
                    logger.info(f"  {unit.capitalize()} Trend (Latest Score): {score:.4f} ({mood})")
                    logger.info(f"  Total {unit} data points found: {len(data)}")
                except StopIteration:
                    logger.info(f"  {unit.capitalize()} Trend: No data available.")

        with open("sentiment_trends.json", "w") as f:
            json.dump(results, f, indent=4, default=str)
        logger.info("\n💾 Saved all trends to sentiment_trends.json")

    def close(self):
        self.client.close()
        logger.info("👋 Aggregator closed MongoDB connection.")

# --- 5. Main Execution Loop ---

def run_full_pipeline(max_tweets_per_tag=300, main_interval_minutes=30, headless=True):
    """
    Coordinates the Scraper, Analyzer, and Aggregator in a continuous loop.
    """
    scraper = None
    analyzer = None
    aggregator = None

    try:
        # Initialize Components
        logger.info("🚀 Initializing all pipeline components...")
        scraper = CoinTweetScraper(mongo_uri=MONGO_CONNECTION_STRING, headless=headless)
        analyzer = SentimentAnalyzer(mongo_uri=MONGO_CONNECTION_STRING)
        aggregator = SentimentAggregator(mongo_uri=MONGO_CONNECTION_STRING)

        main_interval_seconds = main_interval_minutes * 60
        
        logger.info("\n" + "#" * 70)
        logger.info(f"🟢 STARTING FULL CRYPTO SENTIMENT PIPELINE (Interval: {main_interval_minutes} min)")
        logger.info("#" * 70)

        while True:
            cycle_start_time = time.time()
            total_inserted_tweets = 0
            
            # 1. --- SCRAPE PHASE ---
            logger.info("\n--- PHASE 1: SCRAPING NEW TWEETS ---")
            for hashtag in TARGET_HASHTAGS:
                inserted = scraper.scrape_hashtag(
                    hashtag=hashtag,
                    max_tweets=max_tweets_per_tag,
                    language='en'
                )
                total_inserted_tweets += inserted

            # 2. --- ANALYZE PHASE ---
            logger.info("\n--- PHASE 2: SENTIMENT ANALYSIS (FinBERT) ---")
            total_analyzed = 0
            if total_inserted_tweets > 0:
                # Run analysis in batches until no new unscored tweets are found
                while True:
                    updated_count = analyzer.run_analysis_cycle()
                    total_analyzed += updated_count
                    if updated_count == 0: 
                        break
                    # Short pause between analysis batches to manage resource usage
                    time.sleep(5) 
                logger.info(f"🎉 Total tweets analyzed in this cycle: {total_analyzed}")
            else:
                logger.info("Skipping analysis: No new tweets were inserted.")

            # 3. --- AGGREGATE PHASE ---
            logger.info("\n--- PHASE 3: TREND AGGREGATION ---")
            aggregator.run_aggregation()
            
            # --- WAIT FOR NEXT CYCLE ---
            cycle_end_time = time.time()
            duration = cycle_end_time - cycle_start_time
            wait_time = main_interval_seconds - duration
            
            logger.info("\n" + "-"*70)
            logger.info(f"--- FULL CYCLE SUMMARY ---")
            logger.info(f"Duration: {duration:.2f} seconds.")
            logger.info(f"New Tweets Scraped/Updated: {total_inserted_tweets}")
            logger.info(f"Tweets Analyzed: {total_analyzed}")
            logger.info("-" * 70)

            if wait_time > 0:
                logger.info(f"😴 Waiting for {wait_time/60:.2f} minutes until next run...")
                time.sleep(wait_time)
            else:
                logger.warning("Warning: Scrape duration exceeded the interval! Running next cycle immediately.")

    except KeyboardInterrupt:
        logger.info("\n\n🛑 Pipeline stopped by user (Ctrl+C).")
    except Exception as e:
        logger.critical(f"\n❌ A critical error occurred in the pipeline: {e}", exc_info=True)
    finally:
        # Clean up resources
        if scraper: scraper.close()
        if analyzer: analyzer.close()
        if aggregator: aggregator.close()
        logger.info("👋 All connections closed. Exiting.")


if __name__ == "__main__":
    # --- Execution Start ---
    run_full_pipeline(
        max_tweets_per_tag=300,      # Max tweets to scrape per hashtag per cycle
        main_interval_minutes=30,    # How often the entire cycle runs (Scrape -> Analyze -> Aggregate)
        headless=False               # Set to True for silent background run (requires graphical dependencies for Chrome)
    )