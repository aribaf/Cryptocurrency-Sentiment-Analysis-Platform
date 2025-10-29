import os
import json
import time
import pandas as pd
from datetime import datetime
import praw
from dotenv import load_dotenv
from pymongo import MongoClient

# --- FINBERT IMPORTS ---
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# =========================
# LOAD ENVIRONMENT VARIABLES
# =========================
load_dotenv()

print("\n🔍 Checking environment variables...")
required_env = [
    "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT",
    "MONGO_URI", "MONGO_DB", "MONGO_COLLECTION_POSTS", "MONGO_COLLECTION_SNAPSHOTS"
]

missing = [var for var in required_env if not os.getenv(var)]
if missing:
    print(f"⚠️ Missing environment variables: {missing}")
    print("❌ Please fix your .env file before running again.\n")
    exit()

# =========================
# SETUP FINBERT, REDDIT API & MONGO
# =========================

# --- FINBERT SETUP ---
print("🧠 Loading FinBERT model and tokenizer...")
FINBERT_MODEL = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
sentiment_labels = ['negative', 'neutral', 'positive'] # FinBERT labels

# SETUP REDDIT API
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT"),
)

# SETUP MONGO (with SSL fix)
# 👇 Ignore SSL handshake errors
client = MongoClient(
    os.getenv("MONGO_URI"),
    tls=True,
    tlsAllowInvalidCertificates=True
)

DB_NAME = os.getenv("MONGO_DB") # Defined in your original code, kept here for clarity
COLLECTION_NAME = "latest_reddit" # Defined in your original code, kept here for clarity

db = client[os.getenv("MONGO_DB")]
posts_collection = db[os.getenv("MONGO_COLLECTION_POSTS")]
snapshots_collection = db[os.getenv("MONGO_COLLECTION_SNAPSHOTS")]

print("✅ Environment, FinBERT, and MongoDB connected successfully!\n")

# =========================
# CONFIG
# =========================
FETCH_INTERVAL = 3600  # 1 hour
OUTPUT_POSTS = "reddit_crypto_posts.jsonl"
OUTPUT_SNAPSHOTS = "sentiment_snapshots.csv"
SUBREDDITS = ["CryptoCurrency", "Bitcoin", "ethtrader", "CryptoMarkets", 'Solana','sol']

# =========================
# FUNCTIONS
# =========================
def fetch_posts(limit=50):
    COIN_KEYWORDS = {
        "BTC": ["bitcoin", "btc"],
        "ETH": ["ethereum", "eth", "ether"],
        "SOL": ["solana", "sol"],
    }

    posts = []
    for sub in SUBREDDITS:
        for post in reddit.subreddit(sub).new(limit=limit):
            # Skip if text is empty or post is a link/image only
            if not (post.title or post.selftext):
                 continue

            text = (post.title or "") + " " + (post.selftext or "")
            text_lower = text.lower()

            detected_coin = None
            for coin, keywords in COIN_KEYWORDS.items():
                if any(keyword in text_lower for keyword in keywords):
                    detected_coin = coin
                    break

            posts.append({
                "id": post.id,
                "title": post.title,
                "selftext": post.selftext,
                "text": text, # Store combined text for FinBERT analysis
                "created_utc": datetime.utcfromtimestamp(post.created_utc).strftime("%Y-%m-%d %H:%M:%S"),
                "subreddit": post.subreddit.display_name,
                "url": post.url,
                "coin": detected_coin or "UNKNOWN",
            })
    return posts


def add_sentiment(posts):
    texts = [post.get("text") for post in posts]

    # Tokenize and run the model in a batch for efficiency
    with torch.no_grad():
        inputs = tokenizer(texts, padding=True, truncation=True, return_tensors='pt')
        outputs = model(**inputs)
        # Apply softmax to get probabilities
        predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

    for i, post in enumerate(posts):
        scores = predictions[i].numpy() # [negative_score, neutral_score, positive_score]
        
        # Get the index of the highest score (the predicted class)
        predicted_class_idx = scores.argmax()
        sentiment = sentiment_labels[predicted_class_idx]

        # Calculate a simple composite polarity score (optional, but useful)
        # Formula: P - N
        polarity = scores[2] - scores[0] 
        
        post["sentiment"] = sentiment
        post["polarity"] = float(polarity) # Ensure it's a standard Python float
        # Optional: store raw scores
        # post["score_pos"] = float(scores[2]) 
        # post["score_neg"] = float(scores[0]) 

    return posts

def save_posts(posts):
    # Save locally
    # Note: Removing the 'text' key before saving to keep the structure clean, as it's only for FinBERT
    posts_to_save = [{k: v for k, v in post.items() if k != 'text'} for post in posts]
    
    with open(OUTPUT_POSTS, "a", encoding="utf-8") as f:
        for post in posts_to_save:
            f.write(json.dumps(post) + "\n")

    # Save to MongoDB
    if posts_to_save:
        try:
            # Use post_to_save here
            posts_collection.insert_many(posts_to_save)
            print(f"💾 {len(posts_to_save)} posts saved to MongoDB collection.")
        except Exception as e:
            print(f"⚠️ Could not save posts to MongoDB: {e}")

def summarize(posts, label):
    # Remove the 'text' key again just in case, before creating the DataFrame
    posts_for_summary = [{k: v for k, v in post.items() if k != 'text'} for post in posts]
    
    if not posts_for_summary:
        print(f"⚠️ No posts found for {label}")
        return

    df = pd.DataFrame(posts_for_summary)
    summary = df["sentiment"].value_counts(normalize=True) * 100
    print(f"\n📊 Sentiment for {label}:")
    print(summary.round(2).to_string())

    snapshot = {
        "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "positive": summary.get("positive", 0),
        "neutral": summary.get("neutral", 0),
        "negative": summary.get("negative", 0),
        "total": len(posts_for_summary)
    }

    # Save locally
    df_snap = pd.DataFrame([snapshot])
    file_exists = os.path.isfile(OUTPUT_SNAPSHOTS)
    df_snap.to_csv(OUTPUT_SNAPSHOTS, mode="a", header=not file_exists, index=False)

    # Save to MongoDB
    try:
        snapshots_collection.insert_one(snapshot)
        print("📸 Snapshot saved to MongoDB.\n")
    except Exception as e:
        print(f"⚠️ Could not save snapshot to MongoDB: {e}\n")

# =========================
# MAIN LOOP
# =========================
if __name__ == "__main__":
    print("🚀 Starting automated crypto sentiment tracking with FinBERT and MongoDB...\n")

    while True:
        print(f"⏰ Fetching new data at {datetime.utcnow()} ...")
        new_posts = fetch_posts(limit=50)
        
        # Only run sentiment analysis if there are posts
        if new_posts:
            new_posts = add_sentiment(new_posts)
            save_posts(new_posts)
            summarize(new_posts, "latest batch")
            print(f"✅ Saved {len(new_posts)} posts. Sleeping for {FETCH_INTERVAL/60} minutes...\n")
        else:
            print("⚠️ No new posts found to analyze. Sleeping now...")

        time.sleep(FETCH_INTERVAL)