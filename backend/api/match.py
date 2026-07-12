"""
POST /api/match — Web dashboard scheme matching endpoint.
Uses the SAME eligibility agent as the WhatsApp bot (agents/eligibility.py).
This route just packages a completed form into the shared AgentState.
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, field_validator

from agents.eligibility import run_eligibility_agent_web
from db.firestore import check_trial_status, consume_trial
from db.bigquery import log_event

logger = logging.getLogger("grantbot.match_api")
router = APIRouter()


class UserProfile(BaseModel):
    model_config = ConfigDict(strict=True)
    age: int
    state: str
    occupation: str
    annual_income_inr: int
    social_category: str
    has_aadhaar: bool
    language: str = "hi"

    @field_validator("age")
    @classmethod
    def sane_age(cls, v: int) -> int:
        if not (1 <= v <= 120):
            raise ValueError("age must be between 1 and 120")
        return v

    @field_validator("annual_income_inr")
    @classmethod
    def sane_income(cls, v: int) -> int:
        if v < 0:
            raise ValueError("income cannot be negative")
        if v > 100_000_000:  # Rs 10 crore — clearly a data-entry error above this
            raise ValueError("income value looks incorrect")
        return v


@router.post("/match")
async def match_schemes_endpoint(profile: UserProfile, request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    trial = await check_trial_status(phone_hash)
    if trial["trial_used"] and trial["tier"] == "free":
        raise HTTPException(status_code=402, detail={
            "error": "Your free trial has been used. Upgrade to continue.",
            "code": "TRIAL_EXHAUSTED",
        })

    session_id = hashlib.sha256(f"{phone_hash}{datetime.now().isoformat()}".encode()).hexdigest()[:16]

    try:
        result = await run_eligibility_agent_web(session_id=session_id, profile=profile.model_dump())
    except Exception as e:
        logger.exception(f"Eligibility agent failed for session {session_id}: {e}")
        raise HTTPException(status_code=503, detail={
            "error": "Scheme matching is temporarily unavailable. Please try again in a moment.",
            "code": "AGENT_UNAVAILABLE",
        })

    asyncio.create_task(log_event("agent_logs", {
        "session_id": session_id, "channel": "web", "agent_name": "eligibility_agent",
        "decision": f"matched_{len(result['matches'])}_schemes",
        "scheme_ids": [m["scheme_id"] for m in result["matches"]],
    }))
    if result["matches"]:
        asyncio.create_task(log_event("impact_log", {
            "session_id": session_id,
            "scheme_ids": [m["scheme_id"] for m in result["matches"]],
            "benefit_amount_inr": sum(m.get("annual_value", 0) for m in result["matches"]),
            "state": profile.state,
        }))

    if trial["tier"] == "free":
        await consume_trial(phone_hash)

    return {
        "session_id": session_id,
        "matches": result["matches"],
        "explanation_hindi": result["explanation_hi"],
        "explanation_english": result["explanation_en"],
        "trial_used": True,
        "reports_remaining": trial.get("reports_remaining", -1),
    }
