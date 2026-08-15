"""
GrantBot FastAPI Backend — Unified Entry Point
================================================
ONE system serving both the web dashboard and the WhatsApp bot through
a shared LangGraph eligibility agent (agents/eligibility.py).

RUN LOCALLY — zero cloud accounts required:
  pip install -r requirements.txt
  cp .env.example .env   # fill in only GEMINI_API_KEY
  uvicorn main:app --reload --port 8000

See ../README.md for the full setup path (WhatsApp, ChromaDB, payments).

Two-tier router mounting below:
  CORE routers (auth, match, whatsapp, payments) are real, finished code —
    imported directly. If one is broken, the app fails to start, which is
    correct: these are load-bearing for the product.
  PERIPHERAL routers (reminders, tracker, admin, impact) are optional
    extensions built via the Antigravity sessions in .antigravity/ —
    mounted only if present, so the core system runs without them.
"""
from __future__ import annotations


import logging
import importlib
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings, HAS_CHROMADB, HAS_FIRESTORE, HAS_BIGQUERY, HAS_RAZORPAY, HAS_GEMINI
from middleware.auth import SessionAuthMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("grantbot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"GrantBot starting — env={settings.env}")
    logger.info(
        f"Capabilities — Gemini:{HAS_GEMINI} ChromaDB:{HAS_CHROMADB} "
        f"Firestore:{HAS_FIRESTORE} BigQuery:{HAS_BIGQUERY} Razorpay:{HAS_RAZORPAY}"
    )
    if not HAS_GEMINI:
        logger.error("GEMINI_API_KEY is not set — the bot will not be able to match schemes.")
    yield
    logger.info("GrantBot shutting down")


app = FastAPI(
    title="GrantBot API",
    description="AI-powered Indian government scheme discovery — web + WhatsApp",
    version="2.0.0",
    docs_url="/docs" if not settings.is_production else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionAuthMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(status_code=500, content={
        "error": "An unexpected error occurred. Please try again.",
        "code": "INTERNAL_ERROR",
    })


@app.get("/health")
async def health():
    return {
        "status": "ok", "version": "2.0.0", "env": settings.env,
        "capabilities": {
            "gemini": HAS_GEMINI, "chromadb": HAS_CHROMADB,
            "firestore": HAS_FIRESTORE, "bigquery": HAS_BIGQUERY, "razorpay": HAS_RAZORPAY,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Core Routers (real, required) ───────────────────────────────────────────
from api.auth import router as auth_router
from api.match import router as match_router
from api.whatsapp import router as whatsapp_router
from api.payments import router as payments_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(match_router, prefix="/api", tags=["schemes"])
app.include_router(whatsapp_router, prefix="/api/whatsapp", tags=["whatsapp"])
app.include_router(payments_router, prefix="/api/payment", tags=["payments"])


# ── Peripheral Routers (optional — built via Antigravity sessions) ─────────
def _safe_mount(module_path: str, prefix: str, tag: str) -> None:
    try:
        module = importlib.import_module(module_path)
        app.include_router(module.router, prefix=prefix, tags=[tag])
        logger.info(f"Mounted {module_path} at {prefix}")
    except (ImportError, AttributeError) as e:
        logger.info(f"{module_path} not yet built ({e}) — see .antigravity/SESSION_PROMPTS.md")


_safe_mount("api.reminders", "/api/reminders", "reminders")
_safe_mount("api.tracker", "/api/tracker", "tracker")
_safe_mount("api.admin", "/api/admin", "admin")
_safe_mount("api.impact", "/api/impact", "impact")


# ── Scheme Refresh (Cloud Scheduler calls this nightly) ─────────────────────

@app.post("/api/refresh")
async def refresh_schemes(request: Request):
    secret = request.headers.get("X-Refresh-Secret")
    if secret != settings.refresh_secret:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    import asyncio
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
    from ingest_schemes import run_refresh

    asyncio.create_task(run_refresh())
    return {"status": "refresh_started"}


# ── XPRIZE Evidence Summary ──────────────────────────────────────────────────

@app.get("/stats")
async def stats():
    """
    Public XPRIZE evidence endpoint — no auth required (judges should be
    able to view this). Combines local/BigQuery logs into the headline
    number your submission narrative should lead with.
    """
    from db.bigquery import read_local_logs

    impact_rows = read_local_logs("impact_log", limit=5000)
    total_value = sum(r.get("benefit_amount_inr", 0) for r in impact_rows)
    unique_sessions = len({r.get("session_id") for r in impact_rows if r.get("session_id")})

    agent_rows = read_local_logs("agent_logs", limit=5000)
    revenue_rows = read_local_logs("revenue_log", limit=5000)

    return {
        "headline": (
            f"GrantBot has helped {unique_sessions} families discover "
            f"Rs {total_value:,} in potential government benefits"
        ),
        "unique_sessions": unique_sessions,
        "total_benefit_value_inr": total_value,
        "agent_decisions_logged": len(agent_rows),
        "paying_customers": len({r.get("phone_hash") for r in revenue_rows if r.get("phone_hash")}),
        "xprize_category": "Money & Financial Access",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
