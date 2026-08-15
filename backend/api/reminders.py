"""
Reminders API — Scheme Application Deadline Tracking
======================================================
Lets users save schemes they want to apply for with deadlines.
The companion cron script (scripts/send_reminders.py) queries these
and sends WhatsApp reminders before deadlines.
"""
from __future__ import annotations


import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from db.firestore import track_scheme, get_tracked_schemes
from db.bigquery import log_event

import asyncio

logger = logging.getLogger("grantbot.reminders")
router = APIRouter()


class SetReminderRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    scheme_id: str
    deadline: Optional[str] = None  # ISO date string, e.g. "2026-12-31"


@router.post("/set")
async def set_reminder(body: SetReminderRequest, request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    await track_scheme(phone_hash, body.scheme_id, body.deadline)

    asyncio.create_task(log_event("agent_logs", {
        "session_id": phone_hash, "channel": "web", "agent_name": "reminders",
        "decision": f"reminder_set_{body.scheme_id}",
        "scheme_ids": [body.scheme_id],
    }))

    return {"success": True, "scheme_id": body.scheme_id, "deadline": body.deadline}


@router.get("/list")
async def list_reminders(request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    tracked = await get_tracked_schemes(phone_hash)
    return {"reminders": tracked, "count": len(tracked)}
