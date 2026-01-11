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
async def get_sentiment_overview(
    timeframe: int = Query(24, description="Lookback window in hours")
):

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
    twitter_score = await calculate_mean_score(
        raw_collection, overall_filter, hours=timeframe
    )

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
    
    # --------------------
    # NEW: sentiment volatility (for risk indicator)
    # --------------------
    volatility_pipeline = [
        {"$match": {**overall_filter, "sentiment.scores": {"$exists": True}}},
        {"$project": {
            "score": {
                "$subtract": [
                    "$sentiment.scores.positive",
                    "$sentiment.scores.negative"
                ]
            }
        }},
        {"$group": {
            "_id": None,
            "max_score": {"$max": "$score"},
            "min_score": {"$min": "$score"}
        }}
    ]

    vol_result = list(raw_collection.aggregate(volatility_pipeline))
    if vol_result:
        volatility = round(
            vol_result[0]["max_score"] - vol_result[0]["min_score"], 4
        )
    else:
        volatility = 0.0


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
    # --------------------
    # NEW: sentiment trend series (for correlation & chatbot)
    # --------------------
    trend_pipeline = [
        {"$match": {**overall_filter, "sentiment.scores": {"$exists": True}}},
        {"$project": {
            "score": {
                "$subtract": [
                    "$sentiment.scores.positive",
                    "$sentiment.scores.negative"
                ]
            },
            "scraped_at": 1
        }},
        {"$sort": {"scraped_at": -1}},
        {"$limit": 30}
    ]

    trend_docs = list(raw_collection.aggregate(trend_pipeline))
    trend_series = [
        round(d.get("score", 0), 4) for d in reversed(trend_docs)
    ]

    
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
            "positive_count": positive_count,
            "neutral_count": neutral_count,
            "negative_count": negative_count,
            "total_count": total_count,
            "positive": positive_prop,
            "neutral": neutral_prop,
            "negative": negative_prop
        },
        "volatility": volatility,
        "trend_series": trend_series
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
            # Use mock data for Reddit breakdown
            import random
            from datetime import datetime, timedelta
            
            # Coin-specific realistic mock data
            REDDIT_MOCK_DATA = {
                "BTC": {
                    "positive": 0.42,
                    "neutral": 0.35,
                    "negative": 0.23,
                    "avg_score": 0.61,
                },
                "ETH": {
                    "positive": 0.38,
                    "neutral": 0.39,
                    "negative": 0.23,
                    "avg_score": 0.45,
                },
                "SOLANA": {
                    "positive": 0.35,
                    "neutral": 0.42,
                    "negative": 0.23,
                    "avg_score": 0.38,
                },
                "ALL": {
                    "positive": 0.40,
                    "neutral": 0.37,
                    "negative": 0.23,
                    "avg_score": 0.52,
                },
            }
            
            # Sample post titles with varied sentiments
            SAMPLE_POSTS = [
                # Positive posts
                {"title": "Bitcoin's $25 billion legacy exodus secretly cemented Wall Street's grip on liquidity within 2 years", "sentiment": "positive"},
                {"title": "New BlackRock report exposes a historic shift in crypto that leaves only one blockchain controlling the settlement layer", "sentiment": "positive"},
                {"title": "The best and only effective BTC accumulation zone", "sentiment": "positive"},
                {"title": "Looking for Memecoin defying community", "sentiment": "positive"},
                {"title": "Ethereum's upcoming upgrade brings massive improvements", "sentiment": "positive"},
                {"title": "Solana transaction speeds hitting new records", "sentiment": "positive"},
                {"title": "Major institutions showing increased interest in crypto", "sentiment": "positive"},
                {"title": "Crypto adoption reaching all-time highs globally", "sentiment": "positive"},
                # Negative posts
                {"title": "A user on Morpho borrowed 46k USDC with a 500% borrow rate", "sentiment": "negative"},
                {"title": "Concerns about regulatory crackdown intensifying", "sentiment": "negative"},
                {"title": "Another exchange facing liquidity issues", "sentiment": "negative"},
                {"title": "Security vulnerability discovered in popular DeFi protocol", "sentiment": "negative"},
                {"title": "Market manipulation allegations surface again", "sentiment": "negative"},
                {"title": "Network congestion causing high transaction fees", "sentiment": "negative"},
                # Neutral posts
                {"title": "You in 2030 sending a gift to the friend who told you to buy SBTC in 2026", "sentiment": "neutral"},
                {"title": "He's not the same cat anymore", "sentiment": "neutral"},
                {"title": "SLIP-0039 with shamir backup", "sentiment": "neutral"},
                {"title": "Technical analysis: Key levels to watch this week", "sentiment": "neutral"},
                {"title": "Upcoming economic calendar events", "sentiment": "neutral"},
                {"title": "Developer conference scheduled for next month", "sentiment": "neutral"},
                {"title": "Community poll results on governance proposal", "sentiment": "neutral"},
                {"title": "Comparison of different wallet options", "sentiment": "neutral"},
            ]
            
            selected_coin = (coin or "ALL").upper()
            mock_stats = REDDIT_MOCK_DATA.get(selected_coin, REDDIT_MOCK_DATA["ALL"])
            
            # Generate top posts with varied sentiments
            top_posts = []
            now = datetime.utcnow()
            
            # Shuffle and select posts based on sentiment distribution
            random.shuffle(SAMPLE_POSTS)
            pos_count = int(top_n * mock_stats["positive"])
            neg_count = int(top_n * mock_stats["negative"])
            neu_count = top_n - pos_count - neg_count
            
            selected_posts = []
            for post in SAMPLE_POSTS:
                if post["sentiment"] == "positive" and pos_count > 0:
                    selected_posts.append(post)
                    pos_count -= 1
                elif post["sentiment"] == "negative" and neg_count > 0:
                    selected_posts.append(post)
                    neg_count -= 1
                elif post["sentiment"] == "neutral" and neu_count > 0:
                    selected_posts.append(post)
                    neu_count -= 1
                if len(selected_posts) >= top_n:
                    break
            
            for i, post in enumerate(selected_posts):
                created_at = (now - timedelta(hours=i * 2))
                
                # Generate polarity based on sentiment
                if post["sentiment"] == "positive":
                    polarity = random.uniform(0.1, 0.8)
                    sentiment_label = "Positive"
                elif post["sentiment"] == "negative":
                    polarity = random.uniform(-0.8, -0.1)
                    sentiment_label = "Negative"
                else:
                    polarity = random.uniform(-0.05, 0.05)
                    sentiment_label = "Neutral"
                
                top_posts.append(
                    {
                        "id": f"reddit_{i}_{random.randint(1000, 9999)}",
                        "title": post["title"],
                        "text": post["title"],
                        "url": f"https://reddit.com/r/cryptocurrency/comments/{random.randint(100000, 999999)}",
                        "created_at": created_at.isoformat(),
                        "sentiment_label": sentiment_label,
                        "polarity": polarity,
                    }
                )

            return {
                "data": {
                    "positive": mock_stats["positive"],
                    "neutral": mock_stats["neutral"],
                    "negative": mock_stats["negative"],
                    "avg_score": round(mock_stats["avg_score"], 4),
                    "top_posts": top_posts,
                }
            }

        # ---------- NEWS ----------
                # ---------- NEWS ----------
        elif src == "news":
            q: Dict[str, Any] = {"sentiment.score": {"$exists": True}}
            if coin and coin.upper() != "ALL":
                coin_name = TICKER_TO_FULL_NAME.get(coin.upper(), coin.upper())
                q["$or"] = [
                    {"coin": {"$regex": f"^{coin_name}$", "$options": "i"}},
                    {"coin": {"$regex": f"^{coin.upper()}$", "$options": "i"}},
                    {"coin_tags": {"$in": [coin.upper(), coin_name]}},
                ]

            THRESHOLD = 0.05

            # pull recent docs once
            docs = list(
                news_collection.find(
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
                )
                .sort(
                    [
                        ("published_at", -1),
                        ("scraped_at", -1),
                        ("fetched_at", -1),
                    ]
                )
                .limit(500)
            )

            total = len(docs) or 0
            pos = neg = neu = 0
            scores = []

            for d in docs:
                sent = d.get("sentiment") or {}
                score = sent.get("score", 0.0) or 0.0
                try:
                    score = float(score)
                except Exception:
                    score = 0.0

                scores.append(score)

                if score > THRESHOLD:
                    pos += 1
                elif score < -THRESHOLD:
                    neg += 1
                else:
                    neu += 1

            avg_score = (sum(scores) / total) if total else 0.0

            # build top_posts with a derived label when missing
            top_posts = []
            for d in docs[:top_n]:
                sent = d.get("sentiment") or {}
                score = sent.get("score", 0.0) or 0.0
                try:
                    score_f = float(score)
                except Exception:
                    score_f = 0.0

                label = sent.get("label")
                if not label:
                    if score_f > THRESHOLD:
                        label = "Positive"
                    elif score_f < -THRESHOLD:
                        label = "Negative"
                    else:
                        label = "Neutral"

                created_at = (
                    d.get("published_at")
                    or d.get("scraped_at")
                    or d.get("fetched_at")
                )

                conf = d.get("confidence")
                try:
                    if conf is None:
                        conf = abs(score_f)
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
            overview = await get_sentiment_overview(timeframe=24)
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
