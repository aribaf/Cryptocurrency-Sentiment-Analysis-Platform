# alerts/notifiers.py
import os
import smtplib
import json
import hmac
import hashlib
import time
from email.mime.text import MIMEText
from typing import Dict, Any, List
import requests

# env placeholders (add to .env)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER)

WEBHOOK_SECRET_SALT = os.getenv("ALERT_WEBHOOK_SECRET_SALT", "changeme")

def _hmac_signature(payload_bytes: bytes, secret: str):
    mac = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256)
    return mac.hexdigest()

def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Send a simple plain-text email via SMTP."""
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(EMAIL_FROM, [to], msg.as_string())
        return {"type": "email", "to": to, "status": "sent"}
    except Exception as e:
        return {"type": "email", "to": to, "status": "failed", "error": str(e)}

def send_webhook(url: str, payload: Dict[str, Any], secret: str = None) -> Dict[str, Any]:
    """Post JSON payload to webhook URL. If secret provided compute HMAC header."""
    try:
        body = json.dumps(payload, default=str).encode("utf-8")
        headers = {"Content-Type": "application/json", "User-Agent": "cryptosent-alerts/1"}
        if secret:
            headers["X-Signature"] = _hmac_signature(body, secret)
        elif WEBHOOK_SECRET_SALT:
            headers["X-Signature"] = _hmac_signature(body, WEBHOOK_SECRET_SALT)

        resp = requests.post(url, data=body, headers=headers, timeout=8)
        resp.raise_for_status()
        return {"type": "webhook", "url": url, "status": "sent", "status_code": resp.status_code}
    except Exception as e:
        return {"type": "webhook", "url": url, "status": "failed", "error": str(e)}

# Optional: Twilio SMS (commented)
# from twilio.rest import Client as TwilioClient
# TWILIO_SID = os.getenv("TWILIO_SID")
# TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
# TWILIO_FROM = os.getenv("TWILIO_FROM")
#
# def send_sms_twilio(to: str, body: str):
#     client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
#     msg = client.messages.create(body=body, from_=TWILIO_FROM, to=to)
#     return {"type": "sms", "to": to, "status": "sent", "sid": msg.sid}

def notify(alert_doc: Dict[str, Any], payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Loop through channels defined in alert_doc and send notifications.
    Returns per-channel result objects.
    """
    results = []
    for ch in alert_doc.get("channels", []):
        ch_type = ch.get("type")
        if ch_type == "email":
            to = ch.get("to")
            if not to:
                results.append({"type":"email","status":"failed","error":"missing recipient"})
                continue
            subject = f"[CryptoSent] Alert: {alert_doc.get('name')}"
            body = f"Alert triggered: {alert_doc.get('name')}\n\nDetails:\n{json.dumps(payload, default=str, indent=2)}"
            results.append(send_email(to, subject, body))
        elif ch_type == "webhook":
            url = ch.get("url")
            secret = ch.get("secret")
            if not url:
                results.append({"type":"webhook","status":"failed","error":"missing url"})
                continue
            results.append(send_webhook(url, payload, secret))
        elif ch_type == "sms":
            # optional path: use twilio if configured
            to = ch.get("twilio_to") or ch.get("to")
            if not to:
                results.append({"type":"sms","status":"failed","error":"missing phone"})
                continue
            # implement SMS if desired (uncomment Twilio above)
            results.append({"type":"sms","to": to, "status":"not_implemented"})
        else:
            results.append({"type": ch_type, "status":"failed", "error":"unknown channel"})
    return results
