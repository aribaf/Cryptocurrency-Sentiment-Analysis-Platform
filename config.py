# config.py

from pymongo import MongoClient

class Config:
    # MongoDB connection
    MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
    DB_NAME = "twitter_scraper"
    COLLECTION_NAME = "h_tweets"

    # Selenium settings
    SELENIUM_HEADLESS = True
    SCROLL_COUNT = 5
    WAIT_TIME = 5  # seconds to wait for page load

    # Coins / hashtags to scrape
    HASHTAGS = {
        "BTC": "btc",
        "ETH": "eth"
    }

    # Sentiment model
    FINBERT_MODEL = "yiyanghkust/finbert-tone"
