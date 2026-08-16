"""
Sarthi Kalyan — Central Configuration & Capability Detection
=========================================================
THIS IS THE FLEXIBILITY MECHANISM for the whole system.

Every other module imports `settings` and the HAS_* flags from here
instead of doing its own try/except service detection. That means
capability detection happens in exactly ONE place, computed once at
startup, and every route/agent/db-call behaves consistently.

THREE RUN MODES (same code, different environment variables):

  1. LOCAL — nothing configured except GEMINI_API_KEY.
     In-memory sessions, local JSONL logs, JSON-file scheme matching.
     Zero cloud accounts needed. This is how you run it TODAY.

  2. HYBRID — some services configured (e.g. ChromaDB running locally,
     but no Firestore yet). Each capability degrades independently —
     you can add services one at a time without breaking anything.

  3. PRODUCTION (ENV=production) — all required services must be
     configured or the app refuses to start. Fail loud at startup,
     not silently at 2am when a user hits a broken code path.
"""
from __future__ import annotations


import os
import logging
from pathlib import Path
from dataclasses import dataclass, field

from dotenv import load_dotenv

# Load .env from the backend directory (where this file lives)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

logger = logging.getLogger("sarthi_kalyan.config")


@dataclass
class Settings:
    env: str = os.environ.get("ENV", "development")

    # Gemini (required in every mode — the bot cannot function without this)
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "")

    # Twilio (WhatsApp channel)
    twilio_sid: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
    twilio_token: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_number: str = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

    # ChromaDB (RAG vector search — falls back to seed JSON matching if absent)
    chroma_host: str = os.environ.get("CHROMA_HOST", "localhost")
    chroma_port: int = int(os.environ.get("CHROMA_PORT", "8001"))

    # Firebase / Firestore (persistent sessions — falls back to in-memory)
    firebase_sdk_json: str = os.environ.get("FIREBASE_ADMIN_SDK_JSON", "")

    # BigQuery (XPRIZE evidence logs — falls back to local logs/*.jsonl)
    gcp_project: str = os.environ.get("GCP_PROJECT", "")

    # Razorpay (payments — required for real revenue, not for demo/dev)
    razorpay_key_id: str = os.environ.get("RAZORPAY_KEY_ID", "")
    razorpay_key_secret: str = os.environ.get("RAZORPAY_KEY_SECRET", "")

    # Cloudflare Turnstile (bot protection — dev mode skips validation)
    turnstile_secret: str = os.environ.get("CLOUDFLARE_TURNSTILE_SECRET", "")

    # Auth
    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-in-prod")
    refresh_secret: str = os.environ.get("REFRESH_SECRET", "dev-refresh-secret")

    # URLs
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # Manual payment link fallback (before full Razorpay checkout is wired into frontend)
    payment_link_99: str = os.environ.get("PAYMENT_LINK_99", "")

    is_production: bool = field(init=False)

    def __post_init__(self):
        self.is_production = self.env == "production"


settings = Settings()


# ── Capability Detection (computed once, at import time) ──────────────────────

def _detect_gemini() -> bool:
    if not settings.gemini_api_key:
        logger.error("GEMINI_API_KEY not set — the bot cannot function without this. Set it in .env")
        return False
    return True


def _detect_chromadb() -> bool:
    try:
        import chromadb
        client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        client.heartbeat()
        return True
    except Exception as e:
        logger.warning(f"ChromaDB unavailable ({type(e).__name__}) — using seed-JSON rule-based matching instead")
        return False


def _detect_firestore() -> bool:
    if not settings.firebase_sdk_json:
        return False
    try:
        import json
        import firebase_admin
        from firebase_admin import credentials
        if not firebase_admin._apps:
            cred = credentials.Certificate(json.loads(settings.firebase_sdk_json))
            firebase_admin.initialize_app(cred)
        return True
    except Exception as e:
        logger.warning(f"Firestore unavailable ({e}) — using in-memory session storage instead")
        return False


def _detect_bigquery() -> bool:
    if not settings.gcp_project:
        return False
    try:
        from google.cloud import bigquery
        bigquery.Client(project=settings.gcp_project)
        return True
    except Exception as e:
        logger.warning(f"BigQuery unavailable ({e}) — using local logs/*.jsonl files instead")
        return False


def _detect_razorpay() -> bool:
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


HAS_GEMINI = _detect_gemini()
HAS_CHROMADB = _detect_chromadb()
HAS_FIRESTORE = _detect_firestore()
HAS_BIGQUERY = _detect_bigquery()
HAS_RAZORPAY = _detect_razorpay()

# ── Production Guardrail ────────────────────────────────────────────────────
# In prod, missing config should crash at startup, not degrade silently.
if settings.is_production:
    _required = {"GEMINI_API_KEY": HAS_GEMINI, "FIRESTORE": HAS_FIRESTORE, "RAZORPAY": HAS_RAZORPAY}
    _missing = [k for k, ok in _required.items() if not ok]
    if _missing:
        raise RuntimeError(f"Production mode requires these but they are not configured: {_missing}")

logger.info(
    f"Sarthi Kalyan capabilities [env={settings.env}] — "
    f"Gemini:{HAS_GEMINI} ChromaDB:{HAS_CHROMADB} Firestore:{HAS_FIRESTORE} "
    f"BigQuery:{HAS_BIGQUERY} Razorpay:{HAS_RAZORPAY}"
)
