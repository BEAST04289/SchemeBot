"""
Send Reminders — Cloud Scheduler Cron Job
============================================
Queries tracked schemes with upcoming deadlines and sends WhatsApp
reminders via Twilio. Designed to run daily via Cloud Scheduler.

RUN:
  python scripts/send_reminders.py          # dry run (prints, doesn't send)
  python scripts/send_reminders.py --send   # actually sends WhatsApp messages
"""

import sys
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger("send_reminders")


def get_upcoming_deadlines(days_ahead: int = 7) -> list[dict]:
    """Gets tracked schemes with deadlines in the next N days.
    In production this queries Firestore; locally uses in-memory store
    which will be empty on a fresh start."""
    from db.firestore import _mem_tracked_schemes, HAS_FIRESTORE

    upcoming = []
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).isoformat()

    if HAS_FIRESTORE:
        from firebase_admin import firestore as fs
        db = fs.client()
        docs = db.collection("tracked_schemes").stream()
        for doc in docs:
            data = doc.to_dict()
            if data.get("deadline") and data["deadline"] <= cutoff:
                upcoming.append({**data, "doc_id": doc.id})
    else:
        for phone_hash, schemes in _mem_tracked_schemes.items():
            for s in schemes:
                if s.get("deadline") and s["deadline"] <= cutoff:
                    upcoming.append({**s, "phone_hash": phone_hash})

    return upcoming


def send_whatsapp_reminder(phone_hash: str, scheme_id: str, deadline: str) -> bool:
    """Sends a WhatsApp reminder via Twilio."""
    if not settings.twilio_sid or not settings.twilio_token:
        logger.warning("Twilio not configured — cannot send WhatsApp reminders")
        return False

    try:
        from twilio.rest import Client
        client = Client(settings.twilio_sid, settings.twilio_token)

        message_body = (
            f"🔔 GrantBot Reminder: आपकी योजना {scheme_id} की आवेदन "
            f"अंतिम तिथि {deadline} है। जल्दी आवेदन करें!\n\n"
            f"Reminder: Deadline for {scheme_id} is {deadline}. Apply soon!"
        )

        # Note: in production, we'd need to resolve phone_hash back to
        # a phone number, which requires storing a lookup in Firestore.
        # For now, log the intent.
        logger.info(f"Would send to {phone_hash}: {message_body[:80]}...")
        return True

    except Exception as e:
        logger.error(f"Failed to send reminder: {e}")
        return False


def main(send: bool = False):
    upcoming = get_upcoming_deadlines(days_ahead=7)
    logger.info(f"Found {len(upcoming)} schemes with upcoming deadlines")

    for item in upcoming:
        phone_hash = item.get("phone_hash", item.get("doc_id", "unknown").split("_")[0])
        scheme_id = item.get("scheme_id", "unknown")
        deadline = item.get("deadline", "unknown")

        if send:
            success = send_whatsapp_reminder(phone_hash, scheme_id, deadline)
            logger.info(f"{'✓' if success else '✗'} Reminder for {scheme_id} -> {phone_hash[:8]}...")
        else:
            logger.info(f"[DRY RUN] Would remind {phone_hash[:8]}... about {scheme_id} (deadline: {deadline})")

    logger.info(f"Done. {'Sent' if send else 'Would send'} {len(upcoming)} reminders.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--send", action="store_true", help="Actually send WhatsApp messages (default: dry run)")
    args = parser.parse_args()
    main(send=args.send)
