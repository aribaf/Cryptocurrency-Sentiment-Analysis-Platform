# api/routes_twitter.py
from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel

from db import client

TICKER_TO_FULL_NAME = {
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "SOLANA": "Solana",
}

router = APIRouter(tags=["twitter"])

tweet_db = client.get_database("crypto_tweets_db")
raw_collection = tweet_db["latest_tweets"]


class RecentTweet(BaseModel):
  _id: Optional[str] = None
  tweet_id: str
  coin: str
  text: str
  url: str
  created_at: str
  sentiment_label: Optional[str] = "Neutral"
  confidence: Optional[float] = 0.0


from datetime import timezone

def normalize_created_at(doc):
    raw = doc.get("created_at") or doc.get("scraped_at")
    if not raw:
        return ""

    try:
        if hasattr(raw, "isoformat"):  # datetime from Mongo
            dt = raw
        else:
            # raw is already a string; Mongo driver's fromisoformat usually gives datetime,
            # but this keeps it simple
            from datetime import datetime
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        dt = dt.replace(microsecond=0)
        return dt.isoformat().replace("+00:00", "Z")
    except Exception:
        # fallback: just return string
        return str(raw)



def extract_sentiment(doc):
  """
  Sentiment is optional. If missing, return Neutral / 0.0.
  """
  sent = doc.get("sentiment") or {}
  label = sent.get("label") or "Neutral"
  scores = sent.get("scores") or {}
  key = label.lower()
  try:
    conf = float(scores.get(key, 0.0))
  except Exception:
    conf = 0.0
  return label, conf


def base_query(coin: Optional[str] = None):
  """
  Common query:
  - exclude only docs explicitly marked is_irrelevant == True
  - allow missing is_irrelevant
  - optional coin filter (ticker or full name)
  """
  q: dict = {
    "$or": [
      {"is_irrelevant": {"$exists": False}},
      {"is_irrelevant": False},
    ]
  }

  if coin and coin != "ALL":
    coin_match = TICKER_TO_FULL_NAME.get(coin, coin)
    q["coin"] = {"$in": [coin_match, coin]}

  return q


@router.get("/recent", summary="Get recent tweets/sentiments")
async def get_recent_sentiments(limit: int = 30):
  q = base_query()

  tweets = list(
    raw_collection.find(
      q,
      {
        "_id": 1,
        "tweet_id": 1,
        "coin": 1,
        "text": 1,
        "url": 1,
        "created_at": 1,
        "scraped_at": 1,
        "sentiment": 1,
      },
    )
    .sort("scraped_at", -1)  # newest first
    .limit(limit)
  )

  formatted_tweets = []
  for tweet in tweets:
    label, confidence_score = extract_sentiment(tweet)
    created_at = normalize_created_at(tweet)

    formatted_tweets.append(
      RecentTweet(
        _id=str(tweet.get("_id", "")),
        tweet_id=tweet.get("tweet_id", ""),
        coin=tweet.get("coin", ""),
        text=tweet.get("text", ""),
        url=tweet.get("url", ""),
        created_at=created_at,
        sentiment_label=label,
        confidence=confidence_score,
      )
    )

  return {"data": formatted_tweets}


@router.get(
  "/sentiment/twitter",
  summary="Get recent tweets (for RecentList + dashboards)",
)
async def get_recent_twitter(limit: int = 20, coin: Optional[str] = None):
  try:
    q = base_query(coin)

    tweets = list(
      raw_collection.find(
        q,
        {
          "_id": 0,
          "tweet_id": 1,
          "coin": 1,
          "text": 1,
          "url": 1,
          "created_at": 1,
          "scraped_at": 1,
          "sentiment": 1,
        },
      )
      .sort("scraped_at", -1)
      .limit(limit)
    )

    formatted_tweets = []
    for tweet in tweets:
      label, confidence_score = extract_sentiment(tweet)
      created_at = normalize_created_at(tweet)

      formatted_tweets.append(
        {
          "id": tweet.get("tweet_id", ""),
          "title": tweet.get("text", ""),
          "text": tweet.get("text", ""),
          "coin": tweet.get("coin", ""),
          "url": tweet.get("url", ""),
          "created_at": created_at,
          "sentiment_label": label,
          "confidence": float(confidence_score),
          "source": "twitter",
        }
      )

    return {"data": formatted_tweets}

  except Exception as e:
    print(f"Twitter fetch error: {e}")
    return {"data": []}
