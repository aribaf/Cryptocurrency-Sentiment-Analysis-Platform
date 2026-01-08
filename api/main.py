from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

# ------------------ APP ------------------

app = FastAPI(title="CryptoSent API")

# ------------------ CORS ------------------
# Only FRONTEND origins belong here

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cryptocurrency-sentiment-analysis-p.vercel.app",
        "https://cryptocurrency-sentiment-analysis-p-one.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ SESSION (GOOGLE OAUTH) ------------------

COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")   # prod: none
COOKIE_HTTPS_ONLY = os.getenv("COOKIE_HTTPS_ONLY", "false").lower() == "true"

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY"),
    same_site=COOKIE_SAMESITE,
    https_only=COOKIE_HTTPS_ONLY,
)

# ------------------ ROUTERS ------------------

from .auth import router as auth_router
from .routes_protected import router as protected_router
from .transactions import router as tx_router
from .ws_live import router as ws_router
from .routes_twitter import router as twitter_router
from .routes_news import router as news_router
from .routes_reddit import router as reddit_router
from .routes_trends import router as trends_router
from .routes_account import router as account_router
from .routes_sentiment import router as sentiment_router
from .routes_heatmap import router as heatmap_router
from .routes_admin import router as admin_router

app.include_router(auth_router, prefix="/api")
app.include_router(protected_router, prefix="/api")
app.include_router(tx_router, prefix="/api")
app.include_router(ws_router)

app.include_router(twitter_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(reddit_router, prefix="/api")
app.include_router(trends_router, prefix="/api")
app.include_router(account_router, prefix="/api")
app.include_router(sentiment_router, prefix="/api")
app.include_router(heatmap_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# ------------------ ROOT ------------------

@app.get("/")
async def root():
    return {"message": "Welcome to CryptoSent FastAPI"}
