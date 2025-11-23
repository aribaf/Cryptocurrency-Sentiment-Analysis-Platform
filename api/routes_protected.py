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

SECRET_KEY = os.environ.get("SECRET_KEY", "4283c705eab3418c45deb0b8e1be4f35a5b225a3aaa4ab1e4522edbd12649cb6")
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

@router.get("/me")
async def me(user = Depends(get_current_user)):
    return {"email": user.get("email"), "auth_method": user.get("auth_method")}
