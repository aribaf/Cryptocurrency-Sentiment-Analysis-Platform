import os
import json
import time
import pandas as pd
from datetime import datetime, timedelta
import praw
from dotenv import load_dotenv
from pymongo import MongoClient

# --- NEW IMPORTS ---
from langdetect import detect, DetectorFactory
import spacy
# Set seed for langdetect stability
DetectorFactory.seed = 0
# -------------------

# --- FINBERT IMPORTS ---
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# =========================
# LOAD ENVIRONMENT VARIABLES
# =========================
load_dotenv()

# (Environment variable checks remain the same)
# ...

# =========================
# SETUP FINBERT, REDDIT API, MONGO & SPACY
# =========================

# --- FINBERT SETUP (same as before) ---
print("🧠 Loading FinBERT model and tokenizer...")
FINBERT_MODEL = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
sentiment_labels = ['negative', 'neutral', 'positive']

# --- SPACY (NER) SETUP ---
print("⚙️ Loading spaCy for Named Entity Recognition (NER)...")
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("⚠️ spaCy model 'en_core_web_sm' not found. Please run 'python -m spacy download en_core_web_sm'")
    exit()

# --- REDDIT/MONGO SETUP (same as before) ---
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT"),
)

client = MongoClient(
    os.getenv("MONGO_URI"),
    tls=True,
    tlsAllowInvalidCertificates=True
)

db = client[os.getenv("MONGO_DB")]
posts_collection = db[os.getenv("MONGO_COLLECTION_POSTS")]
snapshots_collection = db[os.getenv("MONGO_COLLECTION_SNAPSHOTS")]

print("✅ Setup complete (FinBERT, spaCy, MongoDB connected)!\n")

# =========================
# CONFIG
# =========================
FETCH_INTERVAL = 1800
OUTPUT_POSTS = "reddit_crypto_posts.jsonl"
OUTPUT_SNAPSHOTS = "sentiment_snapshots.csv"
SUBREDDITS = ["CryptoCurrency", "Bitcoin", "ethtrader", "CryptoMarkets", "Solana", "sol"]

# --- NEW CONFIG/FILTERS ---
MIN_UPVOTES = 5   # Filter by upvotes/engagements
MAX_COMMENTS = 5  # Number of top comments to fetch
MIN_TEXT_LENGTH = 20  # Minimum characters for non-spam posts
# --------------------------

# =========================
# HELPER FUNCTIONS
# =========================

def preprocess_text(text):
    """
    Cleans text and implements basic negation handling by prepending 
    'NOT_' to words between a negation word and the next punctuation/stop word.
    Example: "it is not good" -> "it is not NOT_good"
    """
    if not text:
        return ""

    # 1. Simple Cleaning
    text = text.lower().strip()
    # 2. Basic Negation Handling
    negation_words = ["not", "no", "never", "don't", "isn't", "wasn't", "couldn't", "wouldn't", "shouldn't"]
    tokens = text.split()
    processed_tokens = []

    negate = False
    for token in tokens:
        if token in negation_words:
            negate = True
            processed_tokens.append(token)
            continue

        if negate and token.isalpha():
            processed_tokens.append("NOT_" + token)
        else:
            processed_tokens.append(token)

        # Reset negation flag on punctuation/stop words
        if not token.isalnum() or token in [".", ",", "!", "?", ";"]:
            negate = False

    return " ".join(processed_tokens)


def get_top_comments(post, limit=MAX_COMMENTS):
    """Fetches and cleans top comments."""
    comments_text = []
    try:
        # PRAW command to get all comments, sorted by top
        post.comments.replace_more(limit=0)
        for comment in post.comments.list()[:limit]:
            if comment.body:
                comments_text.append(comment.body)
    except Exception as e:
        print(f"Error fetching comments for {post.id}: {e}")
    return " ".join(comments_text)


def get_ner_entities(text):
    """Performs Named Entity Recognition (NER) on the text."""
    doc = nlp(text)
    # Filter for entities relevant to finance/crypto
    # ORG (Organization/Company), MONEY (Monetary Values), DATE, GPE (Geo-Political Entity)
    relevant_entities = [ent.text for ent in doc.ents if ent.label_ in ("ORG", "MONEY", "DATE", "GPE")]
    return ", ".join(relevant_entities)

# =========================
# CORE FUNCTIONS
# =========================

def fetch_posts(limit=50):
    COIN_KEYWORDS = {
        "BTC": ["bitcoin", "btc"],
        "ETH": ["ethereum", "eth", "ether"],
        "SOL": ["solana", "sol"],
    }

    # Get previously scraped IDs to filter duplicates
    scraped_ids = set(posts_collection.distinct("id"))

    posts = []
    for sub in SUBREDDITS:
        for post in reddit.subreddit(sub).new(limit=limit):

            # --- Duplicate Post Filter ---
            if post.id in scraped_ids:
                continue

            # --- Engagement Filter & Spam Check ---
            if post.score < MIN_UPVOTES:
                continue

            # Skip if title/text is empty (spam filter 1)
            if not (post.title or post.selftext):
                continue

            # Combine post text and comments
            post_text = (post.title or "") + " " + (post.selftext or "")
            comments_text = get_top_comments(post)

            # --- Non-English Filter ---
            try:
                if detect(post_text) != "en":
                    continue
            except Exception:
                # Skip posts too short for language detection
                continue

            # --- Spam Filter 2 (Min Length) ---
            if len(post_text) < MIN_TEXT_LENGTH:
                continue

            # Final text for sentiment analysis (Post + Comments)
            full_text = preprocess_text(post_text + " " + comments_text)

            text_lower = full_text.lower()
            detected_coin = None
            for coin, keywords in COIN_KEYWORDS.items():
                if any(keyword in text_lower for keyword in keywords):
                    detected_coin = coin
                    break

            posts.append({
                "id": post.id,
                "title": post.title,
                "text_comments_raw": post_text + " " + comments_text,  # For display/storage
                "text_for_finbert": full_text,  # Pre-processed text for the model
                "created_utc": datetime.utcfromtimestamp(post.created_utc),  # datetime object
                "subreddit": post.subreddit.display_name,
                "url": post.url,
                "permalink": getattr(post, "permalink", None),
                "coin": detected_coin or "UNKNOWN",
                # --- Reddit Metrics Included ---
                "upvotes": post.score,
                "num_comments": post.num_comments,
                "NER_entities": get_ner_entities(post_text),
            })

            # Add to scraped_ids to prevent duplicates in the current loop
            scraped_ids.add(post.id)

    return posts


def add_sentiment(posts, batch_size=8):
    texts = [post.get("text_for_finbert") for post in posts]
    all_predictions = []

    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            inputs = tokenizer(batch_texts, padding=True, truncation=True, return_tensors="pt")
            outputs = model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            all_predictions.extend(probs)

    for i, post in enumerate(posts):
        scores = all_predictions[i].numpy()
        predicted_class_idx = scores.argmax()
        sentiment = sentiment_labels[predicted_class_idx]

        # Polarity: Positive probability - Negative probability
        polarity = scores[2] - scores[0]

        post["sentiment"] = sentiment
        post["polarity"] = float(polarity)
        post["neg_prob"] = float(scores[0])
        post["neu_prob"] = float(scores[1])
        post["pos_prob"] = float(scores[2])

    return posts


def save_posts(posts):
    # Prepare posts for saving: remove temporary FinBERT text and format datetime
    posts_to_save = []
    for post in posts:
        post_copy = {k: v for k, v in post.items() if k != "text_for_finbert"}

        # --- Normalize created_utc / created_at to strings for JSON & Mongo ---
        created_utc_val = post_copy.get("created_utc")
        if isinstance(created_utc_val, datetime):
            created_utc_str = created_utc_val.strftime("%Y-%m-%dT%H:%M:%S")
        else:
            created_utc_str = str(created_utc_val) if created_utc_val is not None else None

        post_copy["created_utc"] = created_utc_str
        post_copy["created_at"] = created_utc_str  # used by FastAPI /api/trends/{coin}

        # --- Normalize text field for frontend ---
        post_copy["text"] = post_copy.pop("text_comments_raw")

        # --- Wrap sentiment like Twitter & news docs ---
        original_label = post_copy.get("sentiment")
        post_copy["sentiment"] = {
            "label": original_label,
            "scores": {
                "positive": post_copy.get("pos_prob"),
                "neutral": post_copy.get("neu_prob"),
                "negative": post_copy.get("neg_prob"),
            },
        }

        posts_to_save.append(post_copy)

    # Save locally and to MongoDB
    if posts_to_save:
        with open(OUTPUT_POSTS, "a", encoding="utf-8") as f:
            for post in posts_to_save:
                f.write(json.dumps(post) + "\n")

        try:
            posts_collection.insert_many(posts_to_save)
            print(f"💾 {len(posts_to_save)} posts saved to MongoDB collection.")
        except Exception as e:
            print(f"⚠️ Could not save posts to MongoDB: {e}")


def summarize(posts, label):
    # Convert datetime objects to string for DataFrame before removal
    posts_for_summary = []
    for post in posts:
        post_copy = {k: v for k, v in post.items() if k != "text_for_finbert"}
        # here created_utc is still a datetime (we're using the in-memory 'posts')
        post_copy["created_utc"] = post_copy["created_utc"].strftime("%Y-%m-%d %H:%M:%S")
        posts_for_summary.append(post_copy)

    if not posts_for_summary:
        print(f"⚠️ No posts found for {label}")
        return

    df = pd.DataFrame(posts_for_summary)
    df["created_utc"] = pd.to_datetime(df["created_utc"])

    # --- Polarity by Coin and Time-Weighted Polarity ---
    all_coin_snapshots = []
    for coin in df["coin"].unique():
        coin_df = df[df["coin"] == coin].copy()

        # 1. Time-Weighted Polarity Calculation
        now = datetime.utcnow()
        # Define a half-life for the decay (e.g., 6 hours = 21600 seconds)
        HALF_LIFE_SECONDS = 6 * 3600

        # Time difference in seconds
        coin_df["time_diff"] = (now - coin_df["created_utc"]).dt.total_seconds()

        # Exponential decay weight: weight = 2 ^ (-time_diff / HALF_LIFE_SECONDS)
        coin_df["weight"] = 2 ** (-coin_df["time_diff"] / HALF_LIFE_SECONDS)

        # Time-Weighted Average Polarity
        weighted_polarity = (coin_df["polarity"] * coin_df["weight"]).sum() / coin_df["weight"].sum()

        # Polarity Distribution
        summary = coin_df["sentiment"].value_counts(normalize=True) * 100

        print(f"\n📊 Sentiment for **{coin}**:")
        print(summary.round(2).to_string())
        print(f"⏱️ Time-Weighted Polarity: {weighted_polarity:.4f}")

        snapshot = {
            "time": now.strftime("%Y-%m-%d %H:%M:%S"),
            "coin": coin,
            "positive": summary.get("positive", 0),
            "neutral": summary.get("neutral", 0),
            "negative": summary.get("negative", 0),
            "total_posts": len(coin_df),
            "avg_polarity": coin_df["polarity"].mean(),
            "time_weighted_polarity": weighted_polarity,
        }
        all_coin_snapshots.append(snapshot)

    # Save Snapshots
    df_snap = pd.DataFrame(all_coin_snapshots)
    file_exists = os.path.isfile(OUTPUT_SNAPSHOTS)
    df_snap.to_csv(OUTPUT_SNAPSHOTS, mode="a", header=not file_exists, index=False)

    try:
        snapshots_collection.insert_many(all_coin_snapshots)
        print("📸 Coin-specific snapshots saved to MongoDB.\n")
    except Exception as e:
        print(f"⚠️ Could not save snapshots to MongoDB: {e}\n")


# =========================
# MAIN LOOP (remains similar)
# =========================
if __name__ == "__main__":
    print("🕒 Starting crypto sentiment tracking loop — runs every hour.\n")

    while True:
        print(f"⏰ Fetching new data at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} ...")

        # 1. Fetch, Filter, and Pre-process
        new_posts = fetch_posts(limit=100)  # Increased limit to ensure more posts are analyzed

        if new_posts:
            # 2. Add Sentiment (using text_for_finbert)
            new_posts = add_sentiment(new_posts)

            # 3. Save Posts (including new metrics and NER)
            save_posts(new_posts)

            # 4. Summarize (Polarity by Coin, Time-Weighted)
            summarize(new_posts, "latest batch")

            print(f"✅ Processed and saved {len(new_posts)} new posts successfully.\n")
        else:
            print("⚠️ No new posts found to analyze after applying all filters.\n")

        print("😴 Sleeping for 1 hour...\n")
        time.sleep(FETCH_INTERVAL)
