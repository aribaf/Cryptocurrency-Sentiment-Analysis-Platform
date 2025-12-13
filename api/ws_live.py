# api/ws_live.py
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from db import client

router = APIRouter()
trend_db = client["trend_prediction"]
predictions_collection = trend_db["predictions"]
# NEW: Reference the alerts collection
ALERTS_COLLECTION = client["appdb"]["alerts"]
# Simple pub-sub: every client gets periodic snapshot from predictions_collection.
@router.websocket("/ws/live_trends")
async def websocket_live_trends(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            docs = list(predictions_collection.find({}, {"_id":0}))
            # convert any datetime objects to isoformat
            for d in docs:
                ga = d.get("generated_at")
                if hasattr(ga, "isoformat"):
                    d["generated_at"] = ga.isoformat()
            await ws.send_json({"data": docs})
            await asyncio.sleep(5)  # push every 5 seconds
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await ws.close()
        except:
            pass
