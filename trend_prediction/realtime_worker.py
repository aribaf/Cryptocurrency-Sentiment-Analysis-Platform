# realtime_worker.py
"""
Background async worker that:
- Loads or trains models for each coin (once)
- Polls live price API (CoinGecko) every INTERVAL seconds
- Calls realtime_predictor.predict_once
- Upserts to trend_prediction.predictions and inserts to trend_prediction.history
- Optionally notifies in-memory list for WebSocket readers (we use DB as source of truth)
"""
import sys
import os
from sentiment_pipeline.alerts.alert_evaluator import evaluate_all

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import os
import asyncio
import time
import requests
from datetime import datetime
from db import client
from realtime_predictor import load_or_train_models, predict_once

INTERVAL = int(os.getenv("REALTIME_INTERVAL", "30"))  # seconds

trend_db = client["trend_prediction"]
predictions_collection = trend_db["predictions"]
trend_history_collection = trend_db["history"]

# hold models in memory
MODEL_STORE = {}

COIN_ID_MAP = {
    "Bitcoin": "bitcoin",
    "Ethereum": "ethereum",
    "Solana": "solana"
}

def get_live_price_coingecko(coin_id):
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
        r = requests.get(url, timeout=8)
        j = r.json()
        return float(j[coin_id]["usd"])
    except Exception:
        return None

async def ensure_models_loaded():
    for coin in MODEL_STORE.keys() or []:
        pass
    # load for each COIN
    from realtime_predictor import COINS
    for coin in COINS:
        if coin in MODEL_STORE:
            continue
        try:
            gbr, lstm, scaler = load_or_train_models(coin)
            MODEL_STORE[coin] = {"gbr": gbr, "lstm": lstm, "scaler": scaler}
            print(f"[realtime_worker] loaded models for {coin}")
        except Exception as e:
            print(f"[realtime_worker] model load/train failed for {coin}: {e}")
            MODEL_STORE[coin] = {"gbr": None, "lstm": None, "scaler": None}

async def worker_loop():
    # pre-load models (may train if missing)
    await ensure_models_loaded()
    print("[realtime_worker] starting loop, interval:", INTERVAL, "seconds")
    while True:
        start = datetime.utcnow()
        for coin, cgk_id in COIN_ID_MAP.items():
            # get live price
            price = get_live_price_coingecko(cgk_id)
            if price is None:
                print(f"[realtime_worker] could not fetch price for {coin}")
                continue

            # build extra_features: recent prices for LSTM
            # we fetch last 10 prices from history collection if available, otherwise repeat current
            recent_prices = []
            try:
                # trend_history may include price points saved by this worker earlier
                cursor = trend_history_collection.find({"cryptocurrency": coin}).sort("generated_at", -1).limit(10)
                recent = [d.get("current_price", price) for d in cursor]
                recent_prices = list(reversed(recent)) if recent else [price]*5
            except Exception:
                recent_prices = [price]*5

            models = MODEL_STORE.get(coin, {"gbr": None, "lstm": None, "scaler": None})
            rec_features = {"recent_prices": recent_prices}
            try:
                pred_doc = predict_once(coin, models["gbr"], models["lstm"], models["scaler"], price, extra_features=rec_features)
                # set generated_at iso string for storage
                store_doc = dict(pred_doc)
                store_doc["generated_at"] = store_doc["generated_at"] if isinstance(store_doc["generated_at"], str) else store_doc["generated_at"].isoformat()
                # upsert latest
                predictions_collection.update_one({"cryptocurrency": coin}, {"$set": store_doc}, upsert=True)
                # insert history (with datetime object)
                hist_doc = dict(pred_doc)
                trend_history_collection.insert_one(hist_doc)
                print(f"[realtime_worker] saved prediction for {coin} at {store_doc['generated_at']}")
            except Exception as e:
                print(f"[realtime_worker] prediction error for {coin}: {e}")
            try:
                results = evaluate_all()
                print("[alerts] evaluated:", results)
            except Exception as e:
                print("[alerts] evaluation error:", e)
        elapsed = (datetime.utcnow() - start).total_seconds()
        to_sleep = max(1, INTERVAL - elapsed)
        await asyncio.sleep(to_sleep)


# Helper to run the loop as a background task in an asyncio event loop
def start_background_loop(loop):
    asyncio.set_event_loop(loop)
    loop.run_until_complete(worker_loop())


# If you want to run stand-alone
if __name__ == "__main__":
    LOOP = asyncio.new_event_loop()
    try:
        LOOP.run_until_complete(ensure_models_loaded())
        LOOP.run_until_complete(worker_loop())
    except KeyboardInterrupt:
        print("stopping realtime worker")
