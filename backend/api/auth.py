"""
Auth Routes
============
POST /api/auth/session — exchanges a Firebase phone-OTP ID token plus a
Cloudflare Turnstile token for a GrantBot session (httpOnly JWT cookie).
"""

import logging

import httpx
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel, ConfigDict

from config import settings, HAS_FIRESTORE
from middleware.auth import create_session_jwt
from db.firestore import hash_phone

logger = logging.getLogger("grantbot.auth_api")
router = APIRouter()


class SessionRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    id_token: str
    turnstile_token: str


async def _validate_turnstile(token: str) -> bool:
    if not settings.turnstile_secret:
        logger.warning("Turnstile secret not set — skipping validation (dev mode only)")
        return True
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.turnstile_secret, "response": token},
        )
    return resp.json().get("success", False)


async def _verify_firebase_token(id_token: str) -> str | None:
    """Verifies a Firebase ID token, returns the phone number or None.
    See middleware/auth.py docstring for why the dev fallback below
    cannot execute in production."""
    if not HAS_FIRESTORE:
        logger.warning("Firebase not configured — dev mode accepts any non-empty token")
        return f"dev_user_{id_token[:8]}" if id_token else None
    try:
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(id_token)
        return decoded.get("phone_number")
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        return None


@router.post("/session")
async def create_session(body: SessionRequest, response: Response):
    if not await _validate_turnstile(body.turnstile_token):
        raise HTTPException(status_code=400, detail={"error": "Verification failed", "code": "TURNSTILE_FAILED"})

    phone = await _verify_firebase_token(body.id_token)
    if not phone:
        raise HTTPException(status_code=401, detail={"error": "Invalid authentication token", "code": "TOKEN_INVALID"})

    phone_hash = hash_phone(phone)
    session_jwt = create_session_jwt(phone_hash)

    response.set_cookie(
        key="grantbot_session",
        value=session_jwt,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    return {"success": True}
