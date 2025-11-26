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


from datetime import datetime, timezone

def normalize_created_at(doc):
    raw_created = doc.get("created_at")
    raw_scraped = doc.get("scraped_at")

    def parse_any(raw):
        if not raw:
            return None

        # already a datetime object from Mongo
        if hasattr(raw, "isoformat"):
            dt = raw
        else:
            s = str(raw).strip()
            # 1) try ISO-ish first
            try:
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            except Exception:
                # 2) try Twitter string: "Nov 22, 2025 - 10:00 PM UTC"
                try:
                    dt = datetime.strptime(s, "%b %d, %Y - %I:%M %p %Z")
                except Exception:
                    return None

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        dt = dt.replace(microsecond=0)
        return dt.isoformat().replace("+00:00", "Z")

    # prefer real tweet time; if that fails, use scraped_at
    iso = parse_any(raw_created) or parse_any(raw_scraped)
    return iso



def extract_sentiment(doc):
    sent = doc.get("sentiment") or {}
    scores = sent.get("scores") or {}

    pos = float(scores.get("positive", 0))
    neg = float(scores.get("negative", 0))

    # Proper sentiment score
    score = pos - neg

    if score > 0.05:
        label = "Positive"
    elif score < -0.05:
        label = "Negative"
    else:
        label = "Neutral"

    return label, score


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
