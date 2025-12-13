from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# ✅ CREATE APP ONCE
app = FastAPI(title="CryptoSent API")

# ✅ CORS MUST BE FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cryptocurrency-sentiment-analysis-p-one.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ❌ REMOVE SessionMiddleware (do NOT use it now)
# from starlette.middleware.sessions import SessionMiddleware

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

# ------------------ MOUNT ROUTERS ------------------

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

# ------------------ ROOT ------------------

@app.get("/")
async def root():
    return {"message": "Welcome to CryptoSent FastAPI"}
