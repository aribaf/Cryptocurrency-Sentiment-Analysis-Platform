# trend_prediction/backfill_trend_history.py
import os
import sys
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pandas as pd
from datetime import datetime
from db import db  # your db.py
trend_history_collection = db.get_collection("history")

CSV_DIR = os.getenv("BACKFILL_CSV_DIR", os.path.join(PROJECT_ROOT, "outputs"))

def parse_generated_at(val):
    if pd.isna(val): return None
    if isinstance(val, datetime): return val
    try:
        return datetime.fromisoformat(str(val))
    except Exception:
        try:
            return pd.to_datetime(val)
        except Exception:
            return None

def backfill():
    inserted = 0
    if not os.path.exists(CSV_DIR):
        print("CSV_DIR does not exist:", CSV_DIR)
        return
    csv_files = [os.path.join(CSV_DIR, f) for f in os.listdir(CSV_DIR) if f.lower().endswith(".csv")]
    for path in csv_files:
        print("Processing:", path)
        df = pd.read_csv(path)
        for _, r in df.iterrows():
            coin = r.get("cryptocurrency") or r.get("Cryptocurrency") or r.get("coin")
            if not coin:
                continue
            gen_raw = r.get("generated_at") or r.get("generatedAt") or r.get("generated")
            gen_dt = parse_generated_at(gen_raw) or datetime.utcnow()
            exists = trend_history_collection.find_one({"cryptocurrency": coin, "generated_at": gen_dt})
            if exists:
                continue
            doc = {
                "cryptocurrency": coin,
                "confidence": float(r.get("confidence") or r.get("overall_acc") or 0),
                "twitter_score": float(r.get("twitter_score") or 0),
                "reddit_score": float(r.get("reddit_score") or 0),
                "news_score": float(r.get("news_score") or 0),
                "predicted_next_price": float(r.get("predicted_next_price") or r.get("predicted_price") or 0),
                "market_trend": r.get("market_trend") or r.get("trend") or None,
                "current_price": float(r.get("current_price") or 0),
                "generated_at": gen_dt
            }
            try:
                trend_history_collection.insert_one(doc)
                inserted += 1
            except Exception as e:
                print("Insert error:", e)
    print(f"Inserted {inserted} history docs.")

if __name__ == "__main__":
    backfill()
