# api/routes_reddit.py
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone

from db import client

router = APIRouter(tags=["reddit"])

reddit_db = client["crypto_reddit_db"]
reddit_collection = reddit_db["latest_reddit"]

# routes_reddit.py (Conceptual Change)
@router.get("/recent/reddit", summary="Get recent Reddit posts for RecentList component")
async def get_recent_reddit_posts(
    limit: int = 25, 
    coin: Optional[str] = None,
    sentiment_label: Optional[str] = None # <-- NEW PARAMETER
):
    try:
        filter_query = {}
        if coin and coin.upper() != 'ALL':
            filter_query["coin"] = coin.upper()

        # Add sentiment filter logic
        if sentiment_label and sentiment_label.lower() != 'all':
             # Note: Reddit posts use a polarity score, not a direct label in the DB
             # Need to infer the score range based on the label, similar to calculate_mean_score or get_sentiment_breakdown thresholds
             
             # The existing polarity thresholds in routes_sentiment.py are 0.05 and -0.05
             THRESHOLD = 0.05 
             
             if sentiment_label.lower() == 'positive':
                 filter_query["polarity"] = {"$gt": THRESHOLD}
             elif sentiment_label.lower() == 'negative':
                 filter_query["polarity"] = {"$lt": -THRESHOLD}
             elif sentiment_label.lower() == 'neutral':
                 filter_query["polarity"] = {"$gte": -THRESHOLD, "$lte": THRESHOLD}
            
        cursor = reddit_collection.find(filter_query).sort("created_at", -1).limit(limit)
        # ... (rest of the code)
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
                "confidence": doc.get("polarity"),
                "coin": doc.get("coin"),
                "source": "reddit",
            })

        return {"data": posts}

    except Exception as e:
        print(f"Error fetching recent Reddit posts: {e}")
        return {"data": []}