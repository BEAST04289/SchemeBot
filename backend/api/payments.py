"""
Payment Routes — Razorpay order creation + verification.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from utils.razorpay import create_order, verify_payment_signature
from db.firestore import upgrade_user_tier
from db.bigquery import log_event

logger = logging.getLogger("grantbot.payments")
router = APIRouter()


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    tier: str


class VerifyPaymentRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    tier: str


@router.post("/create-order")
async def create_order_endpoint(body: CreateOrderRequest, request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})
    try:
        order = await create_order(tier=body.tier, receipt=f"{phone_hash}_{body.tier}"[:40])
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "code": "INVALID_TIER"})
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail={"error": str(e), "code": "PAYMENTS_NOT_CONFIGURED"})
    return {"order_id": order["id"], "amount": order["amount"], "currency": "INR"}


@router.post("/verify")
async def verify_payment_endpoint(body: VerifyPaymentRequest, request: Request):
    phone_hash = getattr(request.state, "phone_hash", None)
    if not phone_hash:
        raise HTTPException(status_code=401, detail={"error": "Not authenticated", "code": "NO_SESSION"})

    if not verify_payment_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        logger.warning(f"Invalid payment signature attempt from {phone_hash}")
        raise HTTPException(status_code=400, detail={"error": "Invalid payment signature", "code": "PAYMENT_INVALID"})

    await upgrade_user_tier(phone_hash, body.tier)

    # This log IS your XPRIZE revenue evidence — export logs/revenue_log.jsonl
    # (or the BigQuery table in prod) as your submission's revenue export.
    asyncio.create_task(log_event("revenue_log", {
        "payment_id": body.razorpay_payment_id, "order_id": body.razorpay_order_id,
        "tier": body.tier, "phone_hash": phone_hash,
    }))

    return {"success": True, "tier": body.tier}
