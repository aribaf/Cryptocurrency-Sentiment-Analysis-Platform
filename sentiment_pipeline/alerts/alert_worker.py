# alert_worker.py
import time
from datetime import datetime, timedelta
from bson.objectid import ObjectId

from db import Database
from pymongo import DESCENDING

db = Database()

POLL_INTERVAL = 60  # seconds

# -------------------------
# Helper: pull latest sentiment value depending on source
# -------------------------
def fetch_latest_sentiment_value(coin: str, source: str = "twitter"):
    """
    Return a numeric value used for alert comparisons.
    - twitter: compute avg (positive - negative) from recent tweets / or use sentiment_collection if present
    - news: average news sentiment
    - reddit: average reddit polarity
    - overall: average of available sources
    """
    coin_u = coin.upper()

    def twitter_value():
        # prefer aggregated sentiment_collection if it stores recent aggregate
        s = db.sentiment_collection.find_one({"coin": coin_u}, sort=[("timestamp", DESCENDING)])
        if s and "score" in s:
            return float(s["score"])
        # fallback: average sentiment_score field in recent tweets
        cursor = db.tweets_collection.find({"coin": coin_u}).sort("created_at", DESCENDING).limit(500)
        total = 0.0
        count = 0
        for t in cursor:
            # adapt to your tweet doc fields: sentiment_score or sentiment.score
            s_val = None
            if "sentiment_score" in t:
                s_val = t["sentiment_score"]
            elif "sentiment" in t and isinstance(t["sentiment"], dict) and "score" in t["sentiment"]:
                s_val = t["sentiment"]["score"]
            if s_val is not None:
                total += float(s_val)
                count += 1
        return (total / count) if count else 0.0

    def news_value():
        # average news_collection sentiment.score
        pipeline = [
            {"$match": {"$or": [{"coin": coin_u}, {"coin_tags": coin_u}]}},
            {"$match": {"sentiment.score": {"$exists": True}}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment.score"}}}
        ]
        res = list(db.news_collection.aggregate(pipeline))
        return float(res[0]["avg_score"]) if res else 0.0

    def reddit_value():
        # if you have a reddit collection in db (not in database.py); try a safe attempt
        try:
            rcol = db.client['crypto_reddit_db']['latest_reddit']
            pipeline = [
                {"$match": {"coin": coin_u}},
                {"$group": {"_id": None, "avg_polarity": {"$avg": "$polarity"}}}
            ]
            res = list(rcol.aggregate(pipeline))
            return float(res[0]["avg_polarity"]) if res else 0.0
        except Exception:
            return 0.0

    source = source.lower()
    if source == "twitter":
        return twitter_value()
    if source == "news":
        return news_value()
    if source == "reddit":
        return reddit_value()
    if source == "overall":
        vals = [twitter_value(), news_value(), reddit_value()]
        # average non-zero values
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else 0.0
    return 0.0

# -------------------------
# Condition check
# -------------------------
def check_condition(value: float, operator: str, threshold: float):
    if operator == "<": return value < threshold
    if operator == ">": return value > threshold
    if operator == "<=": return value <= threshold
    if operator == ">=": return value >= threshold
    if operator == "==": return value == threshold
    return False

# -------------------------
# Notify: write history, notifications, and (optionally) push via WS / email
# -------------------------
def notify(alert_doc, value):
    now = datetime.utcnow()
    # 1) record in history
    db.alerts_history_collection.insert_one({
        "alert_id": alert_doc["_id"],
        "user_id": alert_doc["user_id"],
        "fired_at": now,
        "value": value,
        "alert_snapshot": alert_doc
    })
    # 2) update alert last_fired
    db.alerts_collection.update_one({"_id": alert_doc["_id"]}, {"$set": {"last_fired": now}})

    # 3) push in-app notification
    title = f"Alert: {alert_doc.get('name') or alert_doc.get('coin')}"
    message = f"{alert_doc.get('coin')} {alert_doc.get('source')} {alert_doc.get('metric')} {alert_doc.get('operator')} {alert_doc.get('threshold')} (value={round(value,4)})"
    not_doc = {"title": title, "message": message, "link": "/alerts", "created_at": now, "read": False}
    db.notifications_collection.insert_one({"user_id": alert_doc["user_id"], **not_doc})

    # 4) Try to push via WebSocket manager if available
    try:
        # import your project's WS manager if you have one (adjust path)
        from ws_manager import manager  # optional: manager.broadcast_user(user_id, payload)
        payload = {"type": "alert", "title": title, "message": message, "link": "/alerts", "created_at": now.isoformat()}
        manager.send_to_user(alert_doc["user_id"], payload)
    except Exception:
        # no ws manager or fallback, it's okay because in-app notification exists
        pass

    # 5) Optionally send email/SMS by calling your email helper (if configured)
    # from auth import send_alert_email  # implement this helper if you want
    # if "email" in alert_doc.get("channels", []):
    #     send_alert_email(user_id=alert_doc["user_id"], subject=title, body=message)

    print(f"[{now.isoformat()}] Alert fired for user={alert_doc['user_id']} alert={alert_doc.get('name')} value={value}")

# -------------------------
# Main polling loop
# -------------------------
def main_loop(poll_interval=POLL_INTERVAL):
    print("Alert worker started, polling every", poll_interval, "seconds")
    while True:
        try:
            now = datetime.utcnow()
            alerts = list(db.alerts_collection.find({"active": True}))
            for a in alerts:
                # check cooldown
                last = a.get("last_fired")
                cooldown = int(a.get("cooldown_minutes", 60))
                if last:
                    # handle string or datetime
                    if isinstance(last, str):
                        try:
                            last_dt = datetime.fromisoformat(last)
                        except Exception:
                            last_dt = None
                    else:
                        last_dt = last
                    if last_dt and (now - last_dt) < timedelta(minutes=cooldown):
                        continue

                try:
                    val = fetch_latest_sentiment_value(a.get("coin", ""), a.get("source", "twitter"))
                    if check_condition(val, a.get("operator"), float(a.get("threshold"))):
                        notify(a, val)
                except Exception as e:
                    print("Error evaluating alert", a.get("_id"), e)
        except Exception as e:
            print("Worker loop error:", e)
        time.sleep(poll_interval)

if __name__ == "__main__":
    main_loop()
