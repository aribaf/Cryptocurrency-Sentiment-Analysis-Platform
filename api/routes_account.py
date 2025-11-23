# api/routes_account.py
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from db import client
from bson.objectid import ObjectId
from passlib.context import CryptContext

router = APIRouter(tags=["account"])

# collections
DB_NAME = "your_db"
db = client[DB_NAME]
users_collection = db["users"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

class ProfileUpdate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    new_email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: str
    new_password: str

class DeactivateRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None

class DeleteRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    confirm: bool

def _get_user_by_identifier(user_id: Optional[str], email: Optional[str]):
    q = None
    if user_id:
        try:
            q = {"_id": ObjectId(user_id)}
        except Exception:
            raise HTTPException(status_code=400, detail={"message": "Invalid user_id"})
    elif email:
        q = {"email": email.lower()}
    else:
        raise HTTPException(status_code=400, detail={"message": "user_id or email is required"})

    user = users_collection.find_one(q)
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})
    return user

def _public_user(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "username": user_doc.get("username", ""),
        "email": user_doc.get("email", ""),
        "is_active": user_doc.get("is_active", True),
        "created_at": user_doc.get("created_at"),
        "updated_at": user_doc.get("updated_at"),
        "deactivated_at": user_doc.get("deactivated_at"),
    }

@router.get("/account/profile", summary="Get current profile")
async def get_profile(user_id: Optional[str] = None, email: Optional[str] = None):
    user = _get_user_by_identifier(user_id, email)
    return {"data": _public_user(user)}

@router.put("/account/profile", summary="Update profile (name, username, email)")
async def update_profile(payload: ProfileUpdate):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    updates = {}

    if payload.username is not None:
        existing = users_collection.find_one(
            {"username": payload.username, "_id": {"$ne": user["_id"]}}
        )
        if existing:
            raise HTTPException(status_code=400, detail={"message": "Username already taken"})
        updates["username"] = payload.username.strip()

    if payload.new_email is not None:
        new_email_lower = payload.new_email.lower()
        existing = users_collection.find_one(
            {"email": new_email_lower, "_id": {"$ne": user["_id"]}}
        )
        if existing:
            raise HTTPException(status_code=400, detail={"message": "Email already registered"})
        updates["email"] = new_email_lower

    if not updates:
        return {"message": "Nothing to update", "data": _public_user(user)}

    updates["updated_at"] = datetime.utcnow()
    users_collection.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Profile updated", "data": _public_user(fresh)}

@router.put("/account/password", summary="Change password")
async def change_password(payload: PasswordUpdate):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail={"message": "New password must be at least 8 characters"})

    user = _get_user_by_identifier(payload.user_id, payload.email)

    if "hashed_password" not in user:
        raise HTTPException(status_code=400, detail={"message": "User has no password set"})

    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail={"message": "Current password is incorrect"})

    new_hash = get_password_hash(payload.new_password)
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hash, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Password updated successfully"}

@router.post("/account/deactivate", summary="Temporarily deactivate account")
async def deactivate_account(payload: DeactivateRequest):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": False, "deactivated_at": datetime.utcnow()}}
    )
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Account deactivated", "data": _public_user(fresh)}

@router.post("/account/reactivate", summary="Reactivate account")
async def reactivate_account(payload: DeactivateRequest):
    user = _get_user_by_identifier(payload.user_id, payload.email)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_active": True}, "$unset": {"deactivated_at": ""}}
    )
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Account reactivated", "data": _public_user(fresh)}

@router.delete("/account/delete", summary="Permanently delete account")
async def delete_account(payload: DeleteRequest):
    if not payload.confirm:
        raise HTTPException(status_code=400, detail={"message": "Confirmation required"})

    user = _get_user_by_identifier(payload.user_id, payload.email)
    users_collection.delete_one({"_id": user["_id"]})
    return {"message": "Account permanently deleted"}
