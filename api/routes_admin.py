# api/routes_admin.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from bson.objectid import ObjectId
from datetime import datetime

from db import client
# Import the new admin dependency from your protected routes file
from .routes_protected import get_admin_user 

# All routes in this router will automatically require admin privileges
router = APIRouter(tags=["admin"], prefix="/admin", dependencies=[Depends(get_admin_user)])

# collections
DB_NAME = "appdb" 
db = client[DB_NAME]
users_col = db["users"]
# Collections for system status checks, based on your existing files
TWEETS_COLLECTION = client["crypto_tweets_db"]["latest_tweets"]
NEWS_COLLECTION = client["crypto_news_db"]["articles"]
REDDIT_COLLECTION = client["crypto_reddit_db"]["latest_reddit"]
SOURCE_CONFIG = {
    "twitter": {"enabled": True},
    "reddit": {"enabled": True},
    "news": {"enabled": True},
}

# --- Pydantic Models ---

class UserAdminView(BaseModel):
    id: str = Field(..., alias="_id")
    email: str
    name: Optional[str] = None
    auth_method: str
    is_admin: bool = False
    is_active: bool = True
    created_at: datetime
    
    class Config:
        # Allows Pydantic to map '_id' from MongoDB to 'id' in the response
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserUpdateRole(BaseModel):
    is_admin: bool

class UserUpdateStatus(BaseModel):
    is_active: bool

# --- Routes ---

@router.get("/status", summary="Get system status overview (Admin only)")
async def get_system_status():
    """Returns key metrics for the data collections (counts and last scrape time)."""
    try:
        tweet_count = TWEETS_COLLECTION.count_documents({})
        news_count = NEWS_COLLECTION.count_documents({})
        reddit_count = REDDIT_COLLECTION.count_documents({})
        
        # Get user statistics
        user_db = client["your_db"]
        users_collection = user_db["users"]
        total_users = users_collection.count_documents({})
        active_users = users_collection.count_documents({"is_active": True})
        admin_users = users_collection.count_documents({"role": "admin"})
        
        # Get recent users (last 7 days)
        from datetime import timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_users = users_collection.count_documents({"created_at": {"$gte": seven_days_ago}})

        # Find the latest document in each collection to get last scrape time
        latest_tweet = TWEETS_COLLECTION.find_one(
            {}, sort=[("scraped_at", -1)], projection={"scraped_at": 1}
        )
        latest_news = NEWS_COLLECTION.find_one(
            {}, sort=[("published_at", -1)], projection={"published_at": 1}
        )
        latest_reddit = REDDIT_COLLECTION.find_one(
            {}, sort=[("created_at", -1)], projection={"created_at": 1}
        )

        return {
            "data_stats": {
                "tweet_count": tweet_count,
                "news_count": news_count,
                "reddit_count": reddit_count,
            },
            "user_stats": {
                "total_users": total_users,
                "active_users": active_users,
                "admin_users": admin_users,
                "recent_users_7d": recent_users,
            },
            "last_scrape": {
                "twitter": latest_tweet.get("scraped_at") if latest_tweet else None,
                "news": latest_news.get("published_at") if latest_news else None,
                "reddit": latest_reddit.get("created_at") if latest_reddit else None,
            },
            "server_time": datetime.utcnow()
        }
    except Exception as e:
        print(f"Admin Status Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system status")


@router.get("/users", response_model=List[UserAdminView], summary="List all users (Admin only)")
async def get_all_users():
    """Fetches a list of all users for admin management."""
    users_cursor = users_col.find().sort("created_at", -1)
    users_list = []
    for user in users_cursor:
        # Convert ObjectId to string for Pydantic validation
        user['_id'] = str(user['_id'])
        users_list.append(user)
    
    return users_list

@router.patch("/users/{user_id}/role", summary="Update user admin role (Admin only)")
async def update_user_role(user_id: str, payload: UserUpdateRole):
    """Sets or revokes admin status for a user."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    result = users_col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_admin": payload.is_admin, "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    updated_user = users_col.find_one({"_id": ObjectId(user_id)})
    if not updated_user:
         raise HTTPException(status_code=500, detail="Update successful but failed to retrieve user.")

    updated_user['_id'] = str(updated_user['_id'])
    return {"message": "User role updated successfully", "user": updated_user}


@router.patch("/users/{user_id}/status", summary="Activate/Deactivate user account (Admin only)")
async def update_user_status(user_id: str, payload: UserUpdateStatus):
    """Activates or deactivates a user account (e.g., suspension)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    update_set = {"is_active": payload.is_active, "updated_at": datetime.utcnow()}
    update_op = {"$set": update_set}

    # Add or clear the deactivated_at timestamp based on the action
    if not payload.is_active:
        update_set["deactivated_at"] = datetime.utcnow()
    else:
        update_op["$unset"] = {"deactivated_at": ""}

    result = users_col.update_one(
        {"_id": ObjectId(user_id)},
        update_op
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    updated_user = users_col.find_one({"_id": ObjectId(user_id)})
    if not updated_user:
         raise HTTPException(status_code=500, detail="Update successful but failed to retrieve user.")

    updated_user['_id'] = str(updated_user['_id'])
    return {"message": "User status updated successfully", "user": updated_user}

@router.delete("/users/{user_id}", summary="Delete user account (Admin only)")
async def delete_user_account(user_id: str):
    """Permanently deletes a user account."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    result = users_col.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"message": f"User {user_id} deleted successfully"}



@router.get("/sentiment-monitor", summary="Sentiment source health (Admin)")
async def sentiment_monitor():

    def source_stats(col, date_field):
        count = col.count_documents({})

        latest = col.find_one({}, sort=[(date_field, -1)])

        avg_result = list(col.aggregate([
            {"$match": {"score": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$score"}}}
        ]))

        avg_score = (
            round(avg_result[0]["avg"], 4)
            if avg_result and avg_result[0].get("avg") is not None
            else 0
        )

        return {
            "records": count,
            "avg_score": avg_score,
            "last_updated": latest.get(date_field) if latest else None
        }

    return {
        "twitter": source_stats(TWEETS_COLLECTION, "scraped_at"),
        "reddit": source_stats(REDDIT_COLLECTION, "created_at"),
        "news": source_stats(NEWS_COLLECTION, "published_at")
    }
    
    
@router.post("/sentiment/rerun/{source}")
async def rerun_sentiment_source(source: str):
    if source not in SOURCE_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid source")

    if not SOURCE_CONFIG[source]["enabled"]:
        raise HTTPException(
            status_code=403,
            detail=f"{source} source is disabled"
        )

    # 🔁 Placeholder hook for scraper
    print(f"[ADMIN] Re-running {source} scraper")

    return {
        "message": f"{source.capitalize()} scraper triggered successfully"
    }
@router.post("/sentiment/toggle/{source}")
async def toggle_sentiment_source(source: str):
    if source not in SOURCE_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid source")

    SOURCE_CONFIG[source]["enabled"] = not SOURCE_CONFIG[source]["enabled"]

    return {
        "source": source,
        "enabled": SOURCE_CONFIG[source]["enabled"]
    }
