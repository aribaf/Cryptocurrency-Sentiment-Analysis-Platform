# api/routes_reddit.py
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone

from db import client

router = APIRouter(tags=["reddit"])

reddit_db = client["crypto_reddit_db"]
reddit_collection = reddit_db["latest_reddit"]

@router.get("/recent/reddit", summary="Get recent Reddit posts for RecentList component")
async def get_recent_reddit_posts(limit: int = 25, coin: Optional[str] = None):
    try:
        filter_query = {}
        if coin and coin.upper() != 'ALL':
            filter_query["coin"] = coin.upper()

        cursor = reddit_collection.find(filter_query).sort("created_at", -1).limit(limit)

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
