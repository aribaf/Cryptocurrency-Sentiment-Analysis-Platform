# database.py
from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
from config import Config
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        # Main project database
        self.client = MongoClient(Config.MONGO_URI)
        self.db = self.client[Config.MONGO_DB_NAME]
        
        # Existing collections
        self.tweets_collection = self.db['h_tweets']
        self.sentiment_collection = self.db['sentiment_analysis']
        
        # ✅ Add new database + collection for news
        self.news_db = self.client['crypto_news_db']
        self.news_collection = self.news_db['latest_news']

        self._create_indexes()

    def _create_indexes(self):
        """Create indexes for better query performance"""
        # Tweets
        self.tweets_collection.create_index([('tweet_id', ASCENDING)], unique=True)
        self.tweets_collection.create_index([('coin', ASCENDING), ('created_at', DESCENDING)])
        
        # Sentiments
        self.sentiment_collection.create_index([('coin', ASCENDING), ('timestamp', DESCENDING)])
        self.sentiment_collection.create_index([('period', ASCENDING)])
        
        # ✅ News
        self.news_collection.create_index([('url', ASCENDING)], unique=True)
        self.news_collection.create_index([('source', ASCENDING), ('fetched_at', DESCENDING)])

    # -----------------------------
    # Tweets
    # -----------------------------
    def insert_tweets(self, tweets):
        if not tweets:
            return 0
        inserted = 0
        for tweet in tweets:
            try:
                self.tweets_collection.insert_one(tweet)
                inserted += 1
            except Exception as e:
                if 'duplicate key error' not in str(e).lower():
                    print(f"Error inserting tweet: {str(e)}")
        return inserted

    def get_tweets_by_timeframe(self, coin, start_time, end_time):
        query = {
            'coin': coin.upper(),
            'created_at': {'$gte': start_time, '$lte': end_time}
        }
        return list(self.tweets_collection.find(query))

    # -----------------------------
    # Sentiment
    # -----------------------------
    def insert_sentiment_analysis(self, sentiment_data):
        try:
            self.sentiment_collection.insert_one(sentiment_data)
        except Exception as e:
            print(f"Error inserting sentiment: {str(e)}")

    def get_sentiment_by_period(self, coin, period, limit=100):
        query = {'coin': coin.upper(), 'period': period}
        return list(self.sentiment_collection.find(query).sort('timestamp', DESCENDING).limit(limit))

    # -----------------------------
    # ✅ News
    # -----------------------------
    def insert_news_article(self, article):
        """Insert or update a news article"""
        try:
            self.news_collection.update_one(
                {"url": article["url"]},
                {"$set": article},
                upsert=True
            )
        except Exception as e:
            print(f"Error inserting news article: {e}")

# ✅ Connection Test
if __name__ == "__main__":
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client['crypto_news_db']
    collection = db['latest_news']

    test_doc = {"message": "MongoDB connection successful!"}
    collection.insert_one(test_doc)
    print("✅ Connection successful and document inserted!")
