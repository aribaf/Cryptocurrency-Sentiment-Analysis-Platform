# api/routes_sentiment.py
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from db import client

router = APIRouter(tags=["sentiment"])

# constants copied from main.py to avoid circular imports
TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"]
TICKER_TO_FULL_NAME = {
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "SOLANA": "Solana"
}

# collections
tweet_db = client["crypto_tweets_db"]
raw_collection = tweet_db["latest_tweets"]

# <-- UPDATED: read news from 'articles' produced by the scraper -->
news_db = client["crypto_news_db"]
news_collection = news_db["articles"]


async def calculate_mean_score(collection, match_filter, hours=24):
    """
    Compute mean (pos - neg) from documents in `collection` with match_filter
    looking back `hours` hours using the scraped_at timestamp.
    """
    one_day_ago = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

    pipeline = [
        {"$match": {
            **match_filter,
            "sentiment.scores": {"$exists": True},
            # use scraped_at or published_at strings that are ISO formatted
            "$or": [
                {"scraped_at": {"$gte": one_day_ago}},
                {"published_at": {"$gte": one_day_ago}},
                {"fetched_at": {"$gte": one_day_ago}}
            ]
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


@router.get("/sentiment/overview", summary="Get overall sentiment summary (FR06-04)")
async def get_sentiment_overview():
    # Build list of candidate coin names stored in tweet DB (hashtags + full names)
    coin_match_list = list(set(TARGET_HASHTAGS + list(TICKER_TO_FULL_NAME.values())))
    overall_filter = {"coin": {"$in": coin_match_list}}

    # by-coin (twitter) - group by coin field in tweets
    coin_scores_cursor = raw_collection.aggregate([
        {"$match": {**overall_filter, "sentiment.scores": {"$exists": True}}},
        {"$group": {
            "_id": "$coin",
            "avg_pos": {"$avg": "$sentiment.scores.positive"},
            "avg_neg": {"$avg": "$sentiment.scores.negative"}
        }},
        {"$project": {
            "score": {"$subtract": ["$avg_pos", "$avg_neg"]},
            "_id": 0,
            "coin": "$_id"
        }}
    ])
    coin_scores = list(coin_scores_cursor)
    by_coin = {item['coin']: item['score'] for item in coin_scores}

    # twitter overall (last 24h)
    twitter_score = await calculate_mean_score(raw_collection, overall_filter)

    # reddit overall
    reddit_db = client["crypto_reddit_db"]
    reddit_collection = reddit_db["latest_reddit"]
    reddit_result = list(reddit_collection.aggregate([
        {"$group": {"_id": None, "avg_polarity": {"$avg": "$polarity"}}}
    ]))
    reddit_score = reddit_result[0]["avg_polarity"] if reddit_result else 0.0

    # news overall (read from articles)
    news_result = list(news_collection.aggregate([
        {"$match": {"sentiment.score": {"$exists": True}}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
    ]))
    news_score = news_result[0]["avg_score"] if news_result else 0.0

    valid_scores = [s for s in [twitter_score, reddit_score, news_score] if s is not None]
    overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0
    overall_mood = (
        "Positive" if overall_score > 0.05 else
        "Negative" if overall_score < -0.05 else
        "Neutral"
    )

    # --------------------
    # NEW: compute sentiment counts (positive/neutral/negative) from tweets
    # using the same neutral threshold of 0.05
    # --------------------
    THRESHOLD = 0.05

    counts_pipeline = [
        {"$match": {**overall_filter, "sentiment.scores": {"$exists": True}}},
        {"$project": {
            # compute score = positive - negative
            "score": {"$subtract": ["$sentiment.scores.positive", "$sentiment.scores.negative"]}
        }},
        {"$group": {
            "_id": None,
            "positive_count": {
                "$sum": {"$cond": [{"$gt": ["$score", THRESHOLD]}, 1, 0]}
            },
            "neutral_count": {
                "$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$score", -THRESHOLD]},
                        {"$lte": ["$score", THRESHOLD]}
                    ]}, 1, 0]}
            },
            "negative_count": {
                "$sum": {"$cond": [{"$lt": ["$score", -THRESHOLD]}, 1, 0]}
            },
            "total": {"$sum": 1}
        }}
    ]

    counts_result = list(raw_collection.aggregate(counts_pipeline))
    if counts_result:
        cnts = counts_result[0]
        positive_count = int(cnts.get("positive_count", 0))
        neutral_count = int(cnts.get("neutral_count", 0))
        negative_count = int(cnts.get("negative_count", 0))
        total_count = int(cnts.get("total", positive_count + neutral_count + negative_count))
    else:
        positive_count = neutral_count = negative_count = total_count = 0

    # proportions (safe)
    if total_count > 0:
        positive_prop = round(positive_count / total_count, 3)
        neutral_prop = round(neutral_count / total_count, 3)
        negative_prop = round(negative_count / total_count, 3)
    else:
        positive_prop = neutral_prop = negative_prop = 0.0

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
            # Add both counts and proportions for compatibility
            "sentiment_counts": {
                "positive_count": positive_count,
                "neutral_count": neutral_count,
                "negative_count": negative_count,
                "total_count": total_count,
                "positive": positive_prop,
                "neutral": neutral_prop,
                "negative": negative_prop
            }
        }
    }


@router.get(
    "/sentiment/breakdown",
    summary="Get breakdown for a source (twitter|reddit|news|overall)",
)
async def get_sentiment_breakdown(
    source: str = Query(..., description="twitter | reddit | news | overall"),
    coin: Optional[str] = Query(None, description="Coin ticker, e.g. BTC"),
    top_n: int = Query(10, description="Number of top posts to return"),
):
    try:
        src = source.lower()
        coin_filter = None
        if coin and coin.upper() != "ALL":
            coin_filter = [
                TICKER_TO_FULL_NAME.get(coin.upper(), coin.upper()),
                coin.upper(),
                coin,
            ]

        # ---------- TWITTER ----------
        if src == "twitter":
            q = {"sentiment.scores": {"$exists": True}, "is_irrelevant": False}
            if coin_filter:
                q["coin"] = {"$in": coin_filter}

            pipeline_counts = [
                {"$match": q},
                {
                    "$group": {
                        "_id": {"label": "$sentiment.label"},
                        "count": {"$sum": 1},
                    }
                },
            ]
            counts = list(raw_collection.aggregate(pipeline_counts))
            total = sum(c["count"] for c in counts) or 0

            pos = next(
                (
                    c["count"]
                    for c in counts
                    if c["_id"]["label"].lower() == "positive"
                ),
                0,
            )
            neu = next(
                (
                    c["count"]
                    for c in counts
                    if c["_id"]["label"].lower() == "neutral"
                ),
                0,
            )
            neg = next(
                (
                    c["count"]
                    for c in counts
                    if c["_id"]["label"].lower() == "negative"
                ),
                0,
            )

            pipeline_avg = [
                {"$match": q},
                {
                    "$group": {
                        "_id": None,
                        "avg_pos": {"$avg": "$sentiment.scores.positive"},
                        "avg_neg": {"$avg": "$sentiment.scores.negative"},
                    }
                },
                {
                    "$project": {
                        "score": {
                            "$subtract": ["$avg_pos", "$avg_neg"]
                        },
                        "_id": 0,
                    }
                },
            ]
            avg_res = list(raw_collection.aggregate(pipeline_avg))
            avg_score = avg_res[0]["score"] if avg_res else 0.0

            top_cursor = raw_collection.find(
                q,
                {
                    "_id": 0,
                    "tweet_id": 1,
                    "text": 1,
                    "url": 1,
                    "created_at": 1,
                    "sentiment.label": 1,
                },
            ).sort("scraped_at", -1).limit(top_n)

            top_posts = []
            for d in top_cursor:
                top_posts.append(
                    {
                        "id": d.get("tweet_id"),
                        "title": (d.get("text") or "")[:200],
                        "text": d.get("text"),
                        "url": d.get("url"),
                        "created_at": d.get("created_at"),
                        "sentiment_label": (d.get("sentiment") or {}).get(
                            "label"
                        ),
                    }
                )

            return {
                "data": {
                    "positive": (pos / total) if total else 0,
                    "neutral": (neu / total) if total else 0,
                    "negative": (neg / total) if total else 0,
                    "avg_score": round(avg_score, 4),
                    "top_posts": top_posts,
                }
            }

        # ---------- REDDIT ----------
        elif src == "reddit":
            reddit_collection = client["crypto_reddit_db"]["latest_reddit"]
            q: Dict[str, Any] = {}
            if coin and coin.upper() != "ALL":
                q["coin"] = coin.upper()

            cursor = reddit_collection.find(
                q,
                {
                    "_id": 1,
                    "title": 1,
                    "text": 1,
                    "polarity": 1,
                    "created_at": 1,
                    "created_utc": 1,
                    "permalink": 1,
                },
            ).sort("created_at", -1).limit(500)

            posts = list(cursor)
            total = len(posts) or 0
            pos = sum(
                1
                for p in posts
                if p.get("polarity") is not None and p["polarity"] > 0.05
            )
            neg = sum(
                1
                for p in posts
                if p.get("polarity") is not None and p["polarity"] < -0.05
            )
            neu = total - pos - neg

            top_posts = []
            for p in posts[:top_n]:
                created_at = p.get("created_at") or p.get("created_utc")
                top_posts.append(
                    {
                        "id": str(p.get("_id", ""))[:20],
                        "title": p.get("title")
                        or (p.get("text") or "")[:80],
                        "text": p.get("text") or p.get("title") or "",
                        "url": f"https://reddit.com{p.get('permalink')}"
                        if p.get("permalink")
                        else None,
                        "created_at": created_at,
                        "sentiment_label": (
                            "Positive"
                            if (p.get("polarity") or 0) > 0.05
                            else "Negative"
                            if (p.get("polarity") or 0) < -0.05
                            else "Neutral"
                        ),
                        "polarity": p.get("polarity"),
                    }
                )

            avg_score = (
                sum(p.get("polarity", 0) for p in posts) / total
                if total
                else 0.0
            )

            return {
                "data": {
                    "positive": (pos / total) if total else 0,
                    "neutral": (neu / total) if total else 0,
                    "negative": (neg / total) if total else 0,
                    "avg_score": round(avg_score, 4),
                    "top_posts": top_posts,
                }
            }

        # ---------- NEWS ----------
        elif src == "news":
            q: Dict[str, Any] = {"sentiment.score": {"$exists": True}}
            if coin and coin.upper() != "ALL":
                coin_name = TICKER_TO_FULL_NAME.get(
                    coin.upper(), coin.upper()
                )
                q["$or"] = [
                    {
                        "coin": {
                            "$regex": f"^{coin_name}$",
                            "$options": "i",
                        }
                    },
                    {
                        "coin": {
                            "$regex": f"^{coin.upper()}$",
                            "$options": "i",
                        }
                    },
                    {"coin_tags": {"$in": [coin.upper(), coin_name]}},
                ]

            # counts by label
            pipeline_counts = [
                {"$match": q},
                {
                    "$group": {
                        "_id": {"label": "$sentiment.label"},
                        "count": {"$sum": 1},
                    }
                },
            ]
            counts = list(news_collection.aggregate(pipeline_counts))
            total = sum(c.get("count", 0) for c in counts) or 0

            def pick(label: str) -> int:
                for c in counts:
                    _id = c.get("_id")
                    if isinstance(_id, dict) and str(
                        _id.get("label", "")
                    ).lower() == label:
                        return c["count"]
                    if isinstance(_id, str) and _id.lower() == label:
                        return c["count"]
                return 0

            pos = pick("positive")
            neu = pick("neutral")
            neg = pick("negative")

            # avg score (safe)
            pipeline_avg = [
                {"$match": q},
                {
                    "$group": {
                        "_id": None,
                        "avg_score": {"$avg": "$sentiment.score"},
                    }
                },
                {"$project": {"score": "$avg_score", "_id": 0}},
            ]
            avg_res = list(news_collection.aggregate(pipeline_avg))
            raw_avg = avg_res[0].get("score", 0.0) if avg_res else 0.0
            try:
                avg_score = float(raw_avg or 0.0)
            except Exception:
                avg_score = 0.0

            # top posts
            top_cursor = news_collection.find(
                q,
                {
                    "_id": 0,
                    "title": 1,
                    "url": 1,
                    "published_at": 1,
                    "scraped_at": 1,
                    "fetched_at": 1,
                    "sentiment": 1,
                    "summary": 1,
                    "source": 1,
                    "date_source": 1,
                    "confidence": 1,
                },
            ).sort(
                [
                    ("published_at", -1),
                    ("scraped_at", -1),
                    ("fetched_at", -1),
                ]
            ).limit(top_n)

            top_posts = []
            for d in top_cursor:
                created_at = (
                    d.get("published_at")
                    or d.get("scraped_at")
                    or d.get("fetched_at")
                )
                sent = d.get("sentiment") or {}
                label = sent.get("label")
                score = sent.get("score", 0.0)
                conf = d.get("confidence")
                try:
                    if conf is None:
                        conf = abs(float(score or 0.0))
                    else:
                        conf = float(conf)
                except Exception:
                    conf = 0.0

                top_posts.append(
                    {
                        "id": d.get("url"),
                        "title": d.get("title"),
                        "text": d.get("summary") or d.get("title"),
                        "url": d.get("url"),
                        "created_at": created_at,
                        "sentiment_label": label,
                        "confidence": conf,
                        "source": d.get("source"),
                        "date_source": d.get("date_source"),
                    }
                )

            return {
                "data": {
                    "positive": (pos / total) if total else 0,
                    "neutral": (neu / total) if total else 0,
                    "negative": (neg / total) if total else 0,
                    "avg_score": round(avg_score, 4),
                    "top_posts": top_posts,
                }
            }

        # ---------- OVERALL ----------
        elif src == "overall":
            overview = await get_sentiment_overview()
            od = overview.get("data", {})
            return {
                "data": {
                    "positive": od.get("sentiment_counts", {}).get(
                        "positive", 0
                    ),
                    "neutral": od.get("sentiment_counts", {}).get(
                        "neutral", 0
                    ),
                    "negative": od.get("sentiment_counts", {}).get(
                        "negative", 0
                    ),
                    "avg_score": od.get("overall", {}).get("score", 0),
                    "top_posts": [],
                }
            }

        # unknown source
        raise HTTPException(status_code=400, detail="Unknown source")

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
