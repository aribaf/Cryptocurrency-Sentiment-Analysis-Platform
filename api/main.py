from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware   # <-- ADD THIS LINE
from routes_alerts import router as alerts_router

from api import transactions
# ... other imports ...

from api import transactions
# your existing routers
from .auth import router as auth_router
from .routes_protected import router as protected_router
from .transactions import router as tx_router
from .ws_live import router as ws_router

# new files you will create:
from .routes_twitter import router as twitter_router
from .routes_news import router as news_router
from .routes_reddit import router as reddit_router
from .routes_trends import router as trends_router
from .routes_account import router as account_router
from .routes_sentiment import router as sentiment_router
from .routes_heatmap import router as heatmap_router

...
SECRET_KEY = os.environ.get("SECRET_KEY", "4283c705eab3418c45deb0b8e1be4f35a5b225a3aaa4ab1e4522edbd12649cb6")


app = FastAPI(title="CryptoSent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # your local frontend dev host (Vite)
        "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev" ,
        "https://cryptocurrency-sentiment-analysis.onrender.com",
        "https://cryptocurrency-sentiment-analysis-p-one.vercel.app",# backend ngrok host
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,   # <--- must be True to allow cookies
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site="none",     # allow cross-site
    https_only=True,      # ngrok uses HTTPS
    session_cookie="google_session"
)


# mount all routers
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
app.include_router(transactions.router, prefix="/api") 
@app.get("/")
async def root():
    return {"message": "Welcome to CryptoSent FastAPI"}
