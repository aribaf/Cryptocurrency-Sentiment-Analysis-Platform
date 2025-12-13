# trend_prediction/trend_worker_multi.py
"""
Worker: trains/predicts for coins, upserts summary into predictions_collection,
inserts per-run docs into trend_history, saves CSV.
"""
import os
import time
import sys
# ensure project root (parent dir) is on sys.path so `db.py` can be imported
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import ProgbarLogger

# --------------------------
# MongoDB: use trend_prediction DB only
# --------------------------
# Import the MongoClient instance from your db.py (keeps twitter_scraper intact)
from db import client

trend_db = client["trend_prediction"]
predictions_collection = trend_db["predictions"]
trend_history_collection = trend_db["history"]

# Create safe indexes (idempotent)
try:
    predictions_collection.create_index("cryptocurrency", unique=True)
    trend_history_collection.create_index([("cryptocurrency", 1), ("generated_at", -1)])
except Exception as _e:
    print("Warning creating trend_prediction indexes:", _e)

# --------------------------
# paths, constants
# --------------------------
DATASET_PATH = os.getenv("TREND_DATASET", os.path.join(PROJECT_ROOT, "dataset", "crypto_sentiment_prediction_dataset.csv"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(PROJECT_ROOT, "outputs"))
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "crypto_trend_predictions_with_accuracy.csv")

COINS = ["Bitcoin", "Ethereum", "Solana"]

GBR_FEATURES = [
    'current_price_usd', 'trading_volume_24h', 'market_cap_usd',
    'social_sentiment_score', 'news_sentiment_score', 'news_impact_score',
    'social_mentions_count', 'fear_greed_index', 'volatility_index',
    'rsi_technical_indicator', 'prediction_confidence'
]
TARGET = 'price_change_24h_percent'


def calculate_accuracy(actual, predicted):
    correct = np.sum(np.sign(actual) == np.sign(predicted))
    return round((correct / len(actual)) * 100, 2) if len(actual) > 0 else 0


def compute_source_scores(coin, hours=24):
    """
    Try to compute twitter/reddit/news avg scores from likely collections.
    Returns (twitter_score, reddit_score, news_score)
    """
    now = datetime.utcnow()
    since = (now - timedelta(hours=hours)).isoformat()

    twitter_score = 0.0
    reddit_score = 0.0
    news_score = 0.0

    # NOTE: use your existing DBs/collections (client lists all DBs)
    # Twitter-like collections (these are in other DBs like twitter_scraper)
    for db_name in client.list_database_names():
        # check expected twitter DB names (fast check — cheaper than scanning every collection)
        if db_name not in ("twitter_scraper", "crypto_tweets_db"):
            continue
        db_obj = client[db_name]
        for col_name in ["latest_tweets", "tweets", "scrappertweets"]:
            if col_name in db_obj.list_collection_names():
                coll = db_obj[col_name]
                try:
                    pipeline = [
                        {"$match": {
                            "coin": {"$in": [coin, coin.title(), coin.upper()]},
                            "sentiment.scores": {"$exists": True},
                            "$or": [
                                {"scraped_at": {"$gte": since}},
                                {"created_at": {"$gte": since}},
                                {"scraped_at": {"$exists": False}}
                            ]
                        }},
                        {"$group": {
                            "_id": None,
                            "avg_pos": {"$avg": "$sentiment.scores.positive"},
                            "avg_neg": {"$avg": "$sentiment.scores.negative"}
                        }},
                        {"$project": {"score": {"$subtract": ["$avg_pos", "$avg_neg"]}, "_id": 0}}
                    ]
                    res = list(coll.aggregate(pipeline))
                    if res:
                        twitter_score = float(res[0].get("score", 0.0))
                        raise StopIteration  # break out of nested loops
                except StopIteration:
                    break
                except Exception:
                    continue

    # Reddit-like (crypto_reddit_db)
    try:
        reddit_db = client.get_database("crypto_reddit_db")
        for col_name in ["latest_reddit", "latest_reddit", "reddit"]:
            if col_name in reddit_db.list_collection_names():
                coll = reddit_db[col_name]
                try:
                    pipeline = [
                        {"$match": {"coin": {"$in": [coin, coin.title(), coin.upper()]}, "created_at": {"$gte": since}}},
                        {"$group": {"_id": None, "avg_polarity": {"$avg": "$polarity"}}},
                        {"$project": {"score": "$avg_polarity", "_id": 0}}
                    ]
                    res = list(coll.aggregate(pipeline))
                    if res:
                        reddit_score = float(res[0].get("score", 0.0))
                        break
                except Exception:
                    continue
    except Exception:
        pass

    # News-like (crypto_news_db)
    try:
        news_db = client.get_database("crypto_news_db")
        for col_name in ["latest_news", "news"]:
            if col_name in news_db.list_collection_names():
                coll = news_db[col_name]
                try:
                    pipeline = [
                        {"$match": {"coin_tags": {"$in": [coin, coin.title(), coin.upper()]}, "sentiment.score": {"$exists": True}}},
                        {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}},
                        {"$project": {"score": "$avg_score", "_id": 0}}
                    ]
                    res = list(coll.aggregate(pipeline))
                    if res:
                        news_score = float(res[0].get("score", 0.0))
                        break
                except Exception:
                    continue
    except Exception:
        pass

    return twitter_score, reddit_score, news_score


def train_and_store():
    # Load dataset
    df = pd.read_csv(DATASET_PATH)
    results = []
    run_time = datetime.utcnow()

    for coin in COINS:
        coin_df = df[df['cryptocurrency'] == coin].copy()
        if coin_df.empty:
            print(f"No data for {coin} — skipping")
            continue

        # GBR
        X = coin_df[GBR_FEATURES]
        y = coin_df[TARGET]
        try:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            gbr = GradientBoostingRegressor(n_estimators=100)
            gbr.fit(X_train, y_train)
            gbr_pred = float(gbr.predict(X.iloc[[-1]])[0])
        except Exception as e:
            print(f"GBR error for {coin}: {e}")
            gbr_pred = 0.0

        # LSTM
        price_series = coin_df['current_price_usd'].values.reshape(-1, 1)
        scaler = MinMaxScaler()
        try:
            scaled_prices = scaler.fit_transform(price_series)
        except Exception:
            scaled_prices = price_series

        def create_sequences(data, time_steps=5):
            Xs, ys = [], []
            for i in range(len(data) - time_steps):
                Xs.append(data[i:i + time_steps])
                ys.append(data[i + time_steps])
            return np.array(Xs), np.array(ys)

        time_steps = 5
        X_seq, y_seq = create_sequences(scaled_prices, time_steps)

        if len(X_seq) < 1:
            lstm_pred = float(scaled_prices[-1][0])
        else:
            try:
                X_train_seq, X_test_seq = X_seq[:-1], X_seq[-1:]
                y_train_seq = y_seq[:-1]
                lstm_model = Sequential()
                lstm_model.add(LSTM(50, activation='relu', input_shape=(time_steps, 1)))
                lstm_model.add(Dense(1))
                lstm_model.compile(optimizer='adam', loss='mse')
                lstm_model.fit(X_train_seq, y_train_seq, epochs=20, verbose=0, callbacks=[ProgbarLogger()])
                lstm_pred_scaled = lstm_model.predict(X_test_seq, verbose=0)
                lstm_pred = float(scaler.inverse_transform(lstm_pred_scaled)[0][0])
            except Exception as e:
                print(f"LSTM error for {coin}: {e}")
                lstm_pred = float(price_series[-1][0])

        current_price = float(coin_df['current_price_usd'].iloc[-1])
        gbr_next_price = current_price + gbr_pred
        avg_pred_price = (gbr_next_price + lstm_pred) / 2.0
        market_trend = "Bullish" if avg_pred_price >= current_price else "Bearish"

        # accuracies
        short_actual = y.iloc[-1:]
        short_pred = np.array([gbr_pred])
        short_acc = calculate_accuracy(short_actual, short_pred)

        mid_actual = y.iloc[-3:]
        mid_pred = gbr.predict(X.iloc[-3:]) if len(X) >= 3 else np.array([gbr_pred])
        mid_acc = calculate_accuracy(mid_actual, mid_pred)

        long_actual = y.iloc[-7:] if len(y) >= 7 else y
        long_pred = gbr.predict(X.iloc[-7:] if len(y) >= 7 else X)
        long_acc = calculate_accuracy(long_actual, long_pred)

        overall_acc = round((short_acc + mid_acc + long_acc) / 3.0, 2)

        twitter_score, reddit_score, news_score = compute_source_scores(coin, hours=24)

        row = {
            "cryptocurrency": coin,
            "current_price": round(current_price, 2),
            "predicted_next_price": round(avg_pred_price, 2),
            "market_trend": market_trend,
            "short_term_acc": f"{short_acc}%",
            "mid_term_acc": f"{mid_acc}%",
            "long_term_acc": f"{long_acc}%",
            "overall_acc": f"{overall_acc}%",
            "confidence": float(overall_acc),
            "twitter_score": float(twitter_score),
            "reddit_score": float(reddit_score),
            "news_score": float(news_score),
            "generated_at": run_time
        }

        results.append(row)

        # Upsert summary (predictions collection in trend_prediction DB)
        try:
            summary_doc = dict(row)
            summary_doc["generated_at"] = run_time.isoformat()
            predictions_collection.update_one({"cryptocurrency": row["cryptocurrency"]}, {"$set": summary_doc}, upsert=True)
        except Exception as e:
            print(f"Mongo upsert error for {coin}: {e}")

        # Insert history (history collection in trend_prediction DB)
        try:
            hist_doc = {
                "cryptocurrency": coin,
                "confidence": float(row["confidence"]),
                "twitter_score": float(row["twitter_score"]),
                "reddit_score": float(row["reddit_score"]),
                "news_score": float(row["news_score"]),
                "predicted_next_price": row["predicted_next_price"],
                "market_trend": row["market_trend"],
                "current_price": row["current_price"],
                "generated_at": run_time
            }
            trend_history_collection.insert_one(hist_doc)
        except Exception as e:
            print(f"Mongo history insert error for {coin}: {e}")

    # Save CSV
    try:
        out_df = pd.DataFrame(results)
        out_df['generated_at'] = out_df['generated_at'].apply(lambda dt: dt.isoformat() if hasattr(dt, "isoformat") else dt)
        out_df.to_csv(OUTPUT_CSV, index=False)
        print(f"Saved CSV → {OUTPUT_CSV}")
    except Exception as e:
        print(f"CSV save error: {e}")

    return results




if __name__ == "__main__":
    REFRESH_INTERVAL = 3600  # 1 hour in seconds
    # For daily use: 86400 (24 hours)

    while True:
        print("Running trend prediction worker...")
        try:
            train_and_store()
        except Exception as e:
            print("Error during worker execution:", e)

        print(f"Sleeping for {REFRESH_INTERVAL} seconds...\n")
        time.sleep(REFRESH_INTERVAL)

