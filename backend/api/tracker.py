"""
Tracker API — Application Progress Tracking
==============================================
Tracks user's progress through scheme applications:
not_started → documents_collected → applied → approved/rejected

This is XPRIZE evidence — seeing users progress from "discovered" to
"approved" proves the tool drives real outcomes, not just information.
"""
from __future__ import annotations


import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from db.firestore import get_tracked_schemes
from db.bigquery import log_event

logger = logging.getLogger("sarthi_kalyan.tracker")
router = APIRouter()

VALID_STATUSES = {"not_started", "documents_collected", "applied", "approved", "rejected"}


class UpdateStatusRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    scheme_id: str
    status: str
    notes: str = ""


@router.get("/status")
async def get_status(request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    tracked = await get_tracked_schemes(phone_hash)
    return {"schemes": tracked, "count": len(tracked)}


@router.post("/update")
async def update_status(body: UpdateStatusRequest, request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail={
            "error": f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
            "code": "INVALID_STATUS",
        })

    # Log the status change — this IS the XPRIZE outcome evidence
    asyncio.create_task(log_event("impact_log", {
        "session_id": phone_hash,
        "scheme_ids": [body.scheme_id],
        "event": "status_change",
        "new_status": body.status,
        "notes": body.notes,
    }))

    asyncio.create_task(log_event("agent_logs", {
        "session_id": phone_hash, "channel": "web", "agent_name": "tracker",
        "decision": f"status_{body.status}_{body.scheme_id}",
        "scheme_ids": [body.scheme_id],
    }))

    return {"success": True, "scheme_id": body.scheme_id, "status": body.status}
