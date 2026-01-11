# api/transactions.py
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from fastapi import APIRouter, HTTPException, Query
import os
from fastapi.responses import FileResponse, StreamingResponse # Keep FileResponse for compatibility
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import io
import csv
from db import client
router = APIRouter(prefix="/transactions", tags=["transactions"])

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets")
# Transactions can be in either crypto_tweets_db or your_db depending on where you stored them
TRANSACTIONS_DB = os.getenv("TRANSACTIONS_DB", "crypto_tweets_db")
COL_NAME = "transactions"

client = MongoClient(MONGO_URI)
db = client[TRANSACTIONS_DB]
collection = db[COL_NAME]


class TransactionIn(BaseModel):
    tx_hash: str
    blockchain: str
    from_addr: str = Field(..., alias="from")
    to_addr: str = Field(..., alias="to")
    value: float
    value_usd: Optional[float] = None
    token_symbol: Optional[str] = None
    timestamp: datetime
    metadata: Optional[dict] = None


def _to_out(doc):
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id"))
    # normalize field names for frontend convenience
    if "from" in doc:
        doc["from_addr"] = doc.pop("from")
    if "to" in doc:
        doc["to_addr"] = doc.pop("to")
    return doc


@router.post("/", response_model=dict)
def ingest_transaction(tx: TransactionIn):
    data = tx.dict(by_alias=True)
    data["created_at"] = datetime.utcnow()
    collection.update_one({"tx_hash": data["tx_hash"]}, {"$set": data}, upsert=True)
    doc = collection.find_one({"tx_hash": data["tx_hash"]})
    return _to_out(doc)


@router.get("/", response_model=List[dict])
def list_transactions(
    blockchain: Optional[str] = None,
    min_value_usd: Optional[float] = None,
    limit: int = Query(50, ge=1, le=1000),
    page: int = Query(1, ge=1),
    sort: str = Query("timestamp"),
    order: int = Query(-1)
):
    q = {}
    if blockchain:
        q["blockchain"] = blockchain.lower()
    if min_value_usd is not None:
        q["value_usd"] = {"$gte": min_value_usd}

    skip = (page - 1) * limit
    cursor = collection.find(q).sort(sort, order).skip(skip).limit(limit)
    return [_to_out(d) for d in cursor]


@router.get("/wallet/{address}", response_model=List[dict])
def wallet_history(address: str, limit: int = 100):
    q = {"$or": [{"from": address}, {"to": address}]}
    docs = list(collection.find(q).sort("timestamp", -1).limit(limit))
    return [_to_out(d) for d in docs]


@router.get("/alerts", response_model=List[dict])
def get_alerts(min_value_usd: Optional[float] = 100000.0, limit: int = 50):
    q = {
        "$or": [
            {"value_usd": {"$gte": float(min_value_usd)}},
            {"tags": {"$in": ["whale", "suspicious", "exchange"]}}
        ]
    }
    docs = list(collection.find(q).sort("value_usd", -1).limit(limit))
    return [_to_out(d) for d in docs]


@router.post("/aggregate/top-whales", response_model=List[dict])
def top_whales_by_day(days: int = 1, top_n: int = 10):
    since = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$sort": {"value_usd": -1}},
        {"$limit": top_n},
        {"$project": {"tx_hash": 1, "from": 1, "to": 1, "value_usd": 1, "token_symbol": 1, "timestamp": 1}}
    ]
    results = list(collection.aggregate(pipeline))
    out = []
    for r in results:
        out.append({
            "id": str(r.get("_id")),
            "tx_hash": r.get("tx_hash"),
            "from": r.get("from"),
            "to": r.get("to"),
            "value_usd": r.get("value_usd"),
            "token_symbol": r.get("token_symbol"),
            "timestamp": r.get("timestamp"),
        })
    return out


@router.get("/alerts", response_model=List[dict])
def get_alerts(min_value_usd: Optional[float] = Query(100000.0), limit: int = Query(50, ge=1, le=500)):
    """
    Return transactions considered alerts:
    - value_usd >= min_value_usd OR
    - tagged as whale/suspicious/exchange
    """
    q = {
        "$or": [
            {"value_usd": {"$gte": float(min_value_usd)}},
            {"tags": {"$in": ["whale", "suspicious", "exchange"]}}
        ]
    }
    docs = list(collection.find(q).sort("value_usd", -1).limit(limit))
    # convert ObjectId -> id string and normalize fields
    out = []
    for d in docs:
        d["id"] = str(d.get("_id"))
        # optional normalize from/to field names
        if "from" in d:
            d["from_addr"] = d.get("from")
        if "to" in d:
            d["to_addr"] = d.get("to")
        out.append(d)
    return out

# api/transactions.py (Add this new function)
@router.get("/download/transactions.csv", summary="Download recent whale/large transactions as CSV")
def download_transactions_csv(limit: int = Query(1000, ge=1, le=5000)):
    import io
    import pandas as pd
    
    # Query logic from get_alerts to get high-value/tagged transactions
    q = {
        "$or": [
            {"value_usd": {"$gte": 100000.0}}, 
            {"tags": {"$in": ["whale", "suspicious", "exchange"]}}
        ]
    }
    
    transactions = list(
        collection.find(q)
        .sort("timestamp", -1)
        .limit(limit)
    )

    if not transactions:
        raise HTTPException(status_code=404, detail="No alert transactions found to export")
        
    cleaned_transactions = []
    for tx in transactions:
        tx_out = _to_out(tx.copy()) # Re-use the _to_out utility function
        cleaned_transactions.append({
            "tx_hash": tx_out.get("tx_hash"),
            "blockchain": tx_out.get("blockchain"),
            "from_addr": tx_out.get("from_addr"),
            "to_addr": tx_out.get("to_addr"),
            "value_usd": tx_out.get("value_usd"),
            "token_symbol": tx_out.get("token_symbol"),
            "timestamp": tx_out.get("timestamp"),
            "tags": ", ".join(tx_out.get("tags", []))
        })

    df = pd.DataFrame(cleaned_transactions)
    
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    
    return FileResponse(
        io.BytesIO(csv_buffer.getvalue().encode('utf-8')),
        media_type="text/csv",
        filename="whale_transactions_alerts.csv"
    )
