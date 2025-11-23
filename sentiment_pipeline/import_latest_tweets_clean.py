import math
import pandas as pd
from pymongo import MongoClient

# --- CONFIG ---
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "crypto_tweets_db"
CSV_PATH = r"crypto_tweets_db.latest_tweets.csv"  # adjust if the file is elsewhere
TARGET_COLLECTION = "latest_tweets_clean"
# ---------------

def nan_to_none(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    return v

def main():
    print("Loading CSV...")
    df = pd.read_csv(CSV_PATH)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db[TARGET_COLLECTION]

    # This only drops the *clean copy* collection, not your original latest_tweets
    print(f"Dropping existing '{TARGET_COLLECTION}' (if any)...")
    col.drop()

    print("Building documents...")
    records = df.to_dict(orient="records")
    docs = []

    for row in records:
        doc = {}

        # Basic safe fields (no dots in keys)
        safe_keys = [
            "_id",
            "tweet_id",
            "coin",
            "created_at",
            "hashtag",
            "likes",
            "replies",
            "retweets",
            "scraped_at",
            "text",
            "url",
            "username",
            "verified",
            "is_irrelevant",
            "bot_score",
            "created_at_raw",
            "is_actionable",
            "is_sarcastic",
            "user_followers",
        ]

        for k in safe_keys:
            if k in row:
                v = nan_to_none(row[k])
                doc[k] = v

        # Build nested sentiment structure from flat columns
        scores = {}
        for short, csv_key in [
            ("negative", "sentiment.scores.negative"),
            ("neutral", "sentiment.scores.neutral"),
            ("positive", "sentiment.scores.positive"),
        ]:
            if csv_key in row:
                v = nan_to_none(row[csv_key])
                if v is not None:
                    scores[short] = v

        sentiment = {}
        if scores:
            sentiment["scores"] = scores

        if "sentiment.label" in row:
            label = nan_to_none(row["sentiment.label"])
            if label is not None:
                sentiment["label"] = label

        if "sentiment.model" in row:
            model = nan_to_none(row["sentiment.model"])
            if model is not None:
                sentiment["model"] = model

        if "sentiment.analyzed_at" in row:
            analyzed_at = nan_to_none(row["sentiment.analyzed_at"])
            if analyzed_at is not None:
                sentiment["analyzed_at"] = analyzed_at

        if sentiment:
            doc["sentiment"] = sentiment

        # Build a minimal user object with followers_count
        followers = nan_to_none(row.get("user_followers"))
        if followers is not None:
            doc.setdefault("user", {})["followers_count"] = followers

        docs.append(doc)

    print(f"Prepared {len(docs)} docs. Inserting into '{TARGET_COLLECTION}'...")

    if docs:
        # Insert in batches to avoid huge single insert
        BATCH_SIZE = 1000
        for i in range(0, len(docs), BATCH_SIZE):
            batch = docs[i:i+BATCH_SIZE]
            col.insert_many(batch, ordered=False)
            print(f"Inserted {i + len(batch)} / {len(docs)}")

    print("Done. Clean collection created as", TARGET_COLLECTION)

if __name__ == "__main__":
    main()
