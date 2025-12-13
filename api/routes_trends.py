# api/routes_trends.py
from fastapi import APIRouter, HTTPException, Query
import os
from fastapi.responses import FileResponse
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

from db import client

router = APIRouter(tags=["trends"])

# Collections for predicted trends (pre-generated)
trend_db = client["trend_prediction"]
predictions_collection = trend_db["predictions"]
trend_history_collection = trend_db["history"]

# Collections used by live multi-source trend aggregation
tweet_db = client["crypto_tweets_db"]
twitter_collection = tweet_db["latest_tweets"]
reddit_collection = client["crypto_reddit_db"]["latest_reddit"]

# <-- UPDATED: use 'articles' collection produced by the scraper -->
news_collection = client["crypto_news_db"]["articles"]

CSV_PATH = os.getenv(
    "OUTPUT_CSV",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "outputs",
        "crypto_trend_predictions_with_accuracy.csv",
    )
)


# -----------------------
# Predicted / pre-generated endpoints (unchanged)
# -----------------------
@router.get("/trends", summary="Get pre-generated trend predictions")
async def get_all_trends():
    try:
        docs = list(predictions_collection.find({}, {"_id":0}))
        if docs:
            return {"data": docs}
        if os.path.exists(CSV_PATH):
            import pandas as pd
            df = pd.read_csv(CSV_PATH)
            return {"data": df.to_dict(orient="records")}
        return {"data": []}
    except Exception as e:
        print("/api/trends error:", e)
        return {"data": []}

@router.get("/trends/predicted/{coin}", summary="Get predicted trend summary for a coin (from predictions DB or CSV)")
async def get_trend_for_coin_predicted(coin: str):
    try:
        doc = predictions_collection.find_one({"cryptocurrency": {"$regex": f"^{coin}$", "$options": "i"}}, {"_id":0})
        if doc:
            return {"data": doc}
        if os.path.exists(CSV_PATH):
            import pandas as pd
            df = pd.read_csv(CSV_PATH)
            match = df[df['cryptocurrency'].str.lower() == coin.lower()]
            if not match.empty:
                return {"data": match.to_dict(orient="records")[0]}
        raise HTTPException(status_code=404, detail=f"No trend found for {coin}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"/api/trends/predicted/{coin} error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/trends/download/csv", summary="Download the latest trends CSV")
async def download_trends_csv():
    if os.path.exists(CSV_PATH):
        return FileResponse(CSV_PATH, media_type="text/csv", filename=os.path.basename(CSV_PATH))
    raise HTTPException(status_code=404, detail="CSV not found")

@router.get("/trends/predicted/{coin}/history", summary="Get predicted trend history for a coin")
@router.get("/trends/{coin}/history", summary="Get predicted trend history for a coin (compat)") # 👈 ADD THIS LINE
async def get_trend_history_predicted(coin: str, days: int = Query(90, ge=1, le=365)):
    try:
        end = datetime.utcnow()
        start = end - timedelta(days=days)
        cursor = trend_history_collection.find(
            {"cryptocurrency": {"$regex": f"^{coin}$", "$options": "i"}, "generated_at": {"$gte": start}},
            {"_id":0}
        ).sort("generated_at", 1)
        docs = []
        for d in cursor:
            ga = d.get("generated_at")
            if hasattr(ga, "isoformat"):
                d["generated_at"] = ga.isoformat()
            docs.append(d)
        return {"data": docs}
    except Exception as e:
        print("history fetch error:", e)
        raise HTTPException(status_code=500, detail="Could not fetch history")

# -----------------------
# Live multi-source aggregation endpoints
# -----------------------
@router.get("/trends/live/{coin}", summary="Get multi-source sentiment trends (Twitter, Reddit, News, Overall)")
async def get_coin_trends_live(coin: str, unit: str = "day"):
    """
    Returns a time-bucketed combined trend for a coin from Twitter, Reddit and News.
    unit: "day" | "week" | "hour"
    """
    # Determine lookback window for unit
    if unit == "day":
        days_lookback = 30
    elif unit == "week":
        days_lookback = 90
    else:
        days_lookback = 7

    start_date = datetime.utcnow() - timedelta(days=days_lookback)
    # Use ISO string comparable to stored scraped_at/fetched_at/published_at
    start_date_str = start_date.strftime('%Y-%m-%dT%H:%M:%S.000000')

    # --- Twitter aggregation ---
    coin_map = {
        "BTC": ["Bitcoin", "BTC"],
        "ETH": ["Ethereum", "ETH"],
        "SOLANA": ["Solana", "SOLANA"]
    }

    twitter_coin_match = coin_map.get(coin, [coin])
    # DB stores various formats; callers may pass ticker or name
    twitter_pipeline = [
        {"$match": {
            "coin": {"$in": twitter_coin_match},
            "sentiment.scores": {"$exists": True},
            "scraped_at": {"$gte": start_date_str}
        }},
        {"$addFields": {
            "scraped_at_date": {
                "$toDate": {"$ifNull": ["$scraped_at", "$created_at"]}
            }
        }},
        {"$group": {
            "_id": {"$dateTrunc": {"date": "$scraped_at_date", "unit": unit}},
            "twitter_score": {
                "$avg": {"$subtract": ["$sentiment.scores.positive", "$sentiment.scores.negative"]}
            },
        }},
        {"$sort": {"_id": 1}},
    ]
    try:
        twitter_results = list(twitter_collection.aggregate(twitter_pipeline))
        twitter_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["twitter_score"] for r in twitter_results if "_id" in r}
    except Exception as e:
        print("twitter aggregation error:", e)
        twitter_data = {}

    # --- Reddit aggregation ---
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
    try:
        reddit_results = list(reddit_collection.aggregate(reddit_pipeline))
        reddit_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["reddit_score"] for r in reddit_results if "_id" in r and r["_id"] is not None}
    except Exception as e:
        print("reddit aggregation error:", e)
        reddit_data = {}

    # --- News aggregation ---
    # Updated to match scraper output: support single 'coin' field OR 'coin_tags' array,
    # and accept any of published_at / fetched_at / scraped_at as the date field.
    news_pipeline = [
        {"$match": {
    "sentiment.score": {"$exists": True},
    "$and": [
        {
            "$or": [
                {"coin": {"$regex": f"^{coin}$", "$options": "i"}},
                {"coin_tags": {"$in": [coin]}}
            ]
        },
        {
            "$or": [
                {"published_at": {"$gte": start_date_str}},
                {"fetched_at": {"$gte": start_date_str}},
                {"scraped_at": {"$gte": start_date_str}}
            ]
        }
    ]
}},

        # create a date field for grouping picking the first available date
        {"$addFields": {
            "news_date_iso": {
                "$switch": {
                    "branches": [
                        {"case": {"$gt": [{"$ifNull": ["$published_at", None]}, None]}, "then": {"$toDate": "$published_at"}},
                        {"case": {"$gt": [{"$ifNull": ["$fetched_at", None]}, None]}, "then": {"$toDate": "$fetched_at"}},
                        {"case": {"$gt": [{"$ifNull": ["$scraped_at", None]}, None]}, "then": {"$toDate": "$scraped_at"}},
                    ],
                    "default": None
                }
            }
        }},
        # filter out docs where news_date_iso is null or before cutoff (robustness)
        {"$match": {"news_date_iso": {"$gte": {"$toDate": start_date_str}}}},
        {"$group": {
            "_id": {"$dateTrunc": {"date": "$news_date_iso", "unit": unit}},
            "news_score": {"$avg": "$sentiment.score"},
        }},
        {"$sort": {"_id": 1}},
    ]
    try:
        news_results = list(news_collection.aggregate(news_pipeline))
        news_data = {r["_id"].isoformat().replace('+00:00', 'Z'): r["news_score"] for r in news_results if "_id" in r}
    except Exception as e:
        print("news aggregation error:", e)
        news_data = {}

    # Merge timestamps
    all_timestamps = sorted(set(twitter_data.keys()) | set(reddit_data.keys()) | set(news_data.keys()))
    if not all_timestamps:
        return {"data": []}

    start_dt = datetime.fromisoformat(all_timestamps[0].replace('Z', '+00:00'))
    end_dt = datetime.utcnow().replace(microsecond=0)

    if unit in ("day", "week"):
        step = timedelta(days=1)
    else:
        step = timedelta(hours=1)

    combined = []
    current_dt = start_dt
    while current_dt <= end_dt:
        bucket_key = current_dt.isoformat().replace('+00:00', 'Z')
        tw = twitter_data.get(bucket_key, 0)
        rd = reddit_data.get(bucket_key, 0)
        nw = news_data.get(bucket_key, 0)

        valid_scores = [s for s in [tw, rd, nw] if s != 0]
        # remove None values safely
        clean_scores = [s for s in valid_scores if isinstance(s, (int, float))]

        overall = sum(clean_scores) / len(clean_scores) if clean_scores else 0

        combined.append({
            "time_bucket": bucket_key,
            "twitter": tw,
            "reddit": rd,
            "news": nw,
            "overall": overall
        })

        current_dt += step

        if (unit in ("day", "week")) and current_dt.date() > end_dt.date():
            break
        elif unit == "hour" and current_dt > end_dt:
            break

    return {"data": combined}

@router.get("/trends/{coin}", summary="Get multi-source sentiment trends (compat)")
async def get_trend_compat(coin: str, unit: str = "day"):
    return await get_coin_trends_live(coin, unit)


from fastapi.responses import StreamingResponse   # keep this import at top

@router.get("/trends/download/{coin}.csv", summary="Download trend predictions CSV for a specific coin")
async def download_trends_csv_by_coin(coin: str):
    import io
    import pandas as pd

    # Check predictions collection first
    docs = list(
        predictions_collection.find(
            {"cryptocurrency": {"$regex": f"^{coin}$", "$options": "i"}},
            {"_id": 0},
        )
    )

    if not docs and os.path.exists(CSV_PATH):
        # Fallback to reading the main CSV and filtering
        try:
            df_all = pd.read_csv(CSV_PATH)
            df_filtered = df_all[
                df_all["cryptocurrency"].str.lower() == coin.lower()
            ]
            if not df_filtered.empty:
                docs = df_filtered.to_dict(orient="records")
        except Exception as e:
            print(f"Error reading/filtering main CSV for {coin}: {e}")

    if not docs:
        raise HTTPException(
            status_code=404,
            detail=f"Trend prediction data not found for {coin}",
        )

    df = pd.DataFrame(docs)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{coin.lower()}_trend_predictions.csv"'
        },
    )