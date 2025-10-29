from pymongo import MongoClient
from datetime import datetime
import sys
import json
import time

# --- Configuration ---
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME = "latest_tweets"
AGGREGATED_COLLECTION = "sentiment_trends_agg"  # New collection to store trends
TIMEZONE = "Asia/Karachi"

TARGET_COINS = ["BTC", "ETH", "SOLANA"]

# --- Normalize Coin Names ---
def normalize_coin_name(coin):
    mapping = {
        "Bitcoin": "BTC",
        "Ethereum": "ETH",
        "Solana": "SOL"
    }
    return mapping.get(coin, coin.upper())


class SentimentAggregator:
    def __init__(self):
        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DB_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.agg_collection = self.db[AGGREGATED_COLLECTION]
            self.client.admin.command("ping")
            print("🗄️ Connected to MongoDB for aggregation.")
            self.ensure_unique_index()
        except Exception as e:
            print(f"❌ Error connecting to MongoDB: {e}")
            sys.exit(1)

    def ensure_unique_index(self):
        """Creates a unique index on (coin, unit, time_bucket) for idempotent $merge."""
        try:
            self.agg_collection.create_index(
                [("coin", 1), ("unit", 1), ("time_bucket", 1)],
                unique=True,
                name="unique_trend_key"
            )
            print(f"📄 Ensured unique index on {AGGREGATED_COLLECTION}.")
        except Exception as e:
            print(f"⚠️ Warning: Could not ensure unique index. Error: {e}")

    def get_time_series_sentiment(self, coin: str, unit: str, output_to_mongo=False):
        """Calculates mean sentiment for a specific coin and stores in MongoDB."""

        # Mapping for flexible name matching
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
            return []
        else:
            return list(self.collection.aggregate(pipeline))

    def run_aggregation(self):
        """Runs aggregation for all coins and time units."""
        print("\n" + "=" * 70)
        print("📊 GENERATING CRYPTO SENTIMENT TRENDS")
        print("=" * 70)

        results = {}
        time_units = ["hour", "day", "week"]

        print("\n🚀 Phase 1: Storing Aggregated Trends in MongoDB...")
        total_merged = 0
        for coin in TARGET_COINS:
            for unit in time_units:
                self.get_time_series_sentiment(coin, unit, output_to_mongo=True)
                total_merged += 1
        print(f"✅ Completed merging {total_merged} trends into '{AGGREGATED_COLLECTION}'.")

        print("\n💻 Phase 2: Retrieving Latest Trends for Display...")
        for coin in TARGET_COINS:
            results[coin] = {}
            print(f"\n--- Coin: #{coin} ---")

            for unit in time_units:
                query = {"coin": coin, "unit": unit}
                data = list(self.agg_collection.find(query).sort("time_bucket", 1))
                results[coin][unit] = data

                latest = self.agg_collection.find(query).sort("time_bucket", -1).limit(1)
                try:
                    latest_doc = next(latest)
                    score = latest_doc["mean_sentiment_score"]
                    mood = "BULLISH 🟢" if score > 0.05 else ("BEARISH 🔴" if score < -0.05 else "NEUTRAL 🟡")
                    print(f"  {unit.capitalize()} Trend (Latest Score): {score:.4f} ({mood})")
                    print(f"  Total {unit} data points found: {len(data)}")
                except StopIteration:
                    print(f"  {unit.capitalize()} Trend: No data available.")

        with open("sentiment_trends.json", "w") as f:
            json.dump(results, f, indent=4, default=str)
        print("\n💾 Saved all trends to sentiment_trends.json")

    def close(self):
        """Close MongoDB connection."""
        self.client.close()
        print("\n👋 Closed MongoDB connection.")


# =======================================================================
# Continuous Aggregation Loop (every 10 minutes)
# =======================================================================
if __name__ == "__main__":
    aggregator = None
    try:
        aggregator = SentimentAggregator()
        while True:
            aggregator.run_aggregation()
            print("\n⏳ Waiting 10 minutes before next update...\n")
            time.sleep(600)  # 600 seconds = 10 minutes
    except Exception as e:
        print(f"\n❌ Critical error: {e}")
    finally:
        if aggregator:
            aggregator.close()
