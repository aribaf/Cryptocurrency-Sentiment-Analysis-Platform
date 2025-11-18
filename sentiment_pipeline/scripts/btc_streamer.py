# scripts/btc_streamer.py
"""
BTC streamer (Blockstream API, free & no api-key required)
- Polls new block heights
- Fetches block tx list and block meta
- Converts sats -> BTC, BTC -> USD (CoinGecko)
- Saves tx docs into Mongo `transactions` collection
"""

import os
import time
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "crypto_tweets_db")
MIN_USD_ALERT = float(os.getenv("MIN_USD_ALERT_BTC", 10000))  # threshold for saving (USD)
BLOCKSTREAM_API = os.getenv("BLOCKSTREAM_API", "https://blockstream.info/api")  # mainnet

if not MONGO_URI:
    raise RuntimeError("Set MONGO_URI in .env")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tx_collection = db["transactions"]

# ---- Helpers ----
def satoshi_to_btc(sats):
    return sats / 1e8

_price_cache = {"btc": {"price": None, "ts": 0}}
def get_btc_price_usd(cache_seconds=60):
    now = time.time()
    entry = _price_cache["btc"]
    if entry["price"] and (now - entry["ts"] < cache_seconds):
        return entry["price"]
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price", params={"ids":"bitcoin","vs_currencies":"usd"}, timeout=8)
        r.raise_for_status()
        p = float(r.json()["bitcoin"]["usd"])
        _price_cache["btc"] = {"price": p, "ts": now}
        return p
    except Exception as e:
        # fallback: return last cached price or None
        print("CoinGecko BTC price error:", e)
        return entry["price"]

def get_tip_height():
    r = requests.get(f"{BLOCKSTREAM_API}/blocks/tip/height", timeout=8)
    r.raise_for_status()
    return int(r.text.strip())

def get_block_hash_by_height(height):
    r = requests.get(f"{BLOCKSTREAM_API}/block-height/{height}", timeout=8)
    r.raise_for_status()
    return r.text.strip()

def get_block_txs(block_hash):
    """
    Blockstream returns 25 tx objects for the first page endpoint /block/{hash}/txs
    If the block is large and you need all txs, you should fetch /block/{hash}/txids and then /tx/{id}
    For performance & simplicity we fetch /block/{hash}/txs which often includes many txs (first page).
    """
    r = requests.get(f"{BLOCKSTREAM_API}/block/{block_hash}/txs", timeout=15)
    r.raise_for_status()
    return r.json()

def get_block_info(block_hash):
    r = requests.get(f"{BLOCKSTREAM_API}/block/{block_hash}", timeout=8)
    r.raise_for_status()
    return r.json()

# ---- Processing ----
def process_tx_obj(tx_obj, block_ts, btc_price):
    """
    tx_obj: Blockstream tx object (dict)
    block_ts: int unix timestamp from block
    """
    try:
        txid = tx_obj.get("txid") or tx_obj.get("hash")
        # Blockstream's object shapes may include 'vout' or 'outputs'. Try both.
        outputs = tx_obj.get("vout") or tx_obj.get("outputs") or tx_obj.get("outputs", [])
        # Each output may use "value" (sats)
        total_out_sats = 0
        for o in outputs:
            if isinstance(o, dict):
                # different shapes: "value" or "scriptpubkey" etc.
                v = o.get("value") or o.get("value", 0)
                try:
                    total_out_sats += int(v)
                except:
                    pass
        # fallback: Blockstream sometimes returns 'fee' etc; if 0, skip
        value_btc = satoshi_to_btc(total_out_sats)
        usd_value = None
        if btc_price:
            usd_value = value_btc * btc_price

        # Skip tiny txs (if btc_price present and below threshold)
        if usd_value is not None and usd_value < MIN_USD_ALERT:
            return False

        # We cannot reliably derive single "from" in Bitcoin (UTXO model).
        # For UI, we'll leave from/to as None or build heuristics later.
        doc = {
            "tx_hash": txid,
            "blockchain": "bitcoin",
            "from": None,
            "to": None,
            "value": float(round(value_btc, 8)),
            "value_usd": round(usd_value, 2) if usd_value is not None else None,
            "token_symbol": "BTC",
            "token_address": None,
            "timestamp": datetime.fromtimestamp(block_ts, tz=timezone.utc),
            "created_at": datetime.now(tz=timezone.utc),
            "tags": ["whale"] if usd_value is not None and usd_value >= MIN_USD_ALERT else []
        }
        # Upsert by tx_hash + blockchain to avoid duplicates
        tx_collection.update_one({"tx_hash": doc["tx_hash"], "blockchain": "bitcoin"}, {"$set": doc}, upsert=True)
        print("💾 BTC saved:", doc["tx_hash"][:12], "| BTC=", doc["value"], "| USD=", doc["value_usd"])
        return True
    except Exception as e:
        print("process_tx_obj error", e)
        return False

# ---- Main loop ----
def main(poll_interval=2):
    print("Starting BTC streamer...")
    try:
        last_height = get_tip_height()
    except Exception as e:
        print("Could not get tip height at startup:", e)
        last_height = None

    while True:
        try:
            tip = get_tip_height()
            btc_price = get_btc_price_usd()
            if last_height is None:
                last_height = tip
            if tip > last_height:
                for h in range(last_height + 1, tip + 1):
                    try:
                        block_hash = get_block_hash_by_height(h)
                        block_info = get_block_info(block_hash)
                        block_ts = block_info.get("timestamp", int(time.time()))
                        txs = get_block_txs(block_hash)
                        print(f"\n📦 BTC Block {h} ({block_hash[:8]}) txs={len(txs)}")
                        # process each tx
                        for tx in txs:
                            try:
                                process_tx_obj(tx, block_ts, btc_price)
                            except Exception as e:
                                print("tx processing error", e)
                        # NOTE: for very large blocks you may want to fetch /block/{hash}/txids and fetch all txs one-by-one.
                    except Exception as e:
                        print("block fetch/process error", e)
                last_height = tip
            time.sleep(poll_interval)
        except Exception as e:
            print("Main loop error:", e)
            time.sleep(3)

if __name__ == "__main__":
    main()
