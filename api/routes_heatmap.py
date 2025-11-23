# api/routes_heatmap.py
from fastapi import APIRouter
from datetime import datetime, timedelta

from db import client

router = APIRouter(tags=["heatmap"])

raw_collection = client["crypto_tweets_db"]["latest_tweets"]
TARGET_HASHTAGS = ["BTC", "ETH", "SOLANA"]

@router.get("/sentiment/heatmap", summary="Get multi-coin sentiment data for heatmap visualization")
async def get_sentiment_heatmap(days: int = 30):
    start_date = datetime.now() - timedelta(days=days)

    ticker_list = TARGET_HASHTAGS
    full_names = ["Bitcoin", "Ethereum", "Solana"]
    coin_match_list = list(set(ticker_list + full_names))

    match_stage = {
        "$match": {
            "coin": {"$in": coin_match_list},
            "sentiment.scores": {"$exists": True}
        }
    }

    add_fields_stage = {
        "$addFields": {
            "scraped_at_dt": {
                "$cond": [
                    {"$or": [
                        {"$eq": [{"$type": "$scraped_at"}, "missing"]},
                        {"$eq": [{"$type": "$scraped_at"}, "null"]}
                    ]},
                    {
                        "$cond": [
                            {"$eq": [{"$type": "$created_at"}, "string"]},
                            {"$toDate": "$created_at"},
                            "$created_at"
                        ]
                    },
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

    match_by_date_stage = {
        "$match": {
            "scraped_at_dt": {"$gte": start_date}
        }
    }

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
