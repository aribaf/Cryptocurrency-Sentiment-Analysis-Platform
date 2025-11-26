# /mnt/data/auth.py
import os
import jwt
import traceback
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from dotenv import load_dotenv
from bson.objectid import ObjectId

# load .env (if present)
load_dotenv()

# local imports (make sure these exist in your project)
# from db import client          # uncomment if you have a db module exporting client
# from utils import send_email   # optional helper to send OTP emails

# --- Basic config and constants ---
SECRET_KEY = os.environ.get("SECRET_KEY", "changemeplease")
JWT_ALG = "HS256"
JWT_EXP_MINUTES = int(os.environ.get("JWT_EXP_MINUTES", 60))

# Default redirect URIs (sane defaults for local/ngrok testing).
# IMPORTANT: these must match Google Console EXACTLY when testing.
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback"
)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# If you use a MongoDB client module, import it:
# Example expects `db = client.get_database()` or `client` with .users/.otps collections.
try:
    from db import client  # you had this in your project
    db = client  # keep the same naming convention used in your project
except Exception:
    client = None
    db = None

# --- Authlib / OAuth client registration using OIDC discovery ---
# Use starlette Config for authlib — supply client id/secret from env
config = Config(environ={
    "GOOGLE_CLIENT_ID": os.environ.get("GOOGLE_CLIENT_ID", ""),
    "GOOGLE_CLIENT_SECRET": os.environ.get("GOOGLE_CLIENT_SECRET", "")
})

oauth = OAuth(config)

oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    # Use Google's OpenID Connect discovery document so authorize_url/token_url/jwks_uri are auto-populated
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"}
)

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Helpers: JWT creation ---
def create_access_token(subject: str, minutes: Optional[int] = None) -> str:
    expire = datetime.utcnow() + timedelta(minutes=(minutes or JWT_EXP_MINUTES))
    payload = {"sub": str(subject), "exp": expire, "iat": datetime.utcnow()}
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALG)

# --- Simple OTP storage helpers (uses Mongo) ---
def store_otp(email: str, otp: str, ttl_seconds: int = 300):
    if db is None:
        return
    otps = db.your_db.otps if hasattr(db, "your_db") else db.otps
    doc = {"email": email, "otp": otp, "created_at": datetime.utcnow(), "ttl": ttl_seconds}
    otps.insert_one(doc)

def verify_otp_in_db(email: str, otp: str) -> bool:
    if db is None:
        return False
    otps = db.your_db.otps if hasattr(db, "your_db") else db.otps
    doc = otps.find_one({"email": email, "otp": otp})
    if not doc:
        return False
    # optional: check TTL/expiry here (simplified)
    return True

# OPTIONAL: replace with your project's email sending function
def send_otp_email(background_tasks: BackgroundTasks, email: str, otp: str):
    # If you have a real email sender, schedule it here:
    # background_tasks.add_task(send_email, to=email, subject="Your OTP", body=f"OTP: {otp}")
    print(f"[OTP] Send to {email}: {otp}")

# --- Request/Response models ---
class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class LoginIn(BaseModel):
    email: EmailStr
    password: Optional[str] = None

# --- OTP endpoints ---
@router.post("/otp/request")
async def request_otp(body: OTPRequest, background_tasks: BackgroundTasks):
    email = body.email.lower()
    # generate a 6-digit OTP
    import random
    otp = f"{random.randint(0, 999999):06d}"
    # store in DB
    try:
        store_otp(email, otp)
    except Exception:
        # still proceed — DB optional depending on your setup
        pass
    # schedule sending
    send_otp_email(background_tasks, email, otp)
    return JSONResponse({"detail": "OTP requested — check your email"}, status_code=200)

@router.post("/otp/verify")
async def verify_otp(body: OTPVerify):
    email = body.email.lower()
    otp = body.otp.strip()
    ok = verify_otp_in_db(email, otp)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    # find or create user in DB, then return access token
    user_collection = None
    if db is not None:
        # try collections in your connected DB
        try:
            user_collection = db.your_db.users if hasattr(db, "your_db") else db.users
        except Exception:
            user_collection = None

    user = None
    if user_collection is not None:
        user = user_collection.find_one({"email": email})
    if not user:
        # create a minimal user
        new_user = {
            "email": email,
            "username": email.split("@")[0],
            "created_at": datetime.utcnow(),
            "is_active": True,
            "auth_method": "otp"
        }
        if user_collection is not None:
            res = user_collection.insert_one(new_user)
            user = user_collection.find_one({"_id": res.inserted_id})
        else:
            # fallback in-memory representation (not persisted)
            user = new_user

    token = create_access_token(str(user.get("_id", user.get("email"))))
    return {"access_token": token, "token_type": "bearer"}

# --- Password login endpoint (optional) ---
@router.post("/login")
async def login(body: LoginIn):
    # If you want password login, implement password verification here.
    # This basic version will check for user existence and return 202 to indicate OTP flow
    email = body.email.lower()

    user_collection = None
    if db is not None:
        try:
            user_collection = db.your_db.users if hasattr(db, "your_db") else db.users
        except Exception:
            user_collection = None

    user = None
    if user_collection is not None:
        user = user_collection.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials or user not found")

    # If you have hashed_password field, verify it using bcrypt/passlib here.
    # For now, if no password provided we ask to verify OTP — keep backward compatibility:
    if not body.password:
        # indicate frontend to present OTP verification step
        return JSONResponse({"detail": "OTP required"}, status_code=202)

    # If password provided, verify and issue token (implementation depends on your password hashing)
    # Example (pseudo):
    # if not verify_password(body.password, user["hashed_password"]):
    #     raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user.get("_id", user.get("email"))))
    return {"access_token": token, "token_type": "bearer"}


# --- Google OAuth routes (Option A: /google/login and /google/callback) ---
@router.get("/google/login")
async def google_login(request: Request):
    """
    Start Google OAuth2 login (redirect to Google).
    Make sure GOOGLE_REDIRECT_URI matches Google Console setting.
    """
    try:
        # Use the GOOGLE_REDIRECT_URI defined above (must be exact)
        return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create redirect: {e}")

@router.get("/google/callback")
async def google_callback(request: Request):
    """
    Handle Google callback: exchange code -> validate -> find/create user -> issue JWT -> redirect to frontend.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to obtain token: {e}")

    # token may contain id_token; parse userinfo
    userinfo = None
    try:
        # Prefer 'userinfo' returned directly, otherwise parse id_token
        userinfo = token.get("userinfo")
        if not userinfo:
            # parse id_token from token
            userinfo = await oauth.google.parse_id_token(request, token)
    except Exception:
        traceback.print_exc()
        # continue — we may still fetch userinfo via token["access_token"]
        try:
            resp = await oauth.google.get("userinfo", token=token)
            userinfo = resp.json()
        except Exception:
            traceback.print_exc()
            pass

    if not userinfo:
        raise HTTPException(status_code=400, detail="Failed to obtain user info from Google")

    email = userinfo.get("email")
    name = userinfo.get("name") or userinfo.get("given_name") or ""
    oauth_id = userinfo.get("sub") or userinfo.get("id")

    # find or create user in DB
    user_collection = None
    if db is not None:
        try:
            user_collection = db.your_db.users if hasattr(db, "your_db") else db.users
        except Exception:
            user_collection = None

    user = None
    if user_collection is not None:
        user = user_collection.find_one({"email": email})

    if not user:
        # create user
        new_user = {
            "email": email,
            "name": name,
            "oauth_provider": "google",
            "oauth_id": oauth_id,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        if user_collection is not None:
            res = user_collection.insert_one(new_user)
            user = user_collection.find_one({"_id": res.inserted_id})
        else:
            user = new_user

    # create our own JWT
    subject = str(user.get("_id", email))
    jwt_token = create_access_token(subject)

    # Redirect back to frontend success route with token in fragment
    redirect_url = f"{FRONTEND_URL}/auth/success#access_token={jwt_token}"
    return RedirectResponse(redirect_url)


# --- Optional route to get current user (requires Authorization header) ---
@router.get("/me")
async def me(request: Request):
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = payload.get("sub")
    # find user by id or email
    if db is not None:
        user_collection = db.your_db.users if hasattr(db, "your_db") else db.users
        user = user_collection.find_one({"_id": ObjectId(sub)}) if ObjectId.is_valid(sub) else user_collection.find_one({"email": sub})
        if user:
            user["_id"] = str(user["_id"])
            return user
    # fallback minimal response
    return {"sub": sub}

# export router
