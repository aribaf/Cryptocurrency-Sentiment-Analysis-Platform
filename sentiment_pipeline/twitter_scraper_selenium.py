from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from pymongo import MongoClient
from datetime import datetime
import time
import random
import traceback

class CoinTweetScraper:
    def __init__(self, mongo_uri, db_name="crypto_tweets_db", collection_name="latest_tweets", headless=True):
        """
        Initialize scraper and MongoDB connection.
        """
        # --- Scheduling and Delay Configuration ---
        self.SCRAPE_INTERVAL_MINUTES = 35
        self.SCROLL_DELAY_MIN = 3.0
        self.SCROLL_DELAY_MAX = 5.0
        self.PAGE_LOAD_DELAY = 6.0
        self.TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"] # Multiple hashtags to scrape
        
        # --- Nitter Configuration (CHECK THIS LIST FREQUENTLY) ---
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
        
        # Create a UNIQUE index on 'tweet_id' to prevent duplicates during multiple runs
        self.collection.create_index("tweet_id", unique=True)
        print(f"🗄️ MongoDB setup complete. Target collection: '{collection_name}'")
        
        # --- Selenium Setup ---
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless=new")
        
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
        
        self.driver = webdriver.Chrome(options=chrome_options)

    # --- Nitter Instance and Scrolling Logic (Same as previous script, but improved delays) ---
        
    def try_nitter_instance(self, instance_url, hashtag, language='en'):
        """Tries to connect to a Nitter instance with the given hashtag and language filter."""
        search_url = f"{instance_url}/search?f=tweets&q=%23{hashtag}&l={language}"
        
        try:
            self.driver.get(search_url)
            time.sleep(self.PAGE_LOAD_DELAY)
            
            # Selector Fallback Logic
            tweets = self.driver.find_elements(By.CSS_SELECTOR, '.main-tweet')
            if not tweets:
                tweets = self.driver.find_elements(By.CSS_SELECTOR, '.timeline-item')
                if len(tweets) > 0:
                    self.tweet_selector = '.timeline-item'
                else:
                    raise ValueError("No tweets found with current selectors.")
            else:
                self.tweet_selector = '.main-tweet'
            
            self.current_instance = instance_url
            return True
                
        except (NoSuchElementException, TimeoutException, ValueError):
            return False
        except Exception:
            return False
    
    def find_working_instance(self, hashtag, language='en'):
        """Iterates through instances until one works."""
        print("Finding a working Nitter instance...")
        for instance in self.nitter_instances:
            if self.try_nitter_instance(instance, hashtag, language):
                print(f"✓ Using {self.current_instance}")
                return True
            time.sleep(1)
        
        print("❌ Could not find a working Nitter instance.")
        return False
    
    def scroll_and_collect(self, max_scrolls=15):
        """Scrolls and collects unique tweet elements."""
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
                if no_new_content_count >= 5:
                    break
            else:
                no_new_content_count = 0
            
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            delay = self.SCROLL_DELAY_MIN + random.uniform(0, self.SCROLL_DELAY_MAX - self.SCROLL_DELAY_MIN)
            time.sleep(delay)

        return tweets_collected

    # --- NEW METHOD: Spam Filtering (CORRECTLY INDENTED) ---
    def is_irrelevant_spam(self, text):
        """Checks if the tweet text contains common promotional spam keywords."""
        
        spam_keywords = [
            "launching", "listing", "ido", "airdrop", "presale", "ama", 
            "giving away", "soon", "today at", "don't miss", "whitelist",
            "$LEAF", "$BEAST", # Add known minor/spam tokens here
        ]
        
        # Normalize text for simple matching
        text_lower = text.lower()
        
        for keyword in spam_keywords:
            if keyword in text_lower:
                return True
                
        return False
    # --------------------------------------------------------

    # --- Data Extraction (Includes all requested fields) ---

    def extract_tweet_data(self, tweet_element, hashtag):
        """Extracts data into the required structured format."""
        data = {}
        coin_map = {"BTC": "Bitcoin", "ETH": "Ethereum", "SOLANA": "Solana"}
        
        try:
            # 1. Tweet Text
            text_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-content')
            data['text'] = text_elem.text.strip()
            if not data['text']: return None

            # NEW FILTER STEP: Add an irrelevance flag (CORRECTLY PLACED)
            if self.is_irrelevant_spam(data['text']):
                data['is_irrelevant'] = True
            else:
                data['is_irrelevant'] = False

            # 2. ID, URL, and Timestamp
            link_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-date a') 
            tweet_url_nitter = link_elem.get_attribute('href')
            
            data['tweet_id'] = tweet_url_nitter.split('/')[-1]
            data['url'] = tweet_url_nitter.replace(self.current_instance, 'https://twitter.com')
            data['created_at'] = link_elem.get_attribute('title') 
            
            # 3. User Info
            header_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-header')
            data['username'] = header_elem.find_element(By.CSS_SELECTOR, '.username').text.replace('@', '').strip()
            
            # 4. Verified Status
            data['verified'] = self._check_verified(header_elem)

            # 5. Engagement Metrics
            stats_elem = tweet_element.find_element(By.CSS_SELECTOR, '.tweet-stats')
            data['replies'] = self._extract_stat(stats_elem, 'icon-comment')
            data['retweets'] = self._extract_stat(stats_elem, 'icon-retweet')
            data['likes'] = self._extract_stat(stats_elem, 'icon-heart')
            
            # 6. Hardcoded/Metadata Fields
            data['hashtag'] = hashtag
            data['coin'] = coin_map.get(hashtag, 'Unknown')
            data['scraped_at'] = datetime.now().isoformat()
            
            return data
            
        except NoSuchElementException:
            return None
        except Exception:
            return None
            
    def _check_verified(self, header_element):
        """Checks for the presence of the verified checkmark icon."""
        try:
            header_element.find_element(By.CSS_SELECTOR, '.icon-verified')
            return True
        except NoSuchElementException:
            return False
        
    def _extract_stat(self, stats_elem, icon_class):
        """Helper to extract numerical stats, handling K/M suffixes."""
        try:
            # Use XPath to find the span following the icon element
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
    
    # --- MongoDB Saving Logic ---

    def save_to_mongodb(self, tweets_list):
        """
        Saves tweets to MongoDB using update_one() with upsert=True to prevent duplicates.
        """
        if not tweets_list:
            print("⚠️ No tweets to save to MongoDB.")
            return 0
        
        inserted = 0
        modified = 0
        
        for tweet in tweets_list:
            # Filter based on the unique key
            filter_query = {'tweet_id': tweet['tweet_id']}
            
            # Update data: $set operator ensures only new data is added or fields are updated
            update_data = {'$set': tweet} 
            
            # upsert=True: if tweet_id exists, update. If not, insert as a new document.
            try:
                result = self.collection.update_one(filter_query, update_data, upsert=True)
                
                if result.upserted_id:
                    inserted += 1
                elif result.modified_count > 0:
                    modified += 1
                    
            except Exception as e:
                # Handle potential (though rare with upsert) unique key errors
                print(f"Database error on tweet {tweet['tweet_id']}: {e}")
                
        print(f"🗄️ MongoDB: {inserted} new tweets inserted, {modified} tweets updated.")
        return inserted
    
    # --- Main Scrape/Run Logic ---

    def scrape_hashtag(self, hashtag, max_tweets=50, language='en'):
        """Performs scraping for a single hashtag."""
        print(f"\n{'='*60}\n⚙️ Running Scrape for #{hashtag}\n{'='*60}")
        
        if not self.find_working_instance(hashtag, language):
            return 0
        
        tweet_elements = self.scroll_and_collect(max_scrolls=20)
        
        tweets_list = []
        for tweet_elem in tweet_elements:
            if len(tweets_list) >= max_tweets:
                break
            
            tweet_data = self.extract_tweet_data(tweet_elem, hashtag)
            
            if tweet_data:
                tweets_list.append(tweet_data)

        # Save all unique tweets for this hashtag
        inserted_count = self.save_to_mongodb(tweets_list)
        return inserted_count
        
    def run_scheduled_scraper(self, max_tweets_per_tag=50, language='en'):
        """Runs the scraper for all hashtags in a continuous loop."""
        print("\n" + "="*60)
        print(f"🟢 STARTING SCHEDULED SCRAPER (Interval: {self.SCRAPE_INTERVAL_MINUTES} min)")
        print("="*60)
        
        while True:
            start_time = time.time()
            total_inserted = 0
            
            # --- Scrape all hashtags ---
            for hashtag in self.TARGET_HASHTAGS:
                inserted = self.scrape_hashtag(
                    hashtag=hashtag,
                    max_tweets=max_tweets_per_tag,
                    language=language
                )
                total_inserted += inserted
                
            end_time = time.time()
            duration = end_time - start_time
            wait_time = (self.SCRAPE_INTERVAL_MINUTES * 60) - duration
            
            print(f"\n--- Cycle Complete ---")
            print(f"Total inserted in this cycle: {total_inserted}")
            print(f"Duration: {duration:.2f} seconds.")

            # --- Wait for the next cycle ---
            if wait_time > 0:
                print(f"Waiting for {wait_time/60:.2f} minutes until next run...")
                time.sleep(wait_time)
            else:
                print("Warning: Scrape duration exceeded the interval! Running next cycle immediately.")
    
    def close(self):
        """Close connections."""
        try:
            self.driver.quit()
            self.mongo_client.close()
            print("\n👋 Closed all connections.")
        except Exception:
            pass

# ==============================================================================
# Execution Block
# ==============================================================================

if __name__ == "__main__":
    # !!! REPLACE THIS WITH YOUR ACTUAL MONGODB CONNECTION STRING !!!
    MONGO_CONNECTION_STRING = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
    
    # Ensure you have the 'pymongo' library installed before running
    # Note: If running this in an environment without a display (like a server), 
    # remember to set 'headless=True'
    scraper = CoinTweetScraper(
        mongo_uri=MONGO_CONNECTION_STRING,
        headless=False # Set to True to run silently in the background
    )
    
    try:
        # Start the continuous loop
        scraper.run_scheduled_scraper(
            max_tweets_per_tag=100, # Max tweets to attempt to fetch per hashtag per run
            language='en' 
        )
        
    except KeyboardInterrupt:
        print("\n\n🛑 Scraper stopped by user (Ctrl+C).")
    except Exception as e:
        print(f"\n❌ A critical error occurred during execution: {e}")
        traceback.print_exc()
    finally:
        scraper.close()