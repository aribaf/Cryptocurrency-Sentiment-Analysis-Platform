"""
api/routes_admin_exports.py - Admin export endpoints
Handles creation, listing, and management of data export jobs
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
import uuid
from db import client
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()
DB_NAME = os.environ.get("DB_NAME", "appdb")
db = client[DB_NAME]
exports_col = db["exports"]  # Job history/metadata
users_col = db["users"]

router = APIRouter(tags=["admin-exports"])

# Import admin_required from existing auth
from api.routes_protected import get_admin_user
from fastapi.security import HTTPBearer

security = HTTPBearer()


@router.post("/admin/exports", summary="Create a new export job")
async def create_export(payload: dict, admin_user=Depends(get_admin_user)):
    """
    Create a new export job (CSV/JSON/Parquet)
    
    Payload:
    {
        "dataset": "tweets" | "reddit" | "news" | "transactions",
        "format": "csv" | "json" | "parquet",
        "compress": true,
        "limit": 100000,
        "columns": ["id", "text", ...],
        "filters": { "start_date": "...", "end_date": "...", ... },
        "delivery": { "type": "download" | "s3" | "email", "config": {...} }
    }
    """
    try:
        job_id = str(uuid.uuid4())
        
        job_doc = {
            "_id": ObjectId(),
            "job_id": job_id,
            "dataset": payload.get("dataset", "tweets"),
            "format": payload.get("format", "csv"),
            "compress": payload.get("compress", False),
            "limit": payload.get("limit", 100000),
            "columns": payload.get("columns", []),
            "filters": payload.get("filters", {}),
            "delivery": payload.get("delivery", {"type": "download"}),
            "requested_by": admin_user.get("_id"),
            "requested_by_email": admin_user.get("email"),
            "status": "queued",  # queued -> running -> completed | failed
            "created_at": datetime.utcnow(),
            "started_at": None,
            "completed_at": None,
            "file_size": 0,
            "row_count": 0,
            "download_url": None,
            "error_message": None,
            "logs": [],
        }
        
        exports_col.insert_one(job_doc)

        # For now, immediately mark as completed with a dummy download URL
        completed_at = datetime.utcnow()
        dummy_url = f"/api/admin/exports/{job_id}/download"
        exports_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "started_at": completed_at,
                    "completed_at": completed_at,
                    "download_url": dummy_url,
                    "row_count": payload.get("limit", 0) or 0,
                    "file_size": 0,
                }
            },
        )
        
        return {
            "ok": True,
            "job_id": job_id,
            "message": "Export job completed (stubbed)",
            "download_url": dummy_url,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create export: {str(e)}"
        )


@router.get("/admin/exports", summary="List export jobs")
async def list_exports(
    status_filter: str = Query(None, alias="status"),
    dataset: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user=Depends(get_admin_user)
):
    """
    List export jobs with optional filters
    """
    try:
        query = {}
        if status_filter and status_filter != "all":
            query["status"] = status_filter
        if dataset:
            query["dataset"] = dataset
        
        skip = (page - 1) * limit
        jobs = list(
            exports_col
            .find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        cleaned = []
        for job in jobs:
            # Convert Mongo types to JSON-safe
            job["_id"] = str(job.get("_id")) if job.get("_id") else None
            job["id"] = job.get("job_id")
            # also convert nested ObjectId fields if present
            if isinstance(job.get("requested_by"), ObjectId):
                job["requested_by"] = str(job["requested_by"])
            cleaned.append(job)

        total = exports_col.count_documents(query)

        return {
            "ok": True,
            "data": cleaned,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list exports: {str(e)}"
        )


@router.get("/admin/exports/{job_id}", summary="Get export job details")
async def get_export_details(job_id: str, admin_user=Depends(get_admin_user)):
    """Get details of a specific export job"""
    try:
        job = exports_col.find_one({"job_id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Export job not found")
        
        job["_id"] = str(job.get("_id")) if job.get("_id") else None
        job["id"] = job.get("job_id")
        if isinstance(job.get("requested_by"), ObjectId):
            job["requested_by"] = str(job["requested_by"])
        
        return {"ok": True, "data": job}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get export details: {str(e)}"
        )


@router.post("/admin/exports/{job_id}/retry", summary="Retry a failed export")
async def retry_export(job_id: str, admin_user=Depends(get_admin_user)):
    """Retry a failed export job"""
    try:
        job = exports_col.find_one({"job_id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Export job not found")
        
        if job["status"] != "failed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only retry failed jobs"
            )
        
        exports_col.update_one(
            {"job_id": job_id},
            {"$set": {"status": "queued", "error_message": None}}
        )
        
        return {"ok": True, "message": "Export job queued for retry"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to retry export: {str(e)}"
        )


@router.post("/admin/exports/{job_id}/cancel", summary="Cancel a running export")
async def cancel_export(job_id: str, admin_user=Depends(get_admin_user)):
    """Cancel a running or queued export job"""
    try:
        job = exports_col.find_one({"job_id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Export job not found")
        
        if job["status"] not in ["queued", "running"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel queued or running jobs"
            )
        
        exports_col.update_one(
            {"job_id": job_id},
            {"$set": {"status": "cancelled", "completed_at": datetime.utcnow()}}
        )
        
        return {"ok": True, "message": "Export job cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to cancel export: {str(e)}"
        )


@router.delete("/admin/exports/{job_id}", summary="Delete an export job")
async def delete_export(job_id: str, admin_user=Depends(get_admin_user)):
    """Delete an export job"""
    try:
        result = exports_col.delete_one({"job_id": job_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Export job not found")
        
        return {"ok": True, "message": "Export job deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete export: {str(e)}"
        )


@router.get("/admin/debug/collections", summary="Debug: List all collections and counts")
async def debug_collections():
    """List all collections in the database with document counts"""
    try:
        collections = db.list_collection_names()
        result = {}
        for col_name in collections:
            count = db[col_name].count_documents({})
            result[col_name] = count
        return {"ok": True, "collections": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/admin/export-formats", summary="Get available export formats")
async def get_export_formats(admin_user=Depends(get_admin_user)):
    """List supported export formats and their options"""
    return {
        "ok": True,
        "data": {
            "formats": ["csv", "json", "parquet"],
            "datasets": ["tweets", "reddit", "news", "transactions"],
            "deliveryTypes": ["download", "s3", "email", "webhook"]
        }
    }


@router.get("/admin/exports/{job_id}/download", summary="Download exported file")
async def download_export(job_id: str, token: str = Query(None)):
    """
    Download exported file. Queries MongoDB and generates CSV.
    """
    import jwt
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    # Validate token
    if token:
        try:
            SECRET_KEY = os.environ.get("SECRET_KEY")
            JWT_ALG = os.environ.get("JWT_ALG", "HS256")
            payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            user = users_col.find_one({"_id": ObjectId(user_id)})
            if not user or user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin access required")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.DecodeError:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get job details
    job = exports_col.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")

    dataset = job.get("dataset", "tweets")
    limit = int(job.get("limit", 10000))
    filters = job.get("filters", {})
    
    # Simple: just pull from latest_tweets_clean based on date filters
    try:
        tweets_db = client["crypto_tweets_db"]
        data_col = tweets_db["latest_tweets_clean"]
        
        # Build query from filters
        query = {}
        if filters.get("start_date"):
            query["created_at"] = {"$gte": filters["start_date"]}
        if filters.get("end_date"):
            if "created_at" not in query:
                query["created_at"] = {}
            query["created_at"]["$lte"] = filters["end_date"]
        
        count = data_col.count_documents(query)
        print(f"[DEBUG] Found {count} documents with filters {query}")
        rows = list(data_col.find(query).limit(limit))
        print(f"[DEBUG] Retrieved {len(rows)} rows")
    except Exception as e:
        print(f"[ERROR] Error querying data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error querying data: {str(e)}")

    # Generate CSV with all columns
    output = StringIO()
    
    if not rows:
        print("[DEBUG] No rows found")
        writer = csv.DictWriter(output, fieldnames=["message"])
        writer.writeheader()
        writer.writerow({"message": "No data found"})
    else:
        # Use all keys from first document
        fieldnames = [k for k in rows[0].keys() if k != "_id"]
        print(f"[DEBUG] Exporting with {len(fieldnames)} columns")
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in rows:
            cleaned = {}
            for field in fieldnames:
                val = row.get(field)
                if isinstance(val, (ObjectId, datetime)):
                    cleaned[field] = str(val)
                else:
                    cleaned[field] = val or ""
            writer.writerow(cleaned)

    csv_content = output.getvalue()
    print(f"[DEBUG] CSV size: {len(csv_content)} bytes")
    from fastapi.responses import Response
    return StreamingResponse(
        iter([csv_content.encode()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export-{job_id}.csv"},
    )
