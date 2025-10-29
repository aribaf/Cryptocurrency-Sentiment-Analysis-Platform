# main.py (or api_server.py)
import sys 
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from pymongo import MongoClient
from bson.objectid import ObjectId

# --- Configuration (remains the same) ---
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME_RAW = "latest_tweets"
COLLECTION_NAME_AGG = "sentiment_trends_agg" 
COLLECTION_NAME_USERS = "users" 
TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"] 
TIMEZONE = "Asia/Karachi" 
# -----------------------------------------------------

# --- Security Setup ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 💥 TRUNCATION FIX INJECTED HERE 💥
def verify_password(plain_password, hashed_password):
    # Truncate the plain password to 72 chars before verifying
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    # Truncate the password to 72 chars before hashing
    return pwd_context.hash(password[:72])
# -----------------------------------------------------

# --- Initialize FastAPI App (remains the same) ---
app = FastAPI(title="CryptoSent API")

# Setup CORS (remains the same)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MongoDB Setup (remains the same) ---
try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    raw_collection = db[COLLECTION_NAME_RAW] 
    agg_collection = db[COLLECTION_NAME_AGG] 
    users_collection = db[COLLECTION_NAME_USERS] 
    
    print("🚀 FastAPI connected to MongoDB.")
except Exception as e:
    print(f"❌ MongoDB Connection Error: {e}")
    sys.exit(1) 

# --- Pydantic Data Models (remains the same) ---

class RecentTweet(BaseModel):
    _id: Optional[str] = None
    tweet_id: str
    coin: str
    text: str
    url: str
    created_at: str
    sentiment_label: Optional[str] = 'Neutral'
    confidence: Optional[float] = 0.5

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

# ----------------------------------------------------------------------
# A. USER AUTHENTICATION ENDPOINTS 
# ----------------------------------------------------------------------
# (These routes correctly call the FIXED get_password_hash function)

@app.post("/api/register", status_code=status.HTTP_201_CREATED, summary="User Registration (FR01)")
async def register_user(user_data: UserCreate):
    
    email_lower = user_data.email.lower()
    if users_collection.find_one({"email": email_lower}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Email already registered."}
        )

    if len(user_data.password) < 8:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password must be at least 8 characters."}
        )

    # 3. Hash Password and Create User
    # 💥 This call now uses the fixed function above 💥
    hashed_password = get_password_hash(user_data.password)
    
    new_user_data = dict(user_data)
    new_user_data['hashed_password'] = hashed_password
    del new_user_data['password']
    new_user_data['email'] = email_lower 
    
    try:
        users_collection.insert_one(new_user_data)
    except Exception as e:
        print(f"MongoDB Insert Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Database error during registration."}
        )
    
    return {"message": "Registration successful. Please log in.", "status": "success"}


@app.post("/api/login", summary="User Login (FR02)")
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"email": form_data.username.lower()})

    # 💥 This call now uses the fixed function above 💥
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid email or password."}
        )
    
    return {"message": "Login successful", "user": user["username"], "status": "success"}


@app.post("/api/logout", summary="User Logout (FR03)")
async def logout_user():
    return {"message": "Successfully logged out."}


# ----------------------------------------------------------------------
# B. DATA ENDPOINTS (Remain the same, using raw_collection/agg_collection)
# ----------------------------------------------------------------------

@app.get("/api/recent", summary="Get recent tweets/sentiments")
async def get_recent_sentiments(limit: int = 30):
    
    tweets = list(raw_collection.find(
        {"sentiment.label": {"$exists": True}, "is_irrelevant": False},
        {
            "_id": 1, "tweet_id": 1, "coin": 1, "text": 1, "url": 1, 
            "created_at": 1, "sentiment.label": 1, "sentiment.scores": 1,
        }
    ).sort("scraped_at", -1).limit(limit))

    formatted_tweets = []
    for tweet in tweets:
        scores = tweet.get('sentiment', {}).get('scores', {})
        confidence_score = scores.get(tweet['sentiment']['label'].lower(), 0)

        formatted_tweets.append(RecentTweet(
            _id=str(tweet.get('_id', '')),
            tweet_id=tweet['tweet_id'],
            coin=tweet['coin'],
            text=tweet['text'],
            url=tweet['url'],
            created_at=tweet['created_at'],
            sentiment_label=tweet['sentiment']['label'],
            confidence=confidence_score
        ))

    return {"data": formatted_tweets}

@app.get("/api/trends/{coin}", summary="Get multi-source sentiment trends (Twitter, Reddit, News, Overall)")
async def get_coin_trends(coin: str, unit: str = "day"):
    """
    Return daily/hourly sentiment trends across all sources (Twitter, Reddit, News).
    """

    # --- Twitter (from tweets DB) ---
    tweet_db = client["crypto_tweets_db"]
    twitter_collection = tweet_db["latest_tweets"]

    twitter_pipeline = [
        {"$match": {"coin": coin, "sentiment.scores": {"$exists": True}}},
        {
            "$group": {
                "_id": {"$dateTrunc": {"date": "$scraped_at", "unit": unit}},
                "twitter_score": {
                    "$avg": {
                        "$subtract": [
                            "$sentiment.scores.positive",
                            "$sentiment.scores.negative",
                        ]
                    }
                },
            }
        },
        {"$sort": {"_id": 1}},
    ]
    twitter_results = list(twitter_collection.aggregate(twitter_pipeline))
    twitter_data = {r["_id"].isoformat(): r["twitter_score"] for r in twitter_results if "_id" in r}

    # --- Reddit (from reddit DB) ---
    reddit_db = client["crypto_reddit_db"]
    reddit_collection = reddit_db["latest_reddit"]

    reddit_pipeline = [
        {"$match": {"coin": coin}},
        {
            "$group": {
                "_id": {"$dateTrunc": {"date": "$created_at", "unit": unit}},
                "reddit_score": {"$avg": "$polarity"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    reddit_results = list(reddit_collection.aggregate(reddit_pipeline))
# Fixed code:
    reddit_data = {r["_id"].isoformat(): r["reddit_score"] 
                for r in reddit_results 
                if "_id" in r and r["_id"] is not None}
    # --- News (from news DB) ---
    news_db = client["crypto_news_db"]
    news_collection = news_db["latest_news"]

    # New News pipeline with date conversion fix
    news_pipeline = [
        {"$match": {"coin_tags": coin, "sentiment.score": {"$exists": True}}},
        
        # 💥 FIX: Add $addFields to ensure $fetched_at is a valid date 💥
        {"$addFields": {
            "fetched_at_date": {
                # Use $toDate to convert the string to a BSON Date object
                "$toDate": "$fetched_at" 
            }
        }},
        # -------------------------------------------------------------

        {
            "$group": {
                # Now use the new, guaranteed date field for dateTrunc
                "_id": {"$dateTrunc": {"date": "$fetched_at_date", "unit": unit}},
                "news_score": {"$avg": "$sentiment.score"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    news_results = list(news_collection.aggregate(news_pipeline))
    news_data = {r["_id"].isoformat(): r["news_score"] for r in news_results if "_id" in r}

    # --- Merge all by timestamp ---
    all_timestamps = sorted(set(twitter_data.keys()) | set(reddit_data.keys()) | set(news_data.keys()))

    combined = []
    for ts in all_timestamps:
        tw = twitter_data.get(ts, None)
        rd = reddit_data.get(ts, None)
        nw = news_data.get(ts, None)
        valid_scores = [s for s in [tw, rd, nw] if s is not None]
        overall = sum(valid_scores) / len(valid_scores) if valid_scores else 0
        combined.append({
            "time_bucket": ts,
            "twitter": tw or 0,
            "reddit": rd or 0,
            "news": nw or 0,
            "overall": overall
        })

    return {"data": combined}


# Helper function to calculate the mean score for any set of documents
async def calculate_mean_score(collection, match_filter, hours=24):
    one_day_ago = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    pipeline = [
        {"$match": {
            **match_filter, 
            "sentiment.scores": {"$exists": True},
            "scraped_at": {"$gte": one_day_ago}
        }},
        {"$group": {
            "_id": None,
            "avg_pos": {"$avg": "$sentiment.scores.positive"},
            "avg_neg": {"$avg": "$sentiment.scores.negative"},
        }},
        {"$project": {
            "score": {"$subtract": ["$avg_pos", "$avg_neg"]},
            "_id": 0,
        }}
    ]
    
    result = list(collection.aggregate(pipeline))
    return result[0]['score'] if result else 0.0


@app.get("/api/sentiment/overview", summary="Get overall sentiment summary (FR06-04)")
async def get_sentiment_overview():
    overall_filter = {"coin": {"$in": TARGET_HASHTAGS}}

    # 1. Calculate Individual Coin Scores (Used for overall average)
    coin_scores = list(raw_collection.aggregate([
        {"$match": {**overall_filter, "sentiment.scores": {"$exists": True}}},
        {"$group": {"_id": "$coin", "avg_pos": {"$avg": "$sentiment.scores.positive"}, "avg_neg": {"$avg": "$sentiment.scores.negative"}}},
        {"$project": {"score": {"$subtract": ["$avg_pos", "$avg_neg"]}, "_id": 0, "coin": "$_id"}}
    ]))

    # 2. Twitter Score
    twitter_score = await calculate_mean_score(raw_collection, overall_filter)

    # 3. Reddit Score
    reddit_db = client["crypto_reddit_db"]
    reddit_collection = reddit_db["latest_reddit"]
    reddit_result = list(reddit_collection.aggregate([
        {"$group": {"_id": None, "avg_polarity": {"$avg": "$polarity"}}}
    ]))
    reddit_score = reddit_result[0]["avg_polarity"] if reddit_result else 0.0

    # 4. News Score
    news_db = client["crypto_news_db"]
    news_collection = news_db["latest_news"]
    news_result = list(news_collection.aggregate([
        {"$match": {"sentiment.score": {"$exists": True}}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
    ]))
    news_score = news_result[0]["avg_score"] if news_result else 0.0

    # 5. Compute Overall (average of Twitter + Reddit + News)
    valid_scores = [s for s in [twitter_score, reddit_score, news_score] if s is not None]
    overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0
    overall_mood = (
        "Positive" if overall_score > 0.05 else
        "Negative" if overall_score < -0.05 else
        "Neutral"
    )

    # 6. Final Response
    by_coin = {item['coin']: item['score'] for item in coin_scores}

    return {
        "data": {
            "overall": {
                "score": round(overall_score, 3),
                "label": overall_mood
            },
            "by_coin": by_coin,
            "by_source": {
                "twitter": round(twitter_score, 3),
                "reddit": round(reddit_score, 3),
                "news": round(news_score, 3)
            },
            "sentiment_counts": {
                "positive": 0.60,
                "neutral": 0.25,
                "negative": 0.15
            }
        }
    }

    
@app.get("/api/recent/reddit", summary="Get recent Reddit posts (FR06-05)")
async def get_recent_reddit():
    try:
        # Connect to Reddit database
        reddit_db = client["crypto_reddit_db"]
        reddit_collection = reddit_db["latest_reddit"]

        # Fetch latest 20 posts
        reddit_posts = list(reddit_collection.find({}, {"_id": 0}).sort("_id", -1).limit(20))

        # Optional: clean or format text fields
        formatted_posts = [
            {
                "title": post.get("title", "No title"),
                "content": post.get("content", ""),
                "subreddit": post.get("subreddit", "Unknown"),
                "polarity": post.get("polarity", 0.0),
                "url": post.get("url", "#"),
                "created_at": post.get("created_at", None)
            }
            for post in reddit_posts
        ]

        return {"data": formatted_posts}

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/sentiment/reddit", summary="Get Reddit sentiment overview")
async def get_reddit_sentiment():
    reddit_db = client["crypto_reddit_db"]
    reddit_collection = reddit_db["latest_reddit"]

    pipeline = [
        {
            "$group": {
                "_id": "$coin",
                "avg_polarity": {"$avg": "$polarity"},
            }
        }
    ]

    results = list(reddit_collection.aggregate(pipeline))

    # Format the response
    sentiment_by_coin = {}
    for item in results:
        coin = item["_id"]
        score = item["avg_polarity"]
        label = "Positive" if score > 0.05 else "Negative" if score < -0.05 else "Neutral"
        sentiment_by_coin[coin] = {"score": score, "label": label}

    # Calculate overall average
    if results:
        overall_score = sum([r["avg_polarity"] for r in results]) / len(results)
        overall_label = "Positive" if overall_score > 0.05 else "Negative" if overall_score < -0.05 else "Neutral"
    else:
        overall_score, overall_label = 0.0, "Neutral"

    return {
        "data": {
            "overall": {"score": overall_score, "label": overall_label},
            "by_coin": sentiment_by_coin
        }
    }

@app.get("/api/sentiment/news", summary="Get News sentiment overview")
async def get_news_sentiment():
    try:
        # Connect to the news database
        news_db = client["crypto_news_db"]
        news_collection = news_db["latest_news"]

        # Calculate average sentiment score from latest news
        pipeline = [
            {"$match": {"sentiment.score": {"$exists": True}}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
        ]

        results = list(news_collection.aggregate(pipeline))

        if results:
            score = results[0]["avg_score"]
            if score > 0.05:
                label = "Positive"
            elif score < -0.05:
                label = "Negative"
            else:
                label = "Neutral"
        else:
            score, label = 0.0, "Neutral"

        return {
            "data": {
                "overall": {"score": round(score, 3), "label": label}
            }
        }

    except Exception as e:
        return {"error": str(e)}


# --- C. HEATMAP DATA ENDPOINT ---

@app.get("/api/sentiment/heatmap", summary="Get multi-coin sentiment data for heatmap visualization")
async def get_sentiment_heatmap(days: int = 30):
    """
    Calculates the average sentiment for each TARGET_HASHTAG (e.g., BTC, ETH) 
    over the last 'days' (default 30), broken down by day.
    """
    
    # Calculate the starting date
    start_date = (datetime.now() - timedelta(days=days))

    # Match documents for target coins and within the time frame
    match_stage = {
        "$match": {
            "coin": {"$in": TARGET_HASHTAGS}, 
            "sentiment.scores": {"$exists": True},
            "scraped_at": {"$gte": start_date} # Assuming scraped_at is a datetime object
        }
    }

    # Group by coin and date (truncate to day)
    group_stage = {
        "$group": {
            "_id": {
                "coin": "$coin",
                "date": {"$dateTrunc": {"date": "$scraped_at", "unit": "day"}}
            },
            # Calculate the average sentiment score (Positive - Negative)
            "sentiment_score": {
                "$avg": {
                    "$subtract": [
                        "$sentiment.scores.positive",
                        "$sentiment.scores.negative",
                    ]
                }
            },
            "count": {"$sum": 1} # Count posts for volume visualization (good practice)
        }
    }

    # Project the final document structure
    project_stage = {
        "$project": {
            "coin": "$_id.coin",
            "date": "$_id.date",
            "score": {"$round": ["$sentiment_score", 3]},
            "count": 1,
            "_id": 0
        }
    }

    # Sort by coin and then by date
    sort_stage = {"$sort": {"coin": 1, "date": 1}}

    pipeline = [
        match_stage,
        group_stage,
        project_stage,
        sort_stage
    ]

    try:
        # The heatmap data comes from the raw tweets collection
        heatmap_results = list(raw_collection.aggregate(pipeline))

        # Format the dates to strings for easier frontend handling
        formatted_results = [
            {
                "coin": r['coin'],
                "date": r['date'].strftime('%Y-%m-%d'),
                "score": r['score'],
                "count": r['count']
            }
            for r in heatmap_results
        ]
        
        return {"data": formatted_results}
    
    except Exception as e:
        print(f"Heatmap Aggregation Error: {e}")
        # In a real app, you might raise an HTTPException
        return {"error": "Failed to fetch heatmap data.", "details": str(e)}

# --- Standard API Root ---
@app.get("/")
def read_root():
    return {"message": "Welcome to CryptoSent FastAPI"}