"""
Auth Routes
============
POST /api/auth/session — exchanges a Firebase phone-OTP ID token plus a
Cloudflare Turnstile token for a Sarthi Kalyan session (httpOnly JWT cookie).
"""
from __future__ import annotations


import logging
from typing import Optional
import httpx
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel, ConfigDict

from config import settings, HAS_FIRESTORE
from middleware.auth import create_session_jwt
from db.firestore import hash_phone

logger = logging.getLogger("sarthi_kalyan.auth_api")
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


async def _verify_firebase_token(id_token: str) -> Optional[str]:
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


class DevLoginRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    phone: str


@router.post("/dev-login")
async def dev_login(body: DevLoginRequest, response: Response):
    """Dev-only login: accepts a plain phone number, skips Firebase/Turnstile.
    Disabled in production — returns 404 so it's impossible to hit."""
    if settings.is_production:
        raise HTTPException(status_code=404, detail={"error": "Not found"})

    cleaned = body.phone.strip().replace(" ", "")
    if len(cleaned) != 10 or not cleaned.isdigit():
        raise HTTPException(status_code=400, detail={
            "error": "Please provide a valid 10-digit phone number", "code": "INVALID_PHONE",
        })

    phone_hash = hash_phone(f"+91{cleaned}")
    session_jwt = create_session_jwt(phone_hash)

    response.set_cookie(
        key="sarthi_kalyan_session",
        value=session_jwt,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    logger.info(f"Dev login for phone hash ...{phone_hash[-6:]}")
    return {"success": True}


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
        key="sarthi_kalyan_session",
        value=session_jwt,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    return {"success": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("sarthi_kalyan_session")
    return {"success": True}

