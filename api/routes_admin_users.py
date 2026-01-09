"""
api/routes_admin_users.py - Admin user management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from db import client
from bson import ObjectId
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()
DB_NAME = os.environ.get("DB_NAME", "appdb")
db = client[DB_NAME]
users_col = db["users"]

router = APIRouter(tags=["admin-users"])

from api.routes_protected import get_admin_user


@router.get("/admin/users", summary="List all users")
async def list_users(admin_user=Depends(get_admin_user)):
    """List all users in the system"""
    try:
        users = list(users_col.find({}))
        
        # Clean up for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
            user["id"] = user["_id"]
            user.pop("password", None)  # Never send passwords
            user.pop("hashed_password", None)
        
        return {"ok": True, "data": users}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list users: {str(e)}"
        )


@router.post("/admin/users", summary="Create a new user")
async def create_user(payload: dict, admin_user=Depends(get_admin_user)):
    """Create a new user"""
    try:
        username = payload.get("username")
        email = payload.get("email")
        password = payload.get("password")
        role = payload.get("role", "user")
        
        if not username or not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username, email, and password are required"
            )
        
        # Check if user exists
        existing = users_col.find_one({"$or": [{"email": email}, {"username": username}]})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        
        user_doc = {
            "_id": ObjectId(),
            "username": username,
            "email": email,
            "hashed_password": hashed_password.decode("utf-8"),
            "role": role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        users_col.insert_one(user_doc)
        
        # Return without password
        user_doc["_id"] = str(user_doc["_id"])
        user_doc.pop("hashed_password")
        
        return {"ok": True, "data": user_doc, "message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )


@router.put("/admin/users/{user_id}", summary="Update a user")
async def update_user(user_id: str, payload: dict, admin_user=Depends(get_admin_user)):
    """Update a user"""
    try:
        update_data = {"updated_at": datetime.utcnow()}
        
        if payload.get("username"):
            update_data["username"] = payload["username"]
        if payload.get("email"):
            update_data["email"] = payload["email"]
        if payload.get("role"):
            update_data["role"] = payload["role"]
        if payload.get("password"):
            # Hash new password
            hashed_password = bcrypt.hashpw(
                payload["password"].encode("utf-8"), bcrypt.gensalt()
            )
            update_data["hashed_password"] = hashed_password.decode("utf-8")
        
        result = users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"ok": True, "message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update user: {str(e)}"
        )


@router.delete("/admin/users/{user_id}", summary="Delete a user")
async def delete_user(user_id: str, admin_user=Depends(get_admin_user)):
    """Delete a user"""
    try:
        # Prevent deleting yourself
        if str(admin_user.get("_id")) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        result = users_col.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"ok": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete user: {str(e)}"
        )
