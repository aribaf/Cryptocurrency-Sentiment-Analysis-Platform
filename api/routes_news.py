# api/routes_news.py
from fastapi import APIRouter
from typing import Optional, List, Dict, Any
from db import client
from datetime import datetime

router = APIRouter(tags=["news"])

news_db = client["crypto_news_db"]
news_collection = news_db["articles"]  # scraper writes to `articles`

def score_to_label(score: float) -> str:
    """Map numeric score to label consistent with previous behavior."""
    try:
        score = float(score)
    except Exception:
        return "Neutral"
    if score > 0.05:
        return "Positive"
    if score < -0.05:
        return "Negative"
    return "Neutral"

def pick_created_at(doc: Dict[str, Any]) -> Optional[str]:
    """Prefer published_at, otherwise scraped_at, otherwise fetched_at, otherwise None."""
    return doc.get("published_at") or doc.get("scraped_at") or doc.get("fetched_at") or None

@router.get("/sentiment/news", summary="Get recent news articles (fixes data structure)")
async def get_recent_news(limit: int = 20, coin: Optional[str] = None):
    """
    Returns recent news articles saved by the scraper.

    Parameters:
    - limit: number of articles (default 20)
    - coin: filter by coin (e.g., 'Bitcoin', 'Ethereum', 'Solana'), 'ALL' for no filter.
      This will match either the single 'coin' field or any value inside 'coin_tags' array.
    """
    try:
        query = {"sentiment.score": {"$exists": True}}
        if coin and coin != "ALL":
            # match either scraper's single-string 'coin' or older/newer 'coin_tags' array
            query["$or"] = [{"coin": coin}, {"coin_tags": {"$in": [coin]}}]

        # fetch fields we want to expose
        cursor = news_collection.find(
            query,
            {
                "_id": 0,
                "title": 1,
                "url": 1,
                "coin": 1,
                "coin_tags": 1,
                "published_at": 1,
                "scraped_at": 1,
                "fetched_at": 1,
                "summary": 1,
                "sentiment": 1,
                "source": 1,
                "date_source": 1,
                "confidence": 1,
            }
        ).sort([("published_at", -1), ("scraped_at", -1)]).limit(limit)

        news_posts = list(cursor)

        formatted_posts = []
        for post in news_posts:
            sent = post.get("sentiment", {}) or {}
            # use explicit model-provided label if present
            label = sent.get("label")
            if not label:
                label = score_to_label(sent.get("score", 0.0))

            # confidence: prefer explicit doc['confidence'], else use abs(sentiment.score)
            confidence_val = post.get("confidence")
            if confidence_val is None:
                try:
                    confidence_val = abs(float(sent.get("score", 0.0)))
                except Exception:
                    confidence_val = 0.0

            created_at = pick_created_at(post)

            # coin value: prefer single 'coin', else first element of coin_tags if present
            coin_val = post.get("coin")
            if not coin_val:
                ct = post.get("coin_tags") or []
                coin_val = ct[0] if isinstance(ct, list) and len(ct) > 0 else None

            formatted_posts.append({
                "id": post.get("url", ""),
                "title": post.get("title", "No title"),
                "text": (post.get("summary") or post.get("title") or ""),  # summary preferred
                "summary": post.get("summary", ""),                       # full summary field exposed
                "coin": coin_val,
                "coin_tags": post.get("coin_tags", []),
                "url": post.get("url", "#"),
                "created_at": created_at,
                "sentiment_label": label,
                "confidence": float(confidence_val),
                "source": post.get("source", "news"),
                "date_source": post.get("date_source", None),  # 'rss' | 'newsapi' | 'page_meta' etc.
            })

        return {"data": formatted_posts}

    except Exception as e:
        # keep error simple but informative for debugging
        print(f"News fetch error: {e}")
        return {"data": []}


@router.get("/sentiment/news/overview", summary="Get News sentiment overview")
async def get_news_sentiment():
    """
    Compute average news sentiment score across articles stored by the scraper.
    """
    try:
        pipeline = [
            {"$match": {"sentiment.score": {"$exists": True}}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
        ]

        results = list(news_collection.aggregate(pipeline))

        if results:
            score = results[0].get("avg_score", 0.0) or 0.0
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
                "overall": {"score": round(float(score), 3), "label": label}
            }
        }

    except Exception as e:
        return {"error": str(e)}
