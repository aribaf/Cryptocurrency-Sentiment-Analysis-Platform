# realtime_predictor.py
"""
Load (or train) models, prepare features from live inputs (price + DB sentiment),
and produce predictions for a single coin.
Saves/loads models to/from trend_prediction/models/.
"""
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
import sys
import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping

# --- robust db import (do not crash at import time) ---
try:
    from db import client
except Exception as e:
    client = None
    print("Warning: realtime_predictor could not import db.client:", e)

# Use paths relative to this file so running from other cwd still works
BASE_DIR = os.path.dirname(os.path.abspath(__file__))             # trend_prediction/
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# robust dataset path resolution (put this after BASE_DIR)
ENV_PATH = os.getenv("TREND_DATASET")
if ENV_PATH:
    DATASET_PATH = ENV_PATH
else:
    # 1) expected: trend_prediction/dataset/...
    p1 = os.path.join(BASE_DIR, "dataset", "crypto_sentiment_prediction_dataset.csv")
    # 2) fallback: project root's dataset (../dataset/...) in case dataset is stored at scrapper/dataset
    p2 = os.path.join(os.path.dirname(BASE_DIR), "dataset", "crypto_sentiment_prediction_dataset.csv")
    # choose the first that exists
    if os.path.exists(p1):
        DATASET_PATH = p1
    elif os.path.exists(p2):
        DATASET_PATH = p2
    else:
        DATASET_PATH = p1  # keep the default (will raise FileNotFound if absent)
# debug print
print(f"[realtime_predictor] using DATASET_PATH={DATASET_PATH} exists={os.path.exists(DATASET_PATH)}")


COINS = ["Bitcoin", "Ethereum", "Solana"]

GBR_FEATURES = [
    'current_price_usd', 'trading_volume_24h', 'market_cap_usd',
    'social_sentiment_score', 'news_sentiment_score', 'news_impact_score',
    'social_mentions_count', 'fear_greed_index', 'volatility_index',
    'rsi_technical_indicator', 'prediction_confidence'
]
TARGET = 'price_change_24h_percent'


# ---------- model file helpers ----------
def _gbr_path(coin):
    return os.path.join(MODELS_DIR, f"gbr_{coin}.pkl")

def _lstm_path(coin):
    return os.path.join(MODELS_DIR, f"lstm_{coin}.h5")

def _lstm_scaler_path(coin):
    return os.path.join(MODELS_DIR, f"lstm_scaler_{coin}.pkl")


def load_gbr_model(coin):
    p = _gbr_path(coin)
    if os.path.exists(p):
        try:
            return joblib.load(p)
        except Exception as e:
            print(f"Warning: could not load GBR model for {coin}: {e}")
            return None
    return None


def save_gbr_model(coin, model):
    joblib.dump(model, _gbr_path(coin))


def load_lstm_model(coin):
    mpath = _lstm_path(coin)
    spath = _lstm_scaler_path(coin)
    if os.path.exists(mpath):
        scaler = None
        if os.path.exists(spath):
            try:
                scaler = joblib.load(spath)
            except Exception:
                scaler = None
        try:
            model = load_model(mpath)
            return model, scaler
        except Exception as e:
            print(f"Warning: could not load LSTM model for {coin}: {e}")
            return None, scaler
    return None, None


def save_lstm_model(coin, model, scaler):
    try:
        model.save(_lstm_path(coin))
    except Exception as e:
        # if model is a placeholder or fails to save, still try to save scaler
        print(f"Warning saving LSTM model for {coin}: {e}")
    try:
        if scaler is not None:
            joblib.dump(scaler, _lstm_scaler_path(coin))
    except Exception as e:
        print(f"Warning saving LSTM scaler for {coin}: {e}")


# ---------- training fallback ----------
def train_models_from_csv(coin):
    """Train gbr + small lstm on CSV fallback. Returns (gbr, lstm_model, scaler)."""
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError("Dataset not found for training: " + DATASET_PATH)

    df = pd.read_csv(DATASET_PATH)
    coin_df = df[df['cryptocurrency'] == coin].copy()
    if coin_df.empty:
        raise ValueError("No data for coin: " + coin)

    # ---------- GBR ----------
    X = coin_df[GBR_FEATURES].fillna(0)
    y = coin_df[TARGET].fillna(0)
    gbr = GradientBoostingRegressor(n_estimators=100)
    try:
        gbr.fit(X, y)
    except Exception as e:
        print(f"GBR training fallback for {coin}: {e}")
        gbr.fit(X.values, y.values)
    save_gbr_model(coin, gbr)

    # ---------- LSTM ----------
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
        # not enough data — return gbr and None lstm, but still save scaler
        try:
            joblib.dump(scaler, _lstm_scaler_path(coin))
        except Exception:
            pass
        return gbr, None, scaler

    lstm_model = Sequential()
    lstm_model.add(LSTM(50, activation='relu', input_shape=(time_steps, 1)))
    lstm_model.add(Dense(1))
    lstm_model.compile(optimizer='adam', loss='mse')
    es = EarlyStopping(monitor='loss', patience=3, restore_best_weights=True, verbose=0)
    lstm_model.fit(X_seq, y_seq, epochs=20, batch_size=8, verbose=0, callbacks=[es])
    save_lstm_model(coin, lstm_model, scaler)

    return gbr, lstm_model, scaler


# ---------- loader used by worker ----------
def load_or_train_models(coin):
    """Load existing models, or train from CSV if missing. Returns (gbr, lstm, scaler)."""
    gbr = load_gbr_model(coin)
    lstm, scaler = load_lstm_model(coin)

    if gbr is not None and (lstm is not None and scaler is not None):
        return gbr, lstm, scaler

    # otherwise train (can be slow once)
    print(f"[realtime_predictor] training models for {coin} from CSV fallback (this may take a while)...")
    gbr, lstm, scaler = train_models_from_csv(coin)
    return gbr, lstm, scaler


# ---------- DB sentiment sampling ----------
def sample_sentiment_from_db(coin, hours=24):
    """Aggregate simple twitter/reddit/news sentiment scores from DBs. defensive when client is missing."""
    twitter_score = 0.0
    reddit_score = 0.0
    news_score = 0.0

    if client is None:
        return twitter_score, reddit_score, news_score

    now = datetime.utcnow()
    since = (now - timedelta(hours=hours)).isoformat()

    # Twitter-like
    try:
        for db_name in ("crypto_tweets_db", "twitter_scraper"):
            if db_name in client.list_database_names():
                db_obj = client[db_name]
                for col in ("latest_tweets", "scrappertweets", "tweets"):
                    if col in db_obj.list_collection_names():
                        coll = db_obj[col]
                        try:
                            pipeline = [
                                {"$match": {"coin": {"$in": [coin, coin.title(), coin.upper()]},
                                            "sentiment.scores": {"$exists": True},
                                            "scraped_at": {"$gte": since}}},
                                {"$group": {"_id": None, "avg_pos": {"$avg": "$sentiment.scores.positive"},
                                            "avg_neg": {"$avg": "$sentiment.scores.negative"}}},
                                {"$project": {"score": {"$subtract": ["$avg_pos", "$avg_neg"]}, "_id": 0}}
                            ]
                            res = list(coll.aggregate(pipeline))
                            if res:
                                twitter_score = float(res[0].get("score", 0.0))
                                raise StopIteration
                        except StopIteration:
                            break
                        except Exception:
                            continue
    except Exception:
        pass

    # Reddit-like
    try:
        if "crypto_reddit_db" in client.list_database_names():
            rdb = client.get_database("crypto_reddit_db")
            for col in ("latest_reddit", "reddit"):
                if col in rdb.list_collection_names():
                    try:
                        coll = rdb[col]
                        pipeline = [
                            {"$match": {"coin": {"$in": [coin, coin.title(), coin.upper()]},
                                        "created_at": {"$gte": since}}},
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

    # News-like
    try:
        if "crypto_news_db" in client.list_database_names():
            ndb = client.get_database("crypto_news_db")
            for col in ("latest_news", "news"):
                if col in ndb.list_collection_names():
                    try:
                        coll = ndb[col]
                        pipeline = [
                            {"$match": {"coin_tags": {"$in": [coin, coin.title(), coin.upper()]},
                                        "sentiment.score": {"$exists": True}}},
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


# ---------- feature build & prediction ----------
def prepare_gbr_features(live_price, extra_features=None):
    """
    Build a single-row feature vector for GBR.
    `extra_features` is a dict with keys matching GBR_FEATURES (best-effort).
    Missing values become 0.
    """
    fv = []
    ef = extra_features or {}
    for k in GBR_FEATURES:
        if k == 'current_price_usd':
            fv.append(float(live_price or 0.0))
        else:
            fv.append(float(ef.get(k, 0.0)))
    return np.array(fv).reshape(1, -1)


def predict_once(coin, gbr, lstm, scaler, live_price, extra_features=None):
    """
    Make one prediction for `coin` using provided models.
    Returns dict with predicted_next_price, current_price, trend, confidence placeholder, and source scores.
    """
    twitter_score, reddit_score, news_score = sample_sentiment_from_db(coin, hours=24)
    extra_features = extra_features or {}

    # GBR predicts percent-change (original code used percent as additive; we do multiplicative)
    pred_pct = 0.0
    if gbr is not None:
        try:
            feat = prepare_gbr_features(live_price, extra_features)
            pred_pct = float(gbr.predict(feat)[0])
        except Exception:
            pred_pct = 0.0

    # Interpret pred_pct as percent change -> convert multiplicatively
    try:
        gbr_next_price = float(live_price) * (1.0 + (pred_pct / 100.0))
    except Exception:
        gbr_next_price = float(live_price)

    # LSTM: use last N price points provided in extra_features['recent_prices'] (list)
    lstm_price = float(live_price)
    if lstm is not None and scaler is not None:
        recent = extra_features.get("recent_prices", []) if extra_features else []
        try:
            if recent and len(recent) >= 5:
                arr = np.array(recent[-5:]).reshape(-1, 1)
                scaled = scaler.transform(arr)
                X_seq = scaled.reshape(1, scaled.shape[0], 1)
                scaled_pred = lstm.predict(X_seq, verbose=0)
                lstm_price = float(scaler.inverse_transform(scaled_pred)[0][0])
        except Exception:
            lstm_price = float(live_price)

    # ensemble average
    final_price = (gbr_next_price + lstm_price) / 2.0

    trend = "Bullish" if final_price >= float(live_price) else "Bearish"

    # confidence: simple function of abs(pred_pct) and sentiment magnitude (placeholder)
    confidence = min(max(abs(pred_pct) + (abs(twitter_score) + abs(reddit_score) + abs(news_score)) * 10, 0), 100)

    return {
        "cryptocurrency": coin,
        "current_price": round(float(live_price), 6),
        "predicted_next_price": round(final_price, 6),
        "market_trend": trend,
        "confidence": round(float(confidence), 2),
        "twitter_score": round(float(twitter_score), 6),
        "reddit_score": round(float(reddit_score), 6),
        "news_score": round(float(news_score), 6),
        "generated_at": datetime.utcnow()
    }
