from fastapi import APIRouter
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@router.post("/chatbot")
async def chatbot(payload: dict):
    user_message = payload.get("message", "")
    context = payload.get("context", {}) or {}

    coin = context.get("coin", "BTC")
    timeframe = context.get("timeframe", "Day")

    overall = context.get("overall", {}) or {}

    label = str(overall.get("label", "Neutral"))

    raw_score = overall.get("score", 0)
    try:
        score = float(raw_score)
    except (TypeError, ValueError):
        score = 0.0


    system_prompt = f"""
You are CryptoGrok, an AI market assistant.

Context:
Coin: {context['coin']}
Timeframe: {context['timeframe']}
Overall sentiment score: {context['overall_score']}
Sentiment label: {context['overall_label']}

Rules:
- Explain data clearly
- Do not give financial advice
- Base answers only on provided data
"""


    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",

        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=250,
    )

    return {
        "reply": completion.choices[0].message.content
    }
