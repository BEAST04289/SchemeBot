"""
Session Auth Middleware
=========================
Reads the httpOnly JWT cookie set at login, verifies it, and sets
request.state.phone_hash for every downstream route to use.

Note on why the dev-mode fallback in api/auth.py is safe: config.py's
production guardrail requires HAS_FIRESTORE=True to even start the
server in production, which means the "accept any token" dev fallback
in _verify_firebase_token() is mathematically unreachable once deployed
— not just discouraged, actually impossible to hit.
"""

import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings

logger = logging.getLogger("grantbot.auth")

EXCLUDED_PATHS = {
    "/health", "/stats", "/api/auth/session", "/api/whatsapp/webhook",
    "/api/refresh", "/docs", "/openapi.json",
}

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def create_session_jwt(phone_hash: str) -> str:
    payload = {
        "phone_hash": phone_hash,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_session_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        logger.info("Session JWT expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid session JWT: {e}")
        return None


class SessionAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        token = request.cookies.get("grantbot_session")
        if not token:
            return JSONResponse(status_code=401, content={"error": "Not authenticated", "code": "NO_SESSION"})

        payload = decode_session_jwt(token)
        if not payload:
            return JSONResponse(status_code=401, content={"error": "Session expired or invalid", "code": "TOKEN_INVALID"})

        request.state.phone_hash = payload["phone_hash"]
        return await call_next(request)
