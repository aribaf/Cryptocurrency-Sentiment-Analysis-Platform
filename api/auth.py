# api/auth.py
import os
import hmac
import hashlib
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from pydantic import BaseModel, EmailStr
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
import jwt
from dotenv import load_dotenv
from bson.objectid import ObjectId
from email.message import EmailMessage
import smtplib

# load .env
load_dotenv()

# Use existing DB client
from db import client
DB_NAME = os.environ.get("DB_NAME", "your_db")
db = client[DB_NAME]
users_col = db["users"]
otps_col = db["otps"]

# Config
SECRET_KEY = os.environ.get("SECRET_KEY", "4283c705eab3418c45deb0b8e1be4f35a5b225a3aaa4ab1e4522edbd12649cb6")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
JWT_EXP_MINUTES = int(os.environ.get("JWT_EXP_MINUTES", "60"))

SMTP_HOST = os.environ.get("EMAIL_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("EMAIL_SMTP_PORT", 587))
SMTP_USER = os.environ.get("EMAIL_SMTP_USER")
SMTP_PASS = os.environ.get("EMAIL_SMTP_PASS")
EMAIL_FROM = os.environ.get("EMAIL_FROM", SMTP_USER)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    api_base_url="https://www.googleapis.com/oauth2/v1/",
    client_kwargs={"scope": "openid email profile"},
)

# ----------------- utilities -----------------
def generate_otp_code() -> str:
    return f"{random.randint(100000, 999999)}"

def hash_otp(otp: str) -> str:
    return hmac.new(SECRET_KEY.encode(), otp.encode(), hashlib.sha256).hexdigest()

def send_email_smtp(to_email: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)

def create_jwt_token(user_id: str):
    now = datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXP_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALG)

# ----------------- schemas -----------------
class RequestOtpIn(BaseModel):
    email: EmailStr

class VerifyOtpIn(BaseModel):
    email: EmailStr
    otp: str

# ----------------- endpoints -----------------
@router.post("/otp/request")
async def request_otp(body: RequestOtpIn, background_tasks: BackgroundTasks):
    email = body.email.lower()
    otp = generate_otp_code()
    hashed = hash_otp(otp)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # store OTP record
    otps_col.update_one(
        {"email": email},
        {"$set": {"hashed": hashed, "expires_at": expires_at, "attempts": 0, "created_at": datetime.utcnow()}},
        upsert=True,
    )

    subject = "Your OTP code"
    body_text = f"Your OTP code is {otp}. It expires in 5 minutes."

    # send asynchronously in background
    background_tasks.add_task(send_email_smtp, email, subject, body_text)
    return {"detail": "OTP requested — check your email"}

@router.post("/otp/verify")
async def verify_otp(body: VerifyOtpIn):
    email = body.email.lower()
    otp = body.otp.strip()
    rec = otps_col.find_one({"email": email})
    if not rec:
        raise HTTPException(status_code=400, detail="No OTP requested for this email")

    if rec.get("expires_at") is None or rec["expires_at"] < datetime.utcnow():
        otps_col.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="OTP expired")

    attempts = rec.get("attempts", 0)
    if attempts >= 5:
        otps_col.delete_one({"email": email})
        raise HTTPException(status_code=429, detail="Too many failed attempts")

    hashed_input = hash_otp(otp)
    # use compare_digest to avoid timing attacks
    if not hmac.compare_digest(hashed_input, rec["hashed"]):
        otps_col.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # success -> create/find user and issue JWT
    user = users_col.find_one({"email": email})
    if not user:
        user_doc = {"email": email, "created_at": datetime.utcnow(), "auth_method": "otp"}
        res = users_col.insert_one(user_doc)
        user_id = res.inserted_id
    else:
        user_id = user["_id"]

    otps_col.delete_one({"email": email})
    token = create_jwt_token(str(user_id))
    return {"access_token": token, "token_type": "bearer"}

# ---------- Google OAuth ----------
@router.get("/google")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to obtain token: {e}")

    # parse ID token
    userinfo = await oauth.google.parse_id_token(request, token)
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    email = email.lower()
    user = users_col.find_one({"email": email})
    if not user:
        user_doc = {
            "email": email,
            "name": userinfo.get("name"),
            "picture": userinfo.get("picture"),
            "auth_method": "google",
            "google_sub": userinfo.get("sub"),
            "created_at": datetime.utcnow(),
        }
        res = users_col.insert_one(user_doc)
        user_id = res.inserted_id
    else:
        user_id = user["_id"]

    jwt_token = create_jwt_token(str(user_id))
    # Redirect to frontend with token in fragment (SPA friendly)
    redirect = f"{FRONTEND_URL}/auth/success#access_token={jwt_token}"
    return RedirectResponse(redirect)
