# db.py
from pymongo import MongoClient
import logging

MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"

try:
    client = MongoClient(MONGO_URI)

    # OLD DATABASE
    twitter_db = client["twitter_scraper"]

    # NEW DATABASE FOR TREND PREDICTIONS
    trend_db = client["trend_prediction"]

    client.admin.command('ping')
    print("✅ MongoDB connection successful")

except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    raise


# ---------------------------------------
# OLD COLLECTIONS (unchanged)
# ---------------------------------------
tweets_collection = twitter_db["tweets"]
hashtag_tweets_collection = twitter_db["hashtagtweets"]
scrappertweets_collection = twitter_db["scrappertweets"]
news_collection = twitter_db["news"]
price_collection = twitter_db["market_prices"]
features_collection = twitter_db["features"]
models_collection = twitter_db["ml_models"]

# ---------------------------------------
# NEW TREND PREDICTION COLLECTIONS
# ---------------------------------------

# Latest predictions (1 doc per coin)
predictions_collection = trend_db["predictions"]

# History of predictions (many docs per coin)
trend_history_collection = trend_db["history"]


def setup_trend_indexes():
    """Indexes for prediction + history"""
    try:
        # predictions will be overwritten each run
        predictions_collection.create_index("cryptocurrency", unique=True)

        # history grows over time
        trend_history_collection.create_index([("cryptocurrency", 1), ("generated_at", -1)])
        
        print("✅ Trend Prediction indexes created")
    except Exception as e:
        print("❌ Failed to create trend indexes:", e)


if __name__ == "__main__":
    print("=== Trend Collection Setup ===")
    setup_trend_indexes()
