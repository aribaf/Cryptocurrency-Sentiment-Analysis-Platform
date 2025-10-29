from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import pandas as pd

app = FastAPI()

# Allow your React app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"] if using Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Crypto Sentiment API is running!"}

@app.get("/sentiment/overview")
def get_overall_sentiment():
    data = {
        "overall": {"label": "Positive", "score": 0.74},
        "reddit": {"label": "Positive", "score": 0.71},
        "twitter": {"label": "Neutral", "score": 0.55},
        "news": {"label": "Positive", "score": 0.68}
    }
    return data

@app.get("/sentiment/trends")
def get_sentiment_trends():
    try:
        with open("sentiment_trends.json", "r") as f:
            trends = json.load(f)
        return trends
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Trend data not found")

@app.get("/sentiment/latest")
def get_latest_sentiments():
    try:
        df = pd.read_csv("latest_tweets_data.csv")
        latest = df.head(10).to_dict(orient="records")
        return latest
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Latest sentiment data not found")
