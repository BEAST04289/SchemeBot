"""
Razorpay Payment Utility
=========================
Handles order creation and TWO kinds of signature verification:
  1. Checkout signature — validates the payment.captured callback
     from razorpay's checkout.js on the frontend
  2. Webhook signature — validates server-to-server events Razorpay
     sends directly to your backend (payment.failed, subscription events)

SECURITY: hmac.compare_digest is used for ALL signature comparisons.
Never use `==` to compare signatures — it leaks timing information
that an attacker can use to guess the correct value byte by byte.
"""

import hmac
import hashlib
import logging

import razorpay

from config import settings, HAS_RAZORPAY

logger = logging.getLogger("grantbot.razorpay")

_client = None


def _get_client():
    global _client
    if _client is None:
        if not HAS_RAZORPAY:
            raise RuntimeError("Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
        _client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
    return _client


TIER_PRICING_PAISE = {
    "report_5": 9_900,       # Rs 99
    "monthly": 24_900,       # Rs 249
    "ngo_monthly": 199_900,  # Rs 1,999
}


async def create_order(tier: str, receipt: str, notes: dict | None = None) -> dict:
    """
    Creates a Razorpay order for a standard tier, or a custom amount
    (used for metered consultation billing — pass amount_paise in notes).
    """
    client = _get_client()
    amount = TIER_PRICING_PAISE.get(tier)
    if amount is None:
        if notes and "amount_paise" in notes:
            amount = notes["amount_paise"]
        else:
            raise ValueError(f"Unknown tier '{tier}' and no amount_paise provided")

    try:
        return client.order.create({
            "amount": amount, "currency": "INR", "receipt": receipt, "notes": notes or {},
        })
    except razorpay.errors.BadRequestError as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verifies the checkout.js success callback. Timing-safe comparison."""
    if not HAS_RAZORPAY:
        return False
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.razorpay_key_secret.encode(), message.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(payload_body: bytes, signature: str, webhook_secret: str) -> bool:
    """Verifies the X-Razorpay-Signature header on server-to-server webhooks."""
    expected = hmac.new(webhook_secret.encode(), payload_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
