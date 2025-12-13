# routes_alerts.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from db import Database        # your Database class
from routes_protected import get_current_user  # your auth dependency

router = APIRouter(tags=["alerts"])
db = Database()

class AlertIn(BaseModel):
    name: str
    coin: str
    source: str = Field(..., description="twitter|reddit|news|overall")
    metric: str = "score"
    operator: str = Field(..., regex="^(<|>|<=|>=|==)$")
    threshold: float
    channels: List[str] = ["inapp"]       # e.g. ["inapp","email","sms"]
    cooldown_minutes: int = 60
    active: bool = True

class AlertOut(AlertIn):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    last_fired: Optional[datetime] = None

@router.post("/api/alerts", response_model=dict)
async def create_alert(payload: AlertIn, user=Depends(get_current_user)):
    user_id = str(user.get("_id"))
    doc = payload.dict()
    doc.update({
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_fired": None
    })
    inserted_id = db.create_alert(doc)          # now an ObjectId
    return {"id": str(inserted_id), **doc}


@router.get("/api/alerts", response_model=dict)
async def list_alerts(user=Depends(get_current_user)):
    user_id = str(user.get("_id"))
    docs = db.list_user_alerts(user_id)
    out = []
    for d in docs:
        d["id"] = str(d.get("_id"))
        # remove raw _id for cleanliness
        d.pop("_id", None)
        out.append(d)
    return {"data": out}

@router.patch("/api/alerts/{alert_id}/toggle", response_model=dict)
async def toggle_alert(alert_id: str, user=Depends(get_current_user)):
    user_id = str(user.get("_id"))
    col = db.alerts_collection
    obj_id = ObjectId(alert_id)
    doc = col.find_one({"_id": obj_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")
    new_state = not doc.get("active", True)
    col.update_one({"_id": obj_id}, {"$set": {"active": new_state, "updated_at": datetime.utcnow()}})
    return {"ok": True, "active": new_state}

@router.delete("/api/alerts/{alert_id}", response_model=dict)
async def delete_alert(alert_id: str, user=Depends(get_current_user)):
    user_id = str(user.get("_id"))
    col = db.alerts_collection
    obj_id = ObjectId(alert_id)
    res = col.delete_one({"_id": obj_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True}

@router.get("/api/alerts/history", response_model=dict)
async def alerts_history(limit: int = 50, user=Depends(get_current_user)):
    user_id = str(user.get("_id"))
    hs = list(db.alerts_history_collection.find({"user_id": user_id}).sort("fired_at", -1).limit(limit))
    out = []
    for h in hs:
        h["id"] = str(h.get("_id"))
        h.pop("_id", None)
        out.append(h)
    return {"data": out}
