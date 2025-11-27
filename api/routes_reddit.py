# api/routes_reddit.py
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone, timedelta
import io
import csv

from db import client

router = APIRouter(tags=["reddit"])

reddit_db = client["crypto_reddit_db"]
reddit_collection = reddit_db["latest_reddit"]

@router.get("/recent/reddit", summary="Get recent Reddit posts for RecentList component")
async def get_recent_reddit_posts(
    limit: int = 25,
    coin: Optional[str] = None,
    sentiment_label: Optional[str] = None,  # optional filter
):
    try:
        filter_query: dict = {}

        # Coin filter
        if coin and coin.upper() != "ALL":
            filter_query["coin"] = coin.upper()

        # Optional sentiment filter (using polarity thresholds)
        if sentiment_label and sentiment_label.lower() != "all":
            THRESHOLD = 0.05
            label = sentiment_label.lower()

            if label == "positive":
                filter_query["polarity"] = {"$gt": THRESHOLD}
            elif label == "negative":
                filter_query["polarity"] = {"$lt": -THRESHOLD}
            elif label == "neutral":
                filter_query["polarity"] = {"$gte": -THRESHOLD, "$lte": THRESHOLD}

        cursor = (
            reddit_collection.find(filter_query)
            .sort("created_at", -1)
            .limit(limit)
        )

        posts = []
        for doc in cursor:
            created_at = (
                doc.get("created_at")
                or doc.get("created_utc")
                or datetime.now(timezone.utc).isoformat()
            )

            doc_id = str(doc.get("_id", ""))

            # Raw sentiment object (e.g., from FinBERT)
            raw_sentiment = doc.get("sentiment") or {}
            sentiment_label_value = (
                raw_sentiment.get("label")
                or doc.get("sentiment_label")
                or None
            )

            # Polarity from DB if present
            polarity_score = doc.get("polarity")

            # If polarity missing but we have a label, infer a small polarity
            if polarity_score is None and isinstance(sentiment_label_value, str):
                sl = sentiment_label_value.lower()
                if sl == "positive":
                    polarity_score = 0.1
                elif sl == "negative":
                    polarity_score = -0.1
                elif sl == "neutral":
                    polarity_score = 0.0

            confidence = (
                abs(polarity_score)
                if isinstance(polarity_score, (int, float))
                else 0.0
            )

            posts.append(
                {
                    "id": doc_id,
                    "text": doc.get("text") or doc.get("title") or "No content",
                    "title": doc.get("title", "No Title"),
                    "url": (
                        f"https://reddit.com/{doc.get('permalink')}"
                        if doc.get("permalink")
                        else doc.get("url")
                    ),
                    "created_at": created_at,
                    "polarity": polarity_score,
                    "confidence": confidence,
                    "coin": doc.get("coin"),
                    "source": "reddit",

                    # New fields for frontend sentiment handling
                    "sentiment": {
                        "label": sentiment_label_value,
                        "polarity": polarity_score,
                        "raw": raw_sentiment,
                    },
                    "sentiment_label": sentiment_label_value,
                }
            )

        # getReddit() on the frontend should return this "data" array
        return {"data": posts}

    except Exception as e:
        print(f"Error fetching recent Reddit posts: {e}")
        return {"data": []}


@router.get("/download/reddit.csv", summary="Download recent Reddit sentiment data as CSV")
async def download_reddit_csv(limit: int = Query(1000, ge=1, le=5000)):
    """
    Export recent Reddit docs from crypto_reddit_db.latest_reddit as CSV.
    Uses `polarity` for sentiment.
    """
    cursor = (
        reddit_collection.find({"polarity": {"$exists": True}})
        .sort("created_at", -1)
        .limit(limit)
    )

    posts = list(cursor)
    if not posts:
        raise HTTPException(status_code=404, detail="No Reddit data found to export")

    header = [
        "id",
        "coin",
        "title",
        "text",
        "created_at",
        "polarity_score",
        "permalink",
    ]

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(header)
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)

        for post in posts:
            text = (post.get("text") or post.get("title") or "").replace(
                "\r", " "
            ).replace("\n", " ")
            permalink = (
                f"https://reddit.com/{post.get('permalink')}"
                if post.get("permalink")
                else post.get("url", "")
            )

            writer.writerow(
                [
                    str(post.get("_id", "")),
                    post.get("coin", ""),
                    post.get("title", ""),
                    text,
                    str(post.get("created_at") or post.get("created_utc") or ""),
                    post.get("polarity", ""),
                    permalink,
                ]
            )
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="recent_reddit_sentiment.csv"'
        },
    )
