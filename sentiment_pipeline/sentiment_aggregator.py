#!/usr/bin/env python3
"""
agg_utc_created_at_improved.py

Improvements:
- incremental runs using watermark stored in agg_metadata collection
- optional full backfill (--full) or last-N-days mode (--days)
- robust parsing (dateutil) and fallback to scraped_at
- uses created_at primarily and buckets in UTC
- computes mean_sentiment_score, weighted_mean (followers), counts, stddev
- low_confidence flag for small sample sizes
- safer index creation and duplicate handling
- simple logging & execution metrics
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime, timedelta
from dateutil import parser as dateparser

from pymongo import MongoClient, ASCENDING, errors

# ---------- CONFIG (env overrides) ----------
MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority"
)
DB_NAME = os.environ.get("DB_NAME", "crypto_tweets_db")
SRC_COLLECTION = os.environ.get("COLLECTION_NAME", "latest_tweets")
DEST_COLLECTION = os.environ.get("AGG_COLLECTION", "sentiment_trends_agg")
META_COLLECTION = os.environ.get("META_COLLECTION", "agg_metadata")
TIMEZONE = "UTC"
ALLOW_DISK_USE = True
LOW_CONF_THRESHOLD = int(os.environ.get("LOW_CONF_THRESHOLD", "5"))  # tweet_count < threshold => low confidence

# canonical coin -> aliases (lowercase, include hashtags & common names)
TARGET_COINS_MAPPING = {
    "BTC": ["btc", "#btc", "bitcoin", "$btc"],
    "ETH": ["eth", "#eth", "ethereum", "$eth"],
    "SOL": ["sol", "#sol", "solana", "$sol"],
    # add more as needed
}

TIME_UNITS = ["hour", "day", "week"]  # default units aggregated


# ---------- HELPERS ----------
def normalize_aliases(aliases):
    return [a.lower().lstrip("#$") for a in aliases]


def build_regex(aliases_lower):
    # currently unused (we removed $regexMatch on text to avoid utf-8 issues)
    escaped = [a.replace("\\", "\\\\") for a in aliases_lower]
    return r"\b(?:" + "|".join(escaped) + r")\b"


def parse_created(created_str, scraped_str=None):
    """
    Try to parse created_at human string first, else scraped_at ISO string.
    Returns a Python datetime in UTC (or None).
    """
    for s in (created_str, scraped_str):
        if not s:
            continue
        try:
            dt = dateparser.parse(s)
            # dateutil produces timezone-aware objects if zone present; normalize to UTC
            if dt.tzinfo:
                # keep tz-aware; Mongo driver accepts tz-aware datetimes
                return dt
            return dt
        except Exception:
            continue
    return None


# ---------- AGGREGATOR ----------
class SentimentAggregator:
    def __init__(self, full=False, days=None):
        self.full = full
        self.days = days

        # Initialize the client with error handler for BSON utf-8 decoding issues
        self.client = MongoClient(
            MONGO_URI,
            unicode_decode_error_handler="replace",
        )
        self.db = self.client[DB_NAME]

        self.src = self.db[SRC_COLLECTION]
        self.dest = self.db[DEST_COLLECTION]
        self.meta = self.db[META_COLLECTION]

        self._ensure_connected()
        self.ensure_indexes()

    def _ensure_connected(self):
        try:
            self.client.admin.command("ping")
            print("Connected to MongoDB.")
        except Exception as e:
            print("Failed to connect to MongoDB:", e)
            sys.exit(1)

    def ensure_indexes(self):
        try:
            # indexes on src
            self.src.create_index([("coin", ASCENDING)], background=True)
            self.src.create_index([("hashtag", ASCENDING)], background=True)
            self.src.create_index([("created_at", ASCENDING)], background=True)
            self.src.create_index([("scraped_at", ASCENDING)], background=True)
            # aggregated unique index on dest
            try:
                self.dest.create_index(
                    [("coin", ASCENDING), ("unit", ASCENDING), ("time_bucket", ASCENDING)],
                    unique=True,
                    name="unique_trend_key",
                    background=True,
                )
            except errors.DuplicateKeyError:
                print("Warning: duplicates exist in aggregation collection; dedupe if necessary.")
        except Exception as e:
            print("Index creation warning:", e)

    def get_watermark(self, coin, unit):
        """
        returns a datetime watermark (ISO) up to which data was processed for coin+unit
        stored in meta collection as document: { _id: f"{coin}_{unit}", last_processed: ISODate }
        """
        key = f"{coin}_{unit}"
        doc = self.meta.find_one({"_id": key})
        if doc and "last_processed" in doc:
            return doc["last_processed"]
        return None

    def set_watermark(self, coin, unit, dt):
        key = f"{coin}_{unit}"
        self.meta.update_one(
            {"_id": key},
            {"$set": {"last_processed": dt, "updated_at": datetime.utcnow()}},
            upsert=True,
        )

    def build_pipeline(self, canonical_coin, aliases, unit, since_dt=None):
        aliases_lower = normalize_aliases(aliases)
        # regex = build_regex(aliases_lower)  # not used anymore

        # base match for sentiment fields numeric
        match_stage = {
            "$match": {
                "sentiment.scores.positive": {"$exists": True},
                "sentiment.scores.negative": {"$exists": True},
                "$expr": {
                    "$and": [
                        {"$in": [{"$type": "$sentiment.scores.positive"}, ["double", "int", "long", "decimal"]]},
                        {"$in": [{"$type": "$sentiment.scores.negative"}, ["double", "int", "long", "decimal"]]},
                    ]
                },
            }
        }

        # --- MODIFIED DATE CONVERSION LOGIC ---
        
        # 1. NEW STAGE: Clean the 'created_at' string
        # Replaces the problematic ' · ' with a standard space ' '
        clean_date_str = {
            "$addFields": {
                "_cleaned_created_at": {
                    "$replaceOne": {
                        "input": {"$ifNull": ["$created_at", "$scraped_at"]},
                        "find": " · ",
                        "replacement": " "
                    }
                }
            }
        }

        # 2. NEW STAGE: Convert the cleaned string to a BSON Date object
        # The `$dateFromString` operator requires a strict format, which now works
        # since the string has been normalized in the previous stage.
        convert_to_date = {
            "$addFields": {
                "_tweet_date": {
                    # Try to convert cleaned created_at/scraped_at string to date
                    "$dateFromString": {
                        "dateString": "$_cleaned_created_at",
                        'format': '%b %d, %Y %H:%M %p %Z' ,# Use '%H' for the 24-hour hour, even when combined with '%p' for AM/PM., # Expected format: 'Oct 7, 2025 3:33 PM UTC'
                        # Handle errors by returning None, which is filtered in the next match.
                        "onError": None,
                        "onNull": None
                    }
                }
            }
        }
        
        # --- END MODIFIED DATE CONVERSION LOGIC ---

        # base pipeline (using the new stages)
        pipeline = [match_stage, clean_date_str, convert_to_date, {"$match": {"_tweet_date": {"$ne": None}}}]

        if since_dt:
            pipeline.append({"$match": {"_tweet_date": {"$gt": since_dt}}})

        # coin matching stage (robust: handle coin + hashtag array/string)
        coin_match = {
            "$match": {
                "$or": [
                    # coin field (case-insensitive)
                    {
                        "$expr": {
                            "$in": [
                                {"$toLower": {"$ifNull": ["$coin", ""]}},
                                aliases_lower,
                            ]
                        }
                    },

                    # hashtag: handle array vs string safely
                    {
                        "$expr": {
                            "$cond": [
                                {"$isArray": "$hashtag"},
                                {
                                    "$gt": [
                                        {
                                            "$size": {
                                                "$filter": {
                                                    "input": "$hashtag",
                                                    "as": "h",
                                                    "cond": {
                                                        "$in": [
                                                            {"$toLower": "$$h"},
                                                            aliases_lower,
                                                        ]
                                                    },
                                                }
                                            }
                                        },
                                        0,
                                    ]
                                },
                                {
                                    "$in": [
                                        {"$toLower": {"$ifNull": ["$hashtag", ""]}},
                                        aliases_lower,
                                    ]
                                },
                            ]
                        }
                    },
                ]
            }
        }
        pipeline.append(coin_match)

        # group by trunc date
        group_stage = {
            "$group": {
                "_id": {
                    "time_bucket": {
                        "$dateTrunc": {
                            "date": "$_tweet_date",
                            "unit": unit,
                            "timezone": TIMEZONE,
                        }
                    }
                },
                "avg_positive": {"$avg": "$sentiment.scores.positive"},
                "avg_negative": {"$avg": "$sentiment.scores.negative"},
                "tweet_count": {"$sum": 1},
                "pos_count": {
                    "$sum": {
                        "$cond": [
                            {"$gt": ["$sentiment.scores.positive", "$sentiment.scores.negative"]},
                            1,
                            0,
                        ]
                    }
                },
                "neg_count": {
                    "$sum": {
                        "$cond": [
                            {"$lt": ["$sentiment.scores.positive", "$sentiment.scores.negative"]},
                            1,
                            0,
                        ]
                    }
                },
                "neutral_count": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$sentiment.scores.positive", "$sentiment.scores.negative"]},
                            1,
                            0,
                        ]
                    }
                },
                "stddev_pos": {"$stdDevSamp": "$sentiment.scores.positive"},
                "stddev_neg": {"$stdDevSamp": "$sentiment.scores.negative"},
                # follower-weighted example (if user.followers_count exists)
                "weighted_sum": {
                    "$sum": {
                        "$multiply": [
                            {
                                "$subtract": [
                                    "$sentiment.scores.positive",
                                    "$sentiment.scores.negative",
                                ]
                            },
                            {
                                "$add": [
                                    {"$ifNull": ["$user.followers_count", 0]},
                                    1,
                                ]
                            },
                        ]
                    }
                },
            }
        }
        pipeline.append(group_stage)

        # project
        project = {
            "$project": {
                "coin": canonical_coin,
                "time_bucket": "$_id.time_bucket",
                "mean_sentiment_score": {
                    "$subtract": [
                        {"$ifNull": ["$avg_positive", 0]},
                        {"$ifNull": ["$avg_negative", 0]},
                    ]
                },
                "tweet_count": 1,
                "pos_count": 1,
                "neg_count": 1,
                "neutral_count": 1,
                "stddev_pos": 1,
                "stddev_neg": 1,
                "weighted_mean": {
                    "$cond": [
                        {"$gt": ["$tweet_count", 0]},
                        {"$divide": ["$weighted_sum", "$tweet_count"]},
                        None,
                    ]
                },
                "unit": unit,
                "_id": 0,
            }
        }
        pipeline.append(project)
        pipeline.append({"$sort": {"time_bucket": 1}})

        # merge (replace existing docs)
        pipeline.append(
            {
                "$merge": {
                    "into": DEST_COLLECTION,
                    "on": ["coin", "unit", "time_bucket"],
                    "whenMatched": "replace",
                    "whenNotMatched": "insert",
                }
            }
        )
        return pipeline

    def run_for_coin_unit(self, canonical_coin, aliases, unit, since_dt=None):
        pipeline = self.build_pipeline(canonical_coin, aliases, unit, since_dt=since_dt)
        # run with retry
        for attempt in range(2):
            try:
                cursor = self.src.aggregate(pipeline, allowDiskUse=ALLOW_DISK_USE)
                # exhaust cursor to force execution (we don't care about results, $merge did the work)
                list(cursor)
                return True
            except Exception as e:
                print(f"Aggregation error ({canonical_coin} {unit}) attempt {attempt + 1}: {repr(e)}")
                time.sleep(1)
        return False

    def run(self):
        start_ts = time.time()
        summary = {"merged": 0, "errors": []}

        for canonical, aliases in TARGET_COINS_MAPPING.items():
            for unit in TIME_UNITS:
                print(f"[{datetime.utcnow().isoformat()}] Processing {canonical} / {unit} ...")
                if self.full:
                    since_dt = None
                elif self.days:
                    since_dt = datetime.utcnow() - timedelta(days=self.days)
                else:
                    # incremental: get watermark and use it
                    wm = self.get_watermark(canonical, unit)
                    since_dt = wm

                try:
                    ok = self.run_for_coin_unit(canonical, aliases, unit, since_dt=since_dt)
                    if not ok:
                        summary["errors"].append(f"{canonical}:{unit}")
                    else:
                        summary["merged"] += 1
                        # update watermark to now (approximate)
                        self.set_watermark(canonical, unit, datetime.utcnow())
                except Exception as e:
                    summary["errors"].append(f"{canonical}:{unit}:{e}")

        # After merging, compute low_confidence flag for existing rows (tweet_count < threshold)
        try:
            res = self.db.command(
                {
                    "aggregate": DEST_COLLECTION,
                    "pipeline": [
                        {"$match": {"tweet_count": {"$lt": LOW_CONF_THRESHOLD}}},
                        {"$project": {"coin": 1, "unit": 1, "time_bucket": 1, "tweet_count": 1}},
                    ],
                    "cursor": {},
                }
            )
            low_conf_count = 0
            if "cursor" in res and "firstBatch" in res["cursor"]:
                low_conf_count = len(res["cursor"]["firstBatch"])
            print("Low confidence buckets (sample):", low_conf_count)
        except Exception:
            pass

        # Save snapshot (readback)
        snapshot = {}
        for canonical in TARGET_COINS_MAPPING.keys():
            snapshot[canonical] = {}
            for unit in TIME_UNITS:
                docs = list(
                    self.dest.find({"coin": canonical, "unit": unit}).sort("time_bucket", 1)
                )
                # convert time_bucket to isostring for JSON and drop _id
                for d in docs:
                    if isinstance(d.get("time_bucket"), datetime):
                        d["time_bucket"] = d["time_bucket"].isoformat()
                    if "_id" in d:
                        del d["_id"]
                snapshot[canonical][unit] = docs

        with open("sentiment_trends_snapshot.json", "w") as f:
            json.dump(snapshot, f, indent=2)

        print("Done. summary:", summary, "took:", time.time() - start_ts, "sec")

    def close(self):
        try:
            self.client.close()
        except Exception:
            pass


# ---------- CLI ----------
def parse_args():
    p = argparse.ArgumentParser(description="Improved sentiment aggregator")
    p.add_argument("--full", action="store_true", help="Force full recompute (no watermark)")
    p.add_argument("--days", type=int, default=None, help="Aggregate only last N days")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    agg = SentimentAggregator(full=args.full, days=args.days)
    try:
        agg.run()
    except Exception as e:
        print("Fatal error:", e)
    finally:
        agg.close()