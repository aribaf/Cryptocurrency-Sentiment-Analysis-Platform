# api/routes_protected.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from bson.objectid import ObjectId
import os
from db import client
from dotenv import load_dotenv
load_dotenv()

DB_NAME = os.environ.get("DB_NAME", "appdb")
db = client[DB_NAME]
users_col = db["users"]

SECRET_KEY = os.environ.get("SECRET_KEY")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")

router = APIRouter(tags=["protected"])
security = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    token = creds.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

@router.get("/me", summary="Get current logged-in user")
async def get_current_user_info(user=Depends(get_current_user)):
    # ensure frontend always receives a non-empty username (fallback to email prefix)
    email = user.get("email") or ""
    username = user.get("username") or (email.split("@")[0] if email else None)
    return {
        "id": str(user.get("_id")),
        "email": email,
        "username": username,
        "is_active": user.get("is_active", True),
    }
