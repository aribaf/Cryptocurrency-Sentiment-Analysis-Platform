# scripts/seed_transaction.py
from pymongo import MongoClient
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "crypto_tweets_db")

client = MongoClient(MONGO_URI)
c = client[DB_NAME]["transactions"]

doc = {
    # use timestamp() instead of strftime("%s") which is not supported on Windows
    "tx_hash": "0xseed" + str(int(datetime.utcnow().timestamp())),
    "blockchain": "ethereum",
    "from": "0xFromSeed",
    "to": "0xToSeed",
    "value": 12.345,
    "value_usd": 12345.0,
    "token_symbol": "ETH",
    "timestamp": datetime.now(timezone.utc),
    "created_at": datetime.now(timezone.utc),
    "tags": ["seed", "demo"]
}
res = c.insert_one(doc)
print("Inserted seed id:", res.inserted_id)
