import os
import time
import json
import requests
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# correct web3 v7 imports
from web3 import Web3, WebsocketProvider

load_dotenv()

WEB3_WS = os.getenv("WEB3_WS")
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "crypto_tweets_db")
MIN_USD_ALERT = float(os.getenv("MIN_USD_ALERT", 1))

# Connect using the top-level WebsocketProvider for web3 v6/v7
w3 = Web3(WebsocketProvider(WEB3_WS))


client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tx_collection = db["transactions"]

print("🔌 Connected to Web3:", w3.is_connected())
print("📦 Using DB:", DB_NAME)


# Fetch current ETH price
def get_eth_price():
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        )
        return r.json()["ethereum"]["usd"]
    except:
        return 2500  # fallback


# Process one block
def process_block(block_num):
    block = w3.eth.get_block(block_num, full_transactions=True)
    eth_price = get_eth_price()

    print(f"\n📦 BLOCK {block_num} | {len(block.transactions)} transactions")

    for tx in block.transactions:
        if tx.value == 0:
            continue

        eth_value = w3.from_wei(tx.value, "ether")
        usd_value = float(eth_value) * eth_price

        if usd_value < MIN_USD_ALERT:
            continue

        doc = {
            "tx_hash": tx.hash.hex(),
            "blockchain": "ethereum",
            "from": tx["from"],
            "to": tx.to,
            "value": float(eth_value),
            "value_usd": round(usd_value, 2),
            "token_symbol": "ETH",
            "timestamp": datetime.utcnow(),
        }

        tx_collection.update_one(
            {"tx_hash": doc["tx_hash"]}, {"$set": doc}, upsert=True
        )

        print(f"💸 Saved TX {doc['tx_hash'][:12]}...  ${doc['value_usd']}")


# Main loop
def main():
    last = w3.eth.block_number
    print("🚀 Starting listener at block:", last)

    while True:
        cur = w3.eth.block_number
        if cur > last:
            for b in range(last + 1, cur + 1):
                process_block(b)
            last = cur
        time.sleep(3)


if __name__ == "__main__":
    main()
