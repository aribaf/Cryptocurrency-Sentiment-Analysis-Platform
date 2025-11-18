import time
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
MIN_USD_ALERT = float(os.getenv("MIN_USD_ALERT", 1))

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tx_collection = db["transactions"]

RPC_URL = "https://api.mainnet-beta.solana.com"


def get_sol_price():
    r = requests.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={"ids": "solana", "vs_currencies": "usd"},
    )
    return r.json()["solana"]["usd"]


def get_latest_slot():
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSlot",
    }
    return requests.post(RPC_URL, json=payload).json()["result"]


def process_slot(slot):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getConfirmedBlock",
        "params": [slot],
    }

    block = requests.post(RPC_URL, json=payload).json()
    if "result" not in block:
        return

    sol_price = get_sol_price()

    for tx in block["result"]["transactions"]:
        meta = tx.get("meta", {})
        amount = meta.get("preBalances", [0])[0] - meta.get("postBalances", [0])[0]

        value_sol = amount / 1e9
        value_usd = value_sol * sol_price

        if value_usd < MIN_USD_ALERT:
            continue

        doc = {
            "tx_hash": tx["transaction"]["signatures"][0],
            "blockchain": "solana",
            "from": "unknown",
            "to": "unknown",
            "value": value_sol,
            "value_usd": round(value_usd, 2),
            "token_symbol": "SOL",
            "timestamp": datetime.now(timezone.utc),
        }

        tx_collection.update_one(
            {"tx_hash": doc["tx_hash"]},
            {"$set": doc},
            upsert=True,
        )

        print("🐦 SOL TX:", doc["tx_hash"][:10], "USD=", doc["value_usd"])


def main():
    print("🚀 Solana listener started...")
    last_slot = get_latest_slot()

    while True:
        current_slot = get_latest_slot()

        if current_slot > last_slot:
            for slot in range(last_slot + 1, current_slot + 1):
                print("Solana slot:", slot)
                process_slot(slot)

            last_slot = current_slot

        time.sleep(5)


if __name__ == "__main__":
    main()
