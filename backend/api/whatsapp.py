"""
WhatsApp Webhook — Same Brain, Different Entry Point
=======================================================
Twilio (Sandbox for dev, Business API for prod) POSTs every incoming
WhatsApp message here. This calls the exact same eligibility agent as
the web dashboard — see agents/eligibility.py for why that matters.
"""
from __future__ import annotations


import asyncio
import logging

from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import PlainTextResponse
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from config import settings
from agents.eligibility import run_eligibility_agent_whatsapp
from db.firestore import get_conversation, save_conversation, check_trial_status, consume_trial, hash_phone
from db.bigquery import log_event

logger = logging.getLogger("grantbot.whatsapp")
router = APIRouter()

_validator = RequestValidator(settings.twilio_token) if settings.twilio_token else None

FALLBACK_ERROR_MESSAGE = (
    "माफ करें, एक तकनीकी समस्या आई। कृपया दोबारा संदेश भेजें।\n\n"
    "Sorry, a technical issue occurred. Please send your message again."
)


@router.post("/webhook")
async def whatsapp_webhook(request: Request, From: str = Form(...), Body: str = Form(...)):
    # Signature validation only enforced in production — in dev/ngrok testing
    # the URL Twilio signs against doesn't match cleanly and would block testing.
    if settings.is_production and _validator:
        signature = request.headers.get("X-Twilio-Signature", "")
        form_data = dict(await request.form())
        if not _validator.validate(str(request.url), form_data, signature):
            logger.warning(f"Invalid Twilio signature from ...{From[-6:]}")
            raise HTTPException(status_code=403, detail="Invalid signature")

    phone_hash = hash_phone(From)
    user_message = Body.strip()
    logger.info(f"WhatsApp message from ...{From[-6:]}: {user_message[:60]}")

    conversation = await get_conversation(phone_hash)
    conversation.append({"role": "user", "content": user_message})

    try:
        trial = await check_trial_status(phone_hash)
        result = await run_eligibility_agent_whatsapp(session_id=phone_hash, conversation=conversation)

        if result["explanation_hi"] and result["explanation_en"]:
            reply = f"{result['explanation_hi']}\n\n---\n\n{result['explanation_en']}"
        else:
            reply = result["explanation_hi"] or result["explanation_en"]

        # Paywall nudge after the first successful match on free tier
        if result["matches"] and trial["tier"] == "free":
            if trial["trial_used"]:
                reply += (
                    "\n\n💡 *यह आपकी निःशुल्क खोज थी।* ₹99 में 5 और रिपोर्ट पाएं:\n"
                    f"{settings.payment_link_99 or '(payment link coming soon)'}"
                )
            else:
                await consume_trial(phone_hash)

        asyncio.create_task(log_event("agent_logs", {
            "session_id": phone_hash, "channel": "whatsapp", "agent_name": "eligibility_agent",
            "decision": f"matched_{len(result['matches'])}_schemes",
            "scheme_ids": [m["scheme_id"] for m in result["matches"]],
        }))
        if result["matches"]:
            asyncio.create_task(log_event("impact_log", {
                "session_id": phone_hash,
                "scheme_ids": [m["scheme_id"] for m in result["matches"]],
                "benefit_amount_inr": sum(m.get("annual_value", 0) for m in result["matches"]),
            }))

        conversation.append({"role": "assistant", "content": reply})
        await save_conversation(phone_hash, conversation)

    except Exception as e:
        logger.exception(f"WhatsApp pipeline error for ...{From[-6:]}: {e}")
        reply = FALLBACK_ERROR_MESSAGE

    twiml = MessagingResponse()
    twiml.message(reply)
    return PlainTextResponse(str(twiml), media_type="application/xml")
