# api/routes_account.py
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from pydantic import BaseModel, EmailStr
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
    """Verify a plain-text password against a bcrypt hash."""
    # Ensure we only check up to the first 72 characters (bcrypt limit)
    return pwd_context.verify(plain_password[:72], hashed_password)

def get_password_hash(password):
    """Hash a plain-text password."""
    return pwd_context.hash(password[:72])

# --- Pydantic Models for Requests ---

# Model for user registration input
class RegisterIn(BaseModel):
    email: EmailStr
    username: str
    password: str

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

# Helper function to get a user by ID or email (for internal use)
def _get_user_by_identifier(user_id: Optional[str], email: Optional[EmailStr]):
    query = {}
    if user_id:
        try:
            query["_id"] = ObjectId(user_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
    elif email:
        query["email"] = email.lower()
    else:
        raise HTTPException(status_code=400, detail="User ID or email is required")

    user = users_collection.find_one(query)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Helper to remove sensitive fields for public display
def _public_user(user_doc):
    doc = dict(user_doc)
    doc.pop("hashed_password", None)
    doc["user_id"] = str(doc.pop("_id"))
    return doc

# --- Endpoints ---

@router.post("/account/register", summary="Register a new user")
async def register(payload: RegisterIn):
    email = payload.email.lower()
    
    # 1. Check if email already exists
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
        
    # 2. Check if username already exists 
    if payload.username and users_collection.find_one({"username": payload.username}):
        raise HTTPException(status_code=409, detail="Username already taken")

    # 3. Hash the password
    hashed_password = get_password_hash(payload.password)
    
    # 4. Create user document
    user_doc = {
        "email": email,
        "username": payload.username,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(), 
        "auth_method": "password",
        "is_active": True
    }
    res = users_collection.insert_one(user_doc)
    
    # Note: In Register.jsx, you initiate an OTP request immediately after this.
    return {"detail": "Account registered successfully. Proceed to verify."}

@router.post("/account/update-profile", summary="Update user profile information (email/username)")
async def update_profile(payload: ProfileUpdate):
    user = _get_user_by_identifier(payload.user_id, payload.email)
    
    update_fields = {}
    
    if payload.new_email:
        new_email = payload.new_email.lower()
        if users_collection.find_one({"email": new_email, "_id": {"$ne": user["_id"]}}):
            raise HTTPException(status_code=409, detail="New email is already registered")
        update_fields["email"] = new_email
        
    if payload.username and payload.username != user.get("username"):
        if users_collection.find_one({"username": payload.username, "_id": {"$ne": user["_id"]}}):
            raise HTTPException(status_code=409, detail="Username already taken")
        update_fields["username"] = payload.username
        
    if not update_fields:
        return {"message": "No changes detected"}
        
    update_fields["updated_at"] = datetime.utcnow()
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": update_fields}
    )
    fresh = users_collection.find_one({"_id": user["_id"]})
    return {"message": "Profile updated successfully", "data": _public_user(fresh)}


@router.post("/account/update-password", summary="Update user password")
async def update_password(payload: PasswordUpdate):
    user = _get_user_by_identifier(payload.user_id, payload.email)
    
    # 1. Verify current password
    hashed_password = user.get("hashed_password")
    if not hashed_password or not verify_password(payload.current_password, hashed_password):
        raise HTTPException(status_code=401, detail="Invalid current password")
    
    # 2. Hash and update new password
    new_hashed_password = get_password_hash(payload.new_password)
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hashed_password, "updated_at": datetime.utcnow()}}
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
        raise HTTPException(status_code=400, detail="Deletion must be confirmed")
        
    user = _get_user_by_identifier(payload.user_id, payload.email)
    
    users_collection.delete_one({"_id": user["_id"]})
    return {"message": f"Account for {user['email']} permanently deleted."}