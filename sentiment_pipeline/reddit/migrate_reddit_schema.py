#!/usr/bin/env python3
"""
migrate_reddit_schema.py

One-time migration script to update old Reddit documents in:
    crypto_reddit_db.latest_reddit

It will:
- Ensure `created_at` exists (string) and mirrors `created_utc`
- Normalize `created_utc` to a string (ISO-like) if it's a datetime
- Add `text` field (used by frontend) from existing fields
- Wrap `sentiment` as { label, scores: {positive, neutral, negative} } if it's still a plain string
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# Use the same MONGO_URI as in your other scripts / FastAPI
MONGO_URI = os.getenv("MONGO_URI") or "mongodb+srv://..."
client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsAllowInvalidCertificates=True
)

# Match what FastAPI uses in main.py
reddit_db = client["crypto_reddit_db"]
collection = reddit_db["latest_reddit"]


def normalize_datetime(value):
    """Return a string in %Y-%m-%dT%H:%M:%S format."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    # if it's already a string, keep it as-is (or you can parse & reformat if you want)
    return str(value)


def migrate_document(doc):
    updates = {}

    # --- 1. created_utc & created_at ---
    created_utc = doc.get("created_utc")
    created_utc_str = normalize_datetime(created_utc)

    # normalize created_utc to string
    if created_utc is not None and created_utc != created_utc_str:
        updates["created_utc"] = created_utc_str

    # add created_at if missing
    if "created_at" not in doc and created_utc_str is not None:
        updates["created_at"] = created_utc_str

    # --- 2. text field (for frontend) ---
    if "text" not in doc:
        text_source = (
            doc.get("text_comments_raw")
            or doc.get("text")
            or doc.get("content")
            or doc.get("body")
            or doc.get("title")
        )
        if text_source:
            updates["text"] = text_source

    # --- 3. Wrap sentiment into { label, scores } if it's a plain string ---
    sentiment_field = doc.get("sentiment")
    if isinstance(sentiment_field, str):
        pos = doc.get("pos_prob")
        neu = doc.get("neu_prob")
        neg = doc.get("neg_prob")

        scores = {}
        if pos is not None:
            scores["positive"] = float(pos)
        if neu is not None:
            scores["neutral"] = float(neu)
        if neg is not None:
            scores["negative"] = float(neg)

        # Only include scores if we actually have them
        if scores:
            updates["sentiment"] = {
                "label": sentiment_field,
                "scores": scores,
            }
        else:
            updates["sentiment"] = {
                "label": sentiment_field
            }

    return updates


def main():
    print("🔄 Starting Reddit schema migration on crypto_reddit_db.latest_reddit")
    
    batch_size = 1000  # Number of documents to fetch and process in one go
    last_id = None
    total_scanned = 0
    total_updated = 0
    
    while True:
        query = {}
        # If we have a last_id from the previous batch, start the new query after it
        if last_id is not None:
            query['_id'] = {'$gt': last_id}

        # Fetch the next batch, sorted by _id to ensure progress
        cursor = collection.find(query).sort('_id', 1).limit(batch_size)
        
        # Convert cursor to a list immediately to execute the query
        # and prevent the connection from staying open for too long.
        docs = list(cursor) 
        
        # Stop if no more documents are found
        if not docs:
            break

        print(f"\nProcessing batch starting from _id: {last_id}...")

        batch_updated = 0
        
        for doc in docs:
            total_scanned += 1
            updates = migrate_document(doc)

            if updates:
                collection.update_one({"_id": doc["_id"]}, {"$set": updates})
                total_updated += 1
                batch_updated += 1
                
            last_id = doc["_id"] # Update last_id after processing

        print(f"Batch complete. Scanned: {len(docs)}, Updated in batch: {batch_updated}. Total updated: {total_updated}")

    print(f"\n✨ Migration complete. Total Scanned: {total_scanned}, Total Updated: {total_updated}")


if __name__ == "__main__":
    main()
