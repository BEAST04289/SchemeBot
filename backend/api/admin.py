"""
Admin API — NGO Dashboard Routes
===================================
Requires tier="ngo" — regular users cannot access these.
Provides bulk client management and aggregated impact stats
for NGO partners who use GrantBot to serve their beneficiaries.
"""
from __future__ import annotations


import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from db.firestore import check_trial_status, get_tracked_schemes
from db.bigquery import log_event, read_local_logs

logger = logging.getLogger("grantbot.admin")
router = APIRouter()


async def _require_ngo(request: Request) -> str:
    """Guard: only NGO-tier users can access admin endpoints."""
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    trial = await check_trial_status(phone_hash)
    if trial["tier"] != "ngo":
        raise HTTPException(status_code=403, detail={
            "error": "NGO dashboard requires NGO subscription.",
            "code": "TIER_INSUFFICIENT",
        })
    return phone_hash


class BulkMatchRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    clients: list[dict]  # Each dict has the same shape as UserProfile


@router.get("/dashboard")
async def admin_dashboard(request: Request):
    """NGO overview — aggregated stats for the NGO's beneficiaries."""
    phone_hash = await _require_ngo(request)

    agent_rows = read_local_logs("agent_logs", limit=5000)
    impact_rows = read_local_logs("impact_log", limit=5000)

    # Filter to this NGO's sessions (in a real deployment, NGO sessions
    # would be tagged with the NGO's phone_hash — for now, show all)
    total_matches = len([r for r in agent_rows if r.get("decision", "").startswith("matched_")])
    total_benefit = sum(r.get("benefit_amount_inr", 0) for r in impact_rows)

    return {
        "ngo_phone_hash": phone_hash,
        "total_searches_performed": total_matches,
        "total_benefit_surfaced_inr": total_benefit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/log-testimonial")
async def log_testimonial(request: Request):
    """NGOs collect testimonials from beneficiaries — XPRIZE customer_log evidence."""
    phone_hash = await _require_ngo(request)
    body = await request.json()

    testimonial = {
        "ngo_hash": phone_hash,
        "client_name": body.get("first_name", ""),  # First name only — no PII
        "testimonial": body.get("testimonial", ""),
        "scheme_id": body.get("scheme_id", ""),
        "benefit_received": body.get("benefit_received", False),
    }

    asyncio.create_task(log_event("customer_log", testimonial))

    return {"success": True, "logged": True}
