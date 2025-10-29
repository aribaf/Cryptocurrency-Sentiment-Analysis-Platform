# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB configuration
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets')
    MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'twitter_scraper')
    
    # Twitter credentials (optional, for login if needed)
    TWITTER_USERNAME = os.getenv('TWITTER_USERNAME', 'ilovefalooda')
    TWITTER_PASSWORD = os.getenv('TWITTER_PASSWORD', 'RTDX$7806')
    
    # Coins to track
    COINS = ['BTC', 'ETH']
    
    # FinBERT model
    FINBERT_MODEL = 'ProsusAI/finbert'
    
    # Selenium settings
    HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'True').lower() == 'true'
    TWEETS_PER_SCRAPE = int(os.getenv('TWEETS_PER_SCRAPE', '100'))
    SCROLL_PAUSE_TIME = float(os.getenv('SCROLL_PAUSE_TIME', '2'))