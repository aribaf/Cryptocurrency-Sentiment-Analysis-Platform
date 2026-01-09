from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from datetime import datetime
from bson import ObjectId
import os
import csv
import zipfile

from db import client
from .routes_protected import get_admin_user

# Import REAL Mongo collections
from api.routes_twitter import raw_collection as twitter_col
from api.routes_reddit import reddit_collection
from api.routes_news import news_collection
from api.transactions import collection as transactions_col


router = APIRouter(
    prefix="/admin/exports",
    tags=["admin-exports"],
    dependencies=[Depends(get_admin_user)],
)

# -----------------------------
# Database
# -----------------------------
db = client["appdb"]
export_jobs_col = db["export_jobs"]

# -----------------------------
# File storage
# -----------------------------
EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)

# -----------------------------
# Helper: export data to CSV
# -----------------------------
def export_to_csv(source: str, file_path: str, coin=None, limit=1000):
    if source == "twitter":
        q = {}
        if coin:
            q["coin"] = coin

        cursor = twitter_col.find(q).limit(limit)
        rows = [
            {
                "id": str(d.get("_id")),
                "coin": d.get("coin"),
                "text": d.get("text"),
                "scraped_at": d.get("scraped_at"),
            }
            for d in cursor
        ]

    elif source == "reddit":
        q = {}
        if coin:
            q["coin"] = coin

        cursor = reddit_collection.find(q).limit(limit)
        rows = [
            {
                "id": str(d.get("_id")),
                "coin": d.get("coin"),
                "title": d.get("title"),
                "polarity": d.get("polarity"),
                "created_at": d.get("created_at"),
            }
            for d in cursor
        ]

    elif source == "news":
        q = {}
        if coin:
            q["coin"] = coin

        cursor = news_collection.find(q).limit(limit)
        rows = [
            {
                "id": str(d.get("_id")),
                "coin": d.get("coin"),
                "title": d.get("title"),
                "sentiment_score": (d.get("sentiment") or {}).get("score"),
                "published_at": d.get("published_at"),
            }
            for d in cursor
        ]

    elif source == "transactions":
        q = {}
        if coin:
            q["blockchain"] = coin

        cursor = transactions_col.find(q).limit(limit)
        rows = [
            {
                "tx_hash": d.get("tx_hash"),
                "value_usd": d.get("value_usd"),
                "timestamp": d.get("timestamp"),
                "blockchain": d.get("blockchain"),
            }
            for d in cursor
        ]

    else:
        raise ValueError("Invalid export source")

    if not rows:
        raise ValueError("No data found to export")

    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


# -----------------------------
# Create single export (POST)
# -----------------------------
@router.post("/{source}")
async def create_export(
    source: str,
    coin: str | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    admin=Depends(get_admin_user),
):
    if source not in ["twitter", "reddit", "news", "transactions"]:
        raise HTTPException(status_code=400, detail="Invalid export source")

    job = {
        "source": source,
        "requested_by": admin["email"],
        "status": "running",
        "file_name": None,
        "created_at": datetime.utcnow(),
    }

    result = export_jobs_col.insert_one(job)
    job_id = str(result.inserted_id)

    filename = f"{source}_{job_id}.csv"
    file_path = os.path.join(EXPORT_DIR, filename)

    try:
        export_to_csv(source, file_path, coin=coin, limit=limit)

        export_jobs_col.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "completed", "file_name": filename}},
        )

        return {"ok": True, "job_id": job_id}

    except Exception as e:
        export_jobs_col.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "failed", "error": str(e)}},
        )
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ZIP export (ALL sources)
# -----------------------------
@router.post("/zip")
async def export_zip(
    coin: str | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    admin=Depends(get_admin_user),
):
    job = {
        "source": "zip",
        "requested_by": admin["email"],
        "status": "running",
        "file_name": None,
        "created_at": datetime.utcnow(),
    }

    result = export_jobs_col.insert_one(job)
    job_id = str(result.inserted_id)

    zip_name = f"exports_{job_id}.zip"
    zip_path = os.path.join(EXPORT_DIR, zip_name)

    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for src in ["twitter", "reddit", "news", "transactions"]:
                csv_name = f"{src}_{job_id}.csv"
                csv_path = os.path.join(EXPORT_DIR, csv_name)
                export_to_csv(src, csv_path, coin=coin, limit=limit)
                z.write(csv_path, arcname=csv_name)

        export_jobs_col.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "completed", "file_name": zip_name}},
        )

        return {"ok": True, "job_id": job_id}

    except Exception as e:
        export_jobs_col.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "failed", "error": str(e)}},
        )
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# List exports (GET)
# -----------------------------
@router.get("")
async def list_exports():
    jobs = list(export_jobs_col.find().sort("created_at", -1))
    for j in jobs:
        j["_id"] = str(j["_id"])
    return {"data": jobs}


# -----------------------------
# Download export (GET)
# -----------------------------
@router.get("/{job_id}/download")
async def download_export(job_id: str):
    job = export_jobs_col.find_one({"_id": ObjectId(job_id)})

    if not job or not job.get("file_name"):
        raise HTTPException(status_code=404, detail="File not found")

    file_path = os.path.join(EXPORT_DIR, job["file_name"])

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(file_path, filename=job["file_name"])
