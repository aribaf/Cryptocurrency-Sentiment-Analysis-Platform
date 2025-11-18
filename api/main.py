import sys 
import json
from datetime import datetime, timedelta,timezone
from typing import List, Dict, Optional
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from pymongo import MongoClient
from bson.objectid import ObjectId
from bson import ObjectId # Re-importing ObjectId for clarity
# transactions router (add this import)
# api/main.py (near top imports)
try:
    from .transactions import router as tx_router
except Exception as e:
    print(f"Could not import .transactions: {e}")
    tx_router = None


# --- Configuration (remains the same) ---
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME_RAW = "latest_tweets"
COLLECTION_NAME_AGG = "sentiment_trends_agg" 
COLLECTION_NAME_USERS = "users" 
TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"] 
TIMEZONE = "Asia/Karachi" 
# -----------------------------------------------------

# --- Coin Mapping for Data Consistency ---
TICKER_TO_FULL_NAME = {
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "SOLANA": "Solana"
}
# -----------------------------------------------------

# --- Security Setup ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # Truncate the plain password to 72 chars before verifying
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    # Truncate the password to 72 chars before hashing
    return pwd_context.hash(password[:72])
# -----------------------------------------------------

# --- Initialize FastAPI App (remains the same) ---
app = FastAPI(title="CryptoSent API")
# mount transactions router under /api so final endpoints are /api/transactions/...
if tx_router:
    app.include_router(tx_router, prefix="/api")

# =========================
# ACCOUNT MANAGEMENT MODELS
# =========================
class ProfileUpdate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None 
    username: Optional[str] = None
    new_email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: str
    new_password: str

class DeactivateRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None

class DeleteRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    confirm: bool

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
# A. USER AUTHENTICATION ENDPOINTS (NO CHANGES)
# ----------------------------------------------------------------------

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
# B. DATA ENDPOINTS
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

# ----------------------------------------------------------------------
# FIX 1: ADD /api/sentiment/twitter endpoint for RecentList component
# ----------------------------------------------------------------------
# ----------------------------------------------------------------------
# FIX 1: UPDATED /api/sentiment/twitter endpoint 
# Wraps response in {"data": [...]}. Ensures 'created_at' is a string.
# ----------------------------------------------------------------------
@app.get("/api/sentiment/twitter", summary="Get recent tweets (Fixes 404, fixes data structure)")
async def get_recent_twitter(limit: int = 20, coin: Optional[str] = None):
    try:
        twitter_collection = raw_collection 

        query = {"sentiment.scores": {"$exists": True}, "is_irrelevant": False}
        if coin and coin != "ALL":
            coin_match = TICKER_TO_FULL_NAME.get(coin, coin) 
            query["coin"] = {"$in": [coin_match, coin]}

        tweets = list(twitter_collection.find(
            query,
            {"_id": 0, "tweet_id": 1, "coin": 1, "text": 1, "url": 1, 
             "created_at": 1, "sentiment.label": 1, "sentiment.scores": 1}
        ).sort("scraped_at", -1).limit(limit))

        formatted_tweets = []
        for tweet in tweets:
            scores = tweet.get('sentiment', {}).get('scores', {})
            confidence_score = scores.get(tweet.get('sentiment', {}).get('label', 'neutral').lower(), 0)

            formatted_tweets.append({
                "id": tweet['tweet_id'],
                "title": tweet['text'],
                "text": tweet['text'],
                "coin": tweet['coin'],
                "url": tweet['url'],
                # Ensures created_at is a string, preventing "Invalid time value"
                "created_at": tweet.get('created_at', ""), 
                "sentiment_label": tweet.get('sentiment', {}).get('label', 'Neutral'),
                "confidence": confidence_score,
                "source": "twitter",
            })
            
        # <<< CRITICAL CHANGE: Wrap the array in the "data" key >>>
        return {"data": formatted_tweets}

    except Exception as e:
        print(f"Twitter fetch error: {e}")
        # Return an object with an empty array on error for consistency
        return {"data": []}

# ----------------------------------------------------------------------
# FIX 2: UPDATED /api/sentiment/news endpoint 
# Wraps response in {"data": [...]}. Ensures 'created_at' is a string.
# ----------------------------------------------------------------------
@app.get("/api/sentiment/news", summary="Get recent news articles (fixes data structure)")
async def get_recent_news(limit: int = 20, coin: Optional[str] = None):
    try:
        news_db = client["crypto_news_db"]
        news_collection = news_db["latest_news"]

        query = {"sentiment.score": {"$exists": True}}
        if coin and coin != "ALL":
            query["coin_tags"] = {"$in": [coin]}

        news_posts = list(news_collection.find(
            query, 
            {"_id": 0, "title": 1, "url": 1, "coin_tags": 1, "fetched_at": 1, "sentiment.score": 1}
        ).sort("fetched_at", -1).limit(limit))

        formatted_posts = [
            {
                "id": post.get("url", ""), 
                "title": post.get("title", "No title"),
                "text": post.get("title", ""),
                "coin": post.get("coin_tags", [])[0] if post.get("coin_tags") else None,
                "url": post.get("url", "#"),
                # Ensures fetched_at is a string, preventing "Invalid time value"
                "created_at": post.get("fetched_at", ""), 
                "sentiment_label": post.get("sentiment", {}).get("label", "Neutral"),
                "confidence": post.get("sentiment", {}).get("score", 0.0),
                "source": "news",
            }
            for post in news_posts
        ]
        
        # <<< CRITICAL CHANGE: Wrap the array in the "data" key >>>
        return {"data": formatted_posts}

    except Exception as e:
        print(f"News fetch error: {e}")
        # Return an object with an empty array on error for consistency
        return {"data": []}
@app.get("/api/trends/{coin}", summary="Get multi-source sentiment trends (Twitter, Reddit, News, Overall)")
async def get_coin_trends(coin: str, unit: str = "day"):
    # ... (TRENDS LOGIC REMAINS UNCHANGED) ...
    if unit == "day":
        days_lookback = 30
    elif unit == "week":
        days_lookback = 90
    else:
        days_lookback = 7
        
    start_date = datetime.now() - timedelta(days=days_lookback)
    
    start_date_str = start_date.strftime('%Y-%m-%dT%H:%M:%S.000000') 

    
    # --- Twitter (from tweets DB) ---
    tweet_db = client["crypto_tweets_db"]
    twitter_collection = tweet_db["latest_tweets"]
    
    twitter_coin_match = TICKER_TO_FULL_NAME.get(coin, coin)

    twitter_pipeline = [
        {"$match": {
            "coin": twitter_coin_match, 
            "sentiment.scores": {"$exists": True},
            "scraped_at": {"$gte": start_date_str} 
        }},
        
        {"$addFields": {
            "scraped_at_date": {
                "$toDate": {"$ifNull": ["$scraped_at", "$created_at"]}
            }
        }},
        
        {
            "$group": {
                "_id": {"$dateTrunc": {"date": "$scraped_at_date", "unit": unit}},
                "twitter_score": {
                    "$avg": {"$subtract": ["$sentiment.scores.positive", "$sentiment.scores.negative"]}
                },
            }
        },
        {"$sort": {"_id": 1}},
    ]
    twitter_results = list(twitter_collection.aggregate(twitter_pipeline))
    twitter_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["twitter_score"] for r in twitter_results if "_id" in r}

    # --- Reddit (from reddit DB) ---
    reddit_db = client["crypto_reddit_db"]
    reddit_collection = reddit_db["latest_reddit"]

    reddit_pipeline = [
        {"$match": {
            "coin": coin,
            "created_at": {"$gte": start_date_str} 
        }},
        
        {"$addFields": {"created_at_date": {"$toDate": "$created_at"}}},

        {"$group": {
            "_id": {"$dateTrunc": {"date": "$created_at_date", "unit": unit}},
            "reddit_score": {"$avg": "$polarity"},
        }},
        {"$sort": {"_id": 1}},
    ]
    reddit_results = list(reddit_collection.aggregate(reddit_pipeline))
    reddit_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["reddit_score"] for r in reddit_results if "_id" in r and r["_id"] is not None}
    
    # --- News (from news DB) ---
    news_db = client["crypto_news_db"]
    news_collection = news_db["latest_news"]

    news_pipeline = [
        {"$match": {
            "coin_tags": {"$in": [coin]}, 
            "sentiment.score": {"$exists": True},
            "fetched_at": {"$gte": start_date_str}
        }},
        
        {"$addFields": {"fetched_at_date": {"$toDate": "$fetched_at"}}},

        {"$group": {
            "_id": {"$dateTrunc": {"date": "$fetched_at_date", "unit": unit}},
            "news_score": {"$avg": "$sentiment.score"},
        }},
        {"$sort": {"_id": 1}},
    ]
    news_results = list(news_collection.aggregate(news_pipeline))
    news_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["news_score"] for r in news_results if "_id" in r}

    # --- Merge all by timestamp and fill missing gaps with zero ---
    combined = []
    all_timestamps = sorted(set(twitter_data.keys()) | set(reddit_data.keys()) | set(news_data.keys()))

    if not all_timestamps:
        return {"data": []}

    start_dt = datetime.fromisoformat(all_timestamps[0].replace('Z', '+00:00'))
    end_dt = datetime.now().replace(microsecond=0)

    if unit == "day" or unit == "week":
        step = timedelta(days=1)
    else: # hour
        step = timedelta(hours=1)
    
    current_dt = start_dt
    
    while current_dt <= end_dt:
        bucket_key = current_dt.isoformat().replace('+00:00', 'Z')
        
        tw = twitter_data.get(bucket_key, 0)
        rd = reddit_data.get(bucket_key, 0)
        nw = news_data.get(bucket_key, 0)
        
        valid_scores = [s for s in [tw, rd, nw] if s != 0]
        
        overall = sum(valid_scores) / len(valid_scores) if valid_scores else 0
        
        combined.append({
            "time_bucket": bucket_key,
            "twitter": tw,
            "reddit": rd,
            "news": nw,
            "overall": overall
        })
        
        current_dt += step
        
        if (unit == "day" or unit == "week") and current_dt.date() > end_dt.date():
            break
        elif unit == "hour" and current_dt > end_dt:
             break
        

    return {"data": combined}


# Helper function to calculate the mean score for any set of documents (NO CHANGES)
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
    # Match both ticker and full names so DB values like "Bitcoin" are included
    coin_match_list = list(set(TARGET_HASHTAGS + list(TICKER_TO_FULL_NAME.values())))
    overall_filter = {"coin": {"$in": coin_match_list}}

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

    


# ... (your existing imports like from fastapi import ..., from pymongo import MongoClient, etc.)

# CRITICAL: This is the function that the frontend's getReddit call is expecting
# It should fetch individual recent posts, not the aggregate overview.
@app.get("/api/recent/reddit", summary="Get recent Reddit posts for RecentList component")
async def get_recent_reddit_posts(
    limit: int = 25, 
    coin: Optional[str] = None
):
    try:
        reddit_db = client["crypto_reddit_db"]
        reddit_collection = reddit_db["latest_reddit"]
        
        # 1. Define the query filter
        filter_query = {}
        if coin and coin.upper() != 'ALL':
            filter_query["coin"] = coin.upper()

        # 2. Fetch the documents, newest first (use created_at which our scraper sets)
        cursor = reddit_collection.find(filter_query).sort("created_at", -1).limit(limit)
        
        # 3. Process and format the results
        posts = []
        for doc in cursor:
            created_at = (
                doc.get("created_at")
                or doc.get("created_utc")
                or datetime.now(timezone.utc).isoformat()
            )

            doc_id = str(doc.get("_id", ""))

            posts.append({
                "id": doc_id,
                "text": doc.get("text") or doc.get("title") or "No content",
                "title": doc.get("title", "No Title"),
                "url": f"https://reddit.com/{doc.get('permalink')}" if doc.get('permalink') else doc.get("url"),
                "created_at": created_at,
                "polarity": doc.get("polarity"),
                "confidence": doc.get("polarity"),  # Use polarity as confidence for consistency
                "coin": doc.get("coin"),
                "source": "reddit",
            })
            
        return {"data": posts}
        
    except Exception as e:
        print(f"Error fetching recent Reddit posts: {e}")
        return {"data": []}

# ----------------------------------------------------------------------
# FIX 3: RENAME original /api/sentiment/news to /api/sentiment/news/overview
# ----------------------------------------------------------------------
@app.get("/api/sentiment/news/overview", summary="Get News sentiment overview")
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


# --- C. HEATMAP DATA ENDPOINT (NO CHANGES) ---

# =========================
# ACCOUNT MANAGEMENT HELPERS (NO CHANGES)
# ======================================================================
def _get_user_by_identifier(user_id: Optional[str], email: Optional[str]):
    q = None
    if user_id:
        try:
            q = {"_id": ObjectId(user_id)}
        except Exception:
            raise HTTPException(status_code=400, detail={"message": "Invalid user_id"})
    elif email:
        q = {"email": email.lower()}
    else:
        raise HTTPException(status_code=400, detail={"message": "user_id or email is required"})

    user = users_collection.find_one(q)
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})
    return user

def _public_user(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "username": user_doc.get("username", ""),
        "email": user_doc.get("email", ""),
        "is_active": user_doc.get("is_active", True),
        "created_at": user_doc.get("created_at"),
        "updated_at": user_doc.get("updated_at"),
        "deactivated_at": user_doc.get("deactivated_at"),
    }
# ----------------------------------------------------------------------
# C. ACCOUNT MANAGEMENT ENDPOINTS (NO CHANGES)
# ----------------------------------------------------------------------
@app.get("/api/account/profile", summary="Get current profile")
async def get_profile(user_id: Optional[str] = None, email: Optional[str] = None):
    user = _get_user_by_identifier(user_id, email)
    return {"data": _public_user(user)}

@app.put("/api/account/profile", summary="Update profile (name, username, email)")
async def update_profile(payload: ProfileUpdate):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    updates = {}

    if payload.username is not None:
        # check unique username (excluding me)
        existing = users_collection.find_one(
            {"username": payload.username, "_id": {"$ne": user["_id"]}}
        )
        if existing:
            raise HTTPException(status_code=400, detail={"message": "Username already taken"})
        updates["username"] = payload.username.strip()

    if payload.new_email is not None:
        new_email_lower = payload.new_email.lower()
        existing = users_collection.find_one(
            {"email": new_email_lower, "_id": {"$ne": user["_id"]}}
        )
        if existing:
            raise HTTPException(status_code=400, detail={"message": "Email already registered"})
        updates["email"] = new_email_lower

    if not updates:
        return {"message": "Nothing to update", "data": _public_user(user)}

    updates["updated_at"] = datetime.utcnow()
    users_collection.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Profile updated", "data": _public_user(fresh)}

@app.put("/api/account/password", summary="Change password")
async def change_password(payload: PasswordUpdate):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail={"message": "New password must be at least 8 characters"})

    user = _get_user_by_identifier(payload.user_id, payload.email)

    if "hashed_password" not in user:
        raise HTTPException(status_code=400, detail={"message": "User has no password set"})

    # verify current password
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail={"message": "Current password is incorrect"})

    new_hash = get_password_hash(payload.new_password)
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hash, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Password updated successfully"}

@app.post("/api/account/deactivate", summary="Temporarily deactivate account")
async def deactivate_account(payload: DeactivateRequest):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": False, "deactivated_at": datetime.utcnow()}}
    )
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Account deactivated", "data": _public_user(fresh)}

@app.post("/api/account/reactivate", summary="Reactivate account")
async def reactivate_account(payload: DeactivateRequest):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": True}, "$unset": {"deactivated_at": ""}}
    )
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Account reactivated", "data": _public_user(fresh)}

@app.delete("/api/account/delete", summary="Permanently delete account")
async def delete_account(payload: DeleteRequest):
    if not payload.confirm:
        raise HTTPException(status_code=400, detail={"message": "Confirmation required"})

    user = _get_user_by_identifier(payload.user_id, payload.email)
    users_collection.delete_one({"_id": user["_id"]})
    return {"message": "Account permanently deleted"}

# --- Standard API Root ---
@app.get("/")
def read_root():
    return {"message": "Welcome to CryptoSent FastAPI"}

# --- HEATMAP ENDPOINT (NO CHANGES) ---

@app.get("/api/sentiment/heatmap", summary="Get multi-coin sentiment data for heatmap visualization")
async def get_sentiment_heatmap(days: int = 30):
    
    start_date = datetime.now() - timedelta(days=days)

    ticker_list = TARGET_HASHTAGS
    full_names = ["Bitcoin", "Ethereum", "Solana"]
    coin_match_list = list(set(ticker_list + full_names))

    # 1) initial match
    match_stage = {
        "$match": {
            "coin": {"$in": coin_match_list},
            "sentiment.scores": {"$exists": True}
        }
    }

    # 2) convert scraped_at to a Date object: scraped_at_dt
    add_fields_stage = {
        "$addFields": {
            "scraped_at_dt": {
                "$cond": [
                    {"$or": [
                        {"$eq": [{"$type": "$scraped_at"}, "missing"]},
                        {"$eq": [{"$type": "$scraped_at"}, "null"]}
                    ]},
                    # if scraped_at missing/null, try created_at (might be string or date)
                    {
                        "$cond": [
                            {"$eq": [{"$type": "$created_at"}, "string"]},
                            {"$toDate": "$created_at"},
                            "$created_at"
                        ]
                    },
                    # else if scraped_at exists
                    {
                        "$cond": [
                            {"$eq": [{"$type": "$scraped_at"}, "string"]},
                            {"$toDate": "$scraped_at"},
                            "$scraped_at"
                        ]
                    }
                ]
            }
        }
    }

    # 3) filter by date range using the computed scraped_at_dt
    match_by_date_stage = {
        "$match": {
            "scraped_at_dt": {"$gte": start_date}
        }
    }

    # 4) group by coin + day and compute average sentiment (pos - neg) and count
    group_stage = {
        "$group": {
            "_id": {
                "coin": "$coin",
                "date": {"$dateTrunc": {"date": "$scraped_at_dt", "unit": "day"}}
            },
            "sentiment_score": {
                "$avg": {
                    "$subtract": [
                        "$sentiment.scores.positive",
                        "$sentiment.scores.negative"
                    ]
                }
            },
            "count": {"$sum": 1}
        }
    }

    project_stage = {
        "$project": {
            "coin": "$_id.coin",
            "date": "$_id.date",
            "score": {"$round": ["$sentiment_score", 3]},
            "count": 1,
            "_id": 0
        }
    }

    sort_stage = {"$sort": {"coin": 1, "date": 1}}

    pipeline = [
        match_stage,
        add_fields_stage,
        match_by_date_stage,
        group_stage,
        project_stage,
        sort_stage
    ]

    try:
        results = list(raw_collection.aggregate(pipeline))
    except Exception as e:
        print(f"Heatmap Aggregation Error: {e}")
        return {"error": "Aggregation failed", "details": str(e)}

    # Format `date` to YYYY-MM-DD strings for frontend
    formatted = []
    for r in results:
        date_obj = r.get("date")
        if isinstance(date_obj, datetime):
            date_str = date_obj.strftime("%Y-%m-%d")
        else:
            try:
                date_str = str(date_obj)
            except:
                date_str = None
        formatted.append({
            "coin": r.get("coin"),
            "date": date_str,
            "score": r.get("score", 0),
            "count": r.get("count", 0)
        })

    return {"data": formatted}


from fastapi import Query

@app.get("/api/sentiment/breakdown", summary="Get breakdown for a source (twitter|reddit|news|overall)")
async def get_sentiment_breakdown(
    source: str = Query(..., description="twitter | reddit | news | overall"),
    coin: Optional[str] = Query(None, description="Coin ticker, e.g. BTC"),
    top_n: int = Query(10, description="Number of top posts to return")
):
    """
    Returns: { data: { positive, neutral, negative, avg_score, top_posts: [...], time_series: [...] } }
    """
    try:
        src = source.lower()
        coin_filter = None
        if coin and coin.upper() != "ALL":
            # match either ticker or full name as in other endpoints
            # keep coin_filter as a list so later we can set {"$in": coin_filter}
            coin_filter = [
                TICKER_TO_FULL_NAME.get(coin.upper(), coin.upper()),
                coin.upper(),
                coin
            ]

        # Helper to format time string
        def safe_str(dt):
            try:
                return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
            except:
                return str(dt)

        # ---------- TWITTER (raw_collection) ----------
        if src == "twitter":
            q = {"sentiment.scores": {"$exists": True}, "is_irrelevant": False}
            if coin_filter:
                q["coin"] = {"$in": coin_filter}

            # counts by label
            pipeline_counts = [
                {"$match": q},
                {"$group": {"_id": {"label": "$sentiment.label"}, "count": {"$sum": 1}}},
            ]
            counts = list(raw_collection.aggregate(pipeline_counts))
            total = sum([c["count"] for c in counts]) or 0

            pos = next((c["count"] for c in counts if c["_id"]["label"].lower() == "positive"), 0)
            neu = next((c["count"] for c in counts if c["_id"]["label"].lower() == "neutral"), 0)
            neg = next((c["count"] for c in counts if c["_id"]["label"].lower() == "negative"), 0)

            # avg score (pos - neg) using sentiment.scores if available
            pipeline_avg = [
                {"$match": q},
                {"$group": {
                    "_id": None,
                    "avg_pos": {"$avg": "$sentiment.scores.positive"},
                    "avg_neg": {"$avg": "$sentiment.scores.negative"}
                }},
                {"$project": {"score": {"$subtract": ["$avg_pos", "$avg_neg"]}, "_id": 0}}
            ]
            avg_res = list(raw_collection.aggregate(pipeline_avg))
            avg_score = avg_res[0]["score"] if avg_res else 0.0

            # top posts (recent)
            top_cursor = raw_collection.find(q, {"_id": 0, "tweet_id":1, "text":1, "url":1, "created_at":1, "sentiment.label":1}).sort("scraped_at", -1).limit(top_n)
            top_posts = []
            for d in top_cursor:
                top_posts.append({
                    "id": d.get("tweet_id"),
                    "title": (d.get("text") or "")[:200],
                    "text": d.get("text"),
                    "url": d.get("url"),
                    "created_at": d.get("created_at"),
                    "sentiment_label": d.get("sentiment", {}).get("label")
                })

            return {"data": {
                "positive": (pos / total) if total else 0,
                "neutral": (neu / total) if total else 0,
                "negative": (neg / total) if total else 0,
                "avg_score": round(avg_score, 4),
                "top_posts": top_posts
            }}

        # ---------- REDDIT ----------
        if src == "reddit":
            reddit_collection = client["crypto_reddit_db"]["latest_reddit"]
            q = {}
            if coin and coin.upper() != "ALL":
                q["coin"] = coin.upper()

            cursor = reddit_collection.find(
                q,
                {"_id": 0, "title": 1, "text": 1, "polarity": 1, "created_at": 1, "created_utc": 1, "permalink": 1}
            ).sort("created_at", -1).limit(500)

            posts = list(cursor)
            total = len(posts) or 0
            pos = sum(1 for p in posts if p.get("polarity") is not None and p.get("polarity") > 0.05)
            neg = sum(1 for p in posts if p.get("polarity") is not None and p.get("polarity") < -0.05)
            neu = total - pos - neg

            top_posts = []
            for p in posts[:top_n]:
                created_at = p.get("created_at") or p.get("created_utc")
                top_posts.append({
                    "id": str(p.get("_id", ""))[:20],
                    "title": p.get("title") or (p.get("text") or "")[:80],
                    "text": p.get("text") or p.get("title") or "",
                    "url": f"https://reddit.com{p.get('permalink')}" if p.get("permalink") else None,
                    "created_at": created_at,
                    "sentiment_label": (
                        "Positive" if p.get("polarity", 0) > 0.05
                        else "Negative" if p.get("polarity", 0) < -0.05
                        else "Neutral"
                    ),
                    "polarity": p.get("polarity")
                })

            avg_score = (sum(p.get("polarity", 0) for p in posts) / total) if total else 0.0

            return {"data": {
                "positive": (pos / total) if total else 0,
                "neutral": (neu / total) if total else 0,
                "negative": (neg / total) if total else 0,
                "avg_score": round(avg_score, 4),
                "top_posts": top_posts
            }}

        # ---------- NEWS ----------
        if src == "news":
            news_collection = client["crypto_news_db"]["latest_news"]
            q = {"sentiment.score": {"$exists": True}}
            if coin and coin.upper() != "ALL":
                q["coin_tags"] = {"$in": [coin.upper(), TICKER_TO_FULL_NAME.get(coin.upper(), coin.upper())]}

            pipeline_counts = [
                {"$match": q},
                {"$group": {"_id": {"label": "$sentiment.label"}, "count": {"$sum": 1}}},
            ]
            counts = list(news_collection.aggregate(pipeline_counts))
            total = sum([c["count"] for c in counts]) or 0
            pos = next((c["count"] for c in counts if c["_id"]["label"].lower() == "positive"), 0)
            neu = next((c["count"] for c in counts if c["_id"]["label"].lower() == "neutral"), 0)
            neg = next((c["count"] for c in counts if c["_id"]["label"].lower() == "negative"), 0)

            pipeline_avg = [
                {"$match": q},
                {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}},
                {"$project": {"score": "$avg_score", "_id": 0}}
            ]
            avg_res = list(news_collection.aggregate(pipeline_avg))
            avg_score = avg_res[0]["score"] if avg_res else 0.0

            top_cursor = news_collection.find(q, {"_id":0, "title":1, "url":1, "fetched_at":1, "sentiment.score":1}).sort("fetched_at", -1).limit(top_n)
            top_posts = []
            for d in top_cursor:
                top_posts.append({
                    "id": d.get("url"),
                    "title": d.get("title"),
                    "text": d.get("title"),
                    "url": d.get("url"),
                    "created_at": d.get("fetched_at"),
                    "sentiment_label": d.get("sentiment", {}).get("label")
                })

            return {"data": {
                "positive": (pos / total) if total else 0,
                "neutral": (neu / total) if total else 0,
                "negative": (neg / total) if total else 0,
                "avg_score": round(avg_score, 4),
                "top_posts": top_posts
            }}

        # ---------- OVERALL: combine sources ----------
        if src == "overall":
            # Reuse existing overview function to keep results consistent
            overview = await get_sentiment_overview()
            # get_sentiment_overview returns {"data": {...}}
            od = overview.get("data", {})
            return {"data": {
                "positive": od.get("sentiment_counts", {}).get("positive", 0),
                "neutral": od.get("sentiment_counts", {}).get("neutral", 0),
                "negative": od.get("sentiment_counts", {}).get("negative", 0),
                "avg_score": od.get("overall", {}).get("score", 0),
                "top_posts": []  # not applicable for overall
            }}

        # unsupported source
        return {"data": {}}

    except Exception as e:
        print(f"Breakdown fetch error ({source}, {coin}): {e}")
        return {"data": {}}
@app.get("/api/transactions/stats")
async def transactions_stats():
    pipeline = [
        {"$group": {"_id": "$blockchain", "count": {"$sum": 1}, "sum_usd": {"$sum": {"$ifNull":["$value_usd", 0]}}}}
    ]
    results = list(db["transactions"].aggregate(pipeline))
    # convert to dict
    out = {r["_id"]: {"count": r["count"], "sum_usd": r["sum_usd"]} for r in results}
    return {"data": out}
