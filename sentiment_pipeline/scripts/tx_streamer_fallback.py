# scripts/tx_streamer_fallback.py
import os
import time
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import math
from eth_utils import to_checksum_address
from erc20_tokens import ERC20_TOKENS
TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
# Transfer signature hash = keccak("Transfer(address,address,uint256)")

load_dotenv()

WEB3_WS = os.getenv("WEB3_WS")
WEB3_HTTP = os.getenv("WEB3_HTTP")
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "crypto_tweets_db")
MIN_USD_ALERT = float(os.getenv("MIN_USD_ALERT", 1))
COINGECKO_CACHE_SECONDS = int(os.getenv("COINGECKO_CACHE_SECONDS", 60))

if not MONGO_URI:
    raise RuntimeError("Set MONGO_URI in .env")

# Try import web3 and create provider; fallback to HTTP polling
try:
    from web3 import Web3
    ws_available = True
except Exception as e:
    raise RuntimeError("web3 is required. Run: pip install web3") from e

w3 = None
used_ws = False

# Helper to try constructing a websocket provider (best-effort)
def try_create_ws(ws_url):
    try:
        # Attempt v7 style import
        try:
            from web3 import WebsocketProvider
            prov = WebsocketProvider(ws_url)
            return Web3(prov)
        except Exception:
            pass
        # Attempt providers module import (older style)
        try:
            from web3.providers.websocket import WebsocketProvider as WP
            prov = WP(ws_url)
            return Web3(prov)
        except Exception:
            pass
        # Try using attribute on Web3 (older versions)
        try:
            prov = Web3.WebsocketProvider(ws_url)
            return Web3(prov)
        except Exception:
            pass
    except Exception:
        pass
    return None

if WEB3_WS:
    try:
        w3 = try_create_ws(WEB3_WS)
        if w3 and w3.is_connected():
            used_ws = True
    except Exception:
        w3 = None

# If websocket not created, fallback to HTTP provider
if not w3:
    # try to derive HTTP if not provided
    if not WEB3_HTTP and WEB3_WS and WEB3_WS.startswith("wss://"):
        WEB3_HTTP = "https://" + WEB3_WS[len("wss://"):]
    if not WEB3_HTTP:
        raise RuntimeError("No usable Web3 provider. Set WEB3_HTTP (Alchemy HTTPS) in .env")
    # create HTTP provider
    from web3 import Web3 as Web3HTTP
    w3 = Web3HTTP(Web3HTTP.HTTPProvider(WEB3_HTTP))

print("🔌 Web3 connected:", w3.is_connected(), "| used_ws:", used_ws)

# Mongo
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tx_collection = db["transactions"]
print("📦 Using DB:", DB_NAME, "collection:", tx_collection.name)

# CoinGecko cache
price_cache = {"ethereum": {"price": None, "ts": 0}}

def get_eth_price():
    now = time.time()
    c = price_cache.get("ethereum")
    if c and c["price"] and (now - c["ts"] < COINGECKO_CACHE_SECONDS):
        return c["price"]
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price", params={"ids":"ethereum","vs_currencies":"usd"}, timeout=10)
        r.raise_for_status()
        price = float(r.json()["ethereum"]["usd"])
        price_cache["ethereum"] = {"price": price, "ts": now}
        return price
    except Exception as e:
        print("CoinGecko fetch failed:", e)
        return c.get("price") or 0.0
# fetch token price by contract address on Ethereum via CoinGecko
def get_token_price_usd_by_contract(contract_address):
    try:
        url = "https://api.coingecko.com/api/v3/simple/token_price/ethereum"
        params = {"contract_addresses": contract_address, "vs_currencies": "usd"}
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        d = r.json()
        key = contract_address.lower()
        if key in d and "usd" in d[key]:
            return float(d[key]["usd"])
    except Exception as e:
        # network failure — swallow and return 0
        print("CoinGecko token price fetch failed:", e)
    return 0.0

def normalize_and_save_native(tx_hash, _from, _to, value_wei, block_ts):
    try:
        value_eth = int(value_wei) / 10**18
    except Exception:
        try:
            value_eth = float(value_wei)
        except:
            value_eth = 0.0
    eth_price = get_eth_price()
    usd_val = value_eth * eth_price
    if usd_val < MIN_USD_ALERT:
        return False
    doc = {
        "tx_hash": tx_hash if isinstance(tx_hash, str) else (tx_hash.hex() if hasattr(tx_hash,'hex') else str(tx_hash)),
        "blockchain": "ethereum",
        "from": _from,
        "to": _to,
        "value": float(value_eth),
        "value_usd": round(usd_val, 2),
        "token_symbol": "ETH",
        "timestamp": datetime.fromtimestamp(block_ts, tz=timezone.utc),
        "created_at": datetime.now(tz=timezone.utc),
        "tags": ["whale"] if usd_val >= MIN_USD_ALERT else []
    }
    tx_collection.update_one({"tx_hash": doc["tx_hash"]}, {"$set": doc}, upsert=True)
    print("💾 Inserted:", doc["tx_hash"][:12], "USD=", doc["value_usd"])
    return True

# block processing depending on provider type
def process_block_by_number(bnum):
    try:
        blk = w3.eth.get_block(bnum, full_transactions=True)
    except Exception as e:
        print("Failed to fetch block", bnum, ":", e)
        return
    block_ts = getattr(blk, "timestamp", int(time.time()))
    txs = getattr(blk, "transactions", [])
    print(f"\n📦 Block {bnum} | tx count: {len(txs)}")
    for tx in txs:
        try:
            tx_hash = tx.hash if hasattr(tx, "hash") else tx.get("hash")
            _from = tx["from"] if "from" in tx else getattr(tx, "from", None)
            _to = tx.get("to") if isinstance(tx, dict) else getattr(tx, "to", None)
            value = tx.get("value") if isinstance(tx, dict) else getattr(tx, "value", 0)

            # --- native ETH processing (existing) ---
            normalize_and_save_native(tx_hash, _from, _to, value, block_ts)

            # --- ERC-20 detection: get receipt and scan logs ---
            try:
                # receipt may be cached by Web3; this call is the slow part
                receipt = w3.eth.get_transaction_receipt(tx_hash)
                logs = getattr(receipt, "logs", []) or receipt.get("logs", [])
            except Exception as e:
                # can't fetch receipt — skip token decoding for this tx
                logs = []

            for log in logs:
                # log.address is contract address (token)
                log_address = None
                if isinstance(log, dict):
                    log_address = log.get("address") or log.get("logIndex")
                else:
                    log_address = getattr(log, "address", None)

                if not log_address:
                    continue

                lc_addr = str(log_address).lower()
                if lc_addr in ERC20_TOKENS:
                    # check topic0 == Transfer signature
                    topics = log.get("topics") if isinstance(log, dict) else getattr(log, "topics", [])
                    if not topics or len(topics) < 1:
                        continue
                    topic0 = topics[0]
                    if isinstance(topic0, bytes):
                        topic0 = "0x" + topic0.hex()
                    if topic0 != TRANSFER_TOPIC0:
                        continue

                    # decode from/to from topics[1] and topics[2]
                    t1 = topics[1] if len(topics) > 1 else None
                    t2 = topics[2] if len(topics) > 2 else None
                    # topics are 32-byte hex values; address is last 20 bytes
                    try:
                        from_addr = "0x" + t1.hex()[-40:] if isinstance(t1, bytes) else (t1[-40:] if isinstance(t1, str) else None)
                        to_addr = "0x" + t2.hex()[-40:] if isinstance(t2, bytes) else (t2[-40:] if isinstance(t2, str) else None)
                    except Exception:
                        # fallback: unknown format
                        from_addr = None
                        to_addr = None

                    # data field contains amount (uint256) as hex in log.data
                    data_hex = log.get("data") if isinstance(log, dict) else getattr(log, "data", "")
                    if isinstance(data_hex, str) and data_hex.startswith("0x"):
                        amount_int = int(data_hex[2:], 16)
                    elif isinstance(data_hex, bytes):
                        amount_int = int(data_hex.hex(), 16)
                    else:
                        try:
                            amount_int = int(data_hex)
                        except:
                            amount_int = 0

                    token_meta = ERC20_TOKENS.get(lc_addr, {})
                    decimals = token_meta.get("decimals", 18)
                    symbol = token_meta.get("symbol", "TKN")
                    value_tokens = amount_int / (10 ** decimals)

                    # get token price in USD
                    token_price = get_token_price_usd_by_contract(lc_addr)
                    usd_value = value_tokens * (token_price or 0)

                    # skip if below threshold
                    if usd_value < MIN_USD_ALERT:
                        continue

                    # prepare doc
                    doc = {
                        "tx_hash": tx_hash if isinstance(tx_hash, str) else (tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)),
                        "blockchain": "ethereum",
                        "from": from_addr,
                        "to": to_addr,
                        "value": float(value_tokens),
                        "value_usd": round(usd_value, 2),
                        "token_symbol": symbol,
                        "token_address": lc_addr,
                        "timestamp": datetime.fromtimestamp(block_ts, tz=timezone.utc),
                        "created_at": datetime.now(tz=timezone.utc),
                        "tags": ["token", "whale"] if usd_value >= MIN_USD_ALERT else ["token"]
                    }
                    tx_collection.update_one({"tx_hash": doc["tx_hash"], "token_address": doc["token_address"]}, {"$set": doc}, upsert=True)
                    print("💠 ERC20:", symbol, doc["tx_hash"][:12], "amount=", value_tokens, "USD=", doc["value_usd"])
        except Exception as e:
            # per-tx errors should not stop the loop
            # print or log minimal info for debugging
            # print("tx processing error", e)
            continue

_token_price_cache = {}
def get_token_price_usd_by_contract(contract_address):
    now = time.time()
    key = contract_address.lower()
    entry = _token_price_cache.get(key)
    if entry and now - entry["ts"] < 60:  # cache 60 seconds
        return entry["price"]
    # ... fetch as before ...
    price = 0.0
    try:
        url = "https://api.coingecko.com/api/v3/simple/token_price/ethereum"
        params = {"contract_addresses": key, "vs_currencies": "usd"}
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        d = r.json()
        if key in d and "usd" in d[key]:
            price = float(d[key]["usd"])
    except Exception as e:
        print("token price fetch failed:", e)
    _token_price_cache[key] = {"price": price, "ts": now}
    return price

def main_loop_polling():
    last = w3.eth.block_number
    print("🚀 Starting at block:", last)
    while True:
        try:
            cur = w3.eth.block_number
            if cur > last:
                for bn in range(last+1, cur+1):
                    process_block_by_number(bn)
                last = cur
            time.sleep(2)
        except KeyboardInterrupt:
            print("Stopped by user")
            break
        except Exception as e:
            print("Main loop error:", e)
            time.sleep(3)

def main():
    if used_ws:
        # If websocket connection is used and offers subscription, we could use filters,
        # but for simplicity use polling in both cases (works reliably)
        main_loop_polling()
    else:
        main_loop_polling()

if __name__ == "__main__":
    main()
