"""
Firestore Data Layer — with SQLite Fallback
================================================
When config.HAS_FIRESTORE is True: reads/writes real Firestore.
When False: uses a local SQLite database (backend/data/sarthi_kalyan.db).

Every function has an IDENTICAL signature and return shape regardless
of which backend is active. Callers (agents, API routes) never branch
on HAS_FIRESTORE themselves — that logic lives here, once.
"""
from __future__ import annotations


import hashlib
import time
import json
import sqlite3
import asyncio
import logging
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path

from config import HAS_FIRESTORE

if HAS_FIRESTORE:
    from firebase_admin import firestore as fs
    db = fs.client()
else:
    # ── SQLite Fallback Setup ─────────────────────────────────────────────────
    DB_PATH = Path(__file__).resolve().parent.parent / "data" / "sarthi_kalyan.db"
    
    # Ensure data directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    def _init_sqlite():
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    phone_hash TEXT PRIMARY KEY,
                    trial_used BOOLEAN DEFAULT 0,
                    tier TEXT DEFAULT 'free',
                    reports_remaining INTEGER DEFAULT 1,
                    last_search_at TEXT
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    phone_hash TEXT PRIMARY KEY,
                    messages JSON,
                    updated_at TEXT
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS consult_sessions (
                    session_id TEXT PRIMARY KEY,
                    phone_hash TEXT,
                    scheme_session_id TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    status TEXT,
                    minutes_elapsed INTEGER
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tracked_schemes (
                    id TEXT PRIMARY KEY,
                    phone_hash TEXT,
                    scheme_id TEXT,
                    deadline TEXT,
                    status TEXT,
                    created_at TEXT
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS confirmed_profiles (
                    phone_hash TEXT PRIMARY KEY,
                    profile_json JSON,
                    updated_at TEXT
                )
            ''')
            conn.commit()
            
    _init_sqlite()

    def _execute_query(query: str, parameters: tuple = (), fetch_one=False, fetch_all=False):
        with sqlite3.connect(DB_PATH) as conn:
            # Return dicts instead of tuples
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, parameters)
            if fetch_one:
                row = cursor.fetchone()
                return dict(row) if row else None
            if fetch_all:
                return [dict(row) for row in cursor.fetchall()]
            conn.commit()


def hash_phone(phone: str) -> str:
    """Never store a raw phone number anywhere — always hash first."""
    return hashlib.sha256(phone.encode()).hexdigest()[:16]


# ── Profile Caching (For skipping Gemini extraction) ────────────────────────

async def get_cached_profile(phone_hash: str) -> Optional[dict]:
    """Returns the cached profile if it exists and is less than 7 days old."""
    if HAS_FIRESTORE:
        doc = db.collection("confirmed_profiles").document(phone_hash).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        updated_at = data.get("updated_at")
    else:
        def _get():
            return _execute_query("SELECT profile_json, updated_at FROM confirmed_profiles WHERE phone_hash = ?", (phone_hash,), fetch_one=True)
        data = await asyncio.to_thread(_get)
        if not data:
            return None
        updated_at = data.get("updated_at")
        
    if not updated_at:
        return None
        
    try:
        # Handle string (SQLite) or datetime (Firestore)
        if isinstance(updated_at, str):
            updated_dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            if updated_dt.tzinfo is None:
                updated_dt = updated_dt.replace(tzinfo=timezone.utc)
        else:
            updated_dt = updated_at
            
        if datetime.now(timezone.utc) - updated_dt > timedelta(days=7):
            return None
            
        profile = data.get("profile_json")
        if isinstance(profile, str):
            profile = json.loads(profile)
        return profile
    except Exception as e:
        import logging
        logging.getLogger("sarthi_kalyan.db").warning(f"Error reading cached profile: {e}")
        return None

async def save_cached_profile(phone_hash: str, profile: dict) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    if HAS_FIRESTORE:
        db.collection("confirmed_profiles").document(phone_hash).set({
            "profile_json": profile,
            "updated_at": datetime.now(timezone.utc)
        }, merge=True)
    else:
        def _save():
            _execute_query(
                "INSERT INTO confirmed_profiles (phone_hash, profile_json, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(phone_hash) DO UPDATE SET profile_json=excluded.profile_json, updated_at=excluded.updated_at",
                (phone_hash, json.dumps(profile), now_iso)
            )
        await asyncio.to_thread(_save)


# ── Trial / Tier Management ─────────────────────────────────────────────────

async def check_trial_status(phone_hash: str) -> dict:
    """Returns {trial_used: bool, tier: str, reports_remaining: int}."""
    if HAS_FIRESTORE:
        doc = db.collection("users").document(phone_hash).get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "trial_used": data.get("trial_used", False),
                "tier": data.get("tier", "free"),
                "reports_remaining": data.get("reports_remaining", 1),
            }
        return {"trial_used": False, "tier": "free", "reports_remaining": 1}

    def _get():
        return _execute_query("SELECT trial_used, tier, reports_remaining FROM users WHERE phone_hash = ?", (phone_hash,), fetch_one=True)
    
    user = await asyncio.to_thread(_get) or {}
    return {
        "trial_used": bool(user.get("trial_used", False)),
        "tier": user.get("tier", "free"),
        "reports_remaining": user.get("reports_remaining", 1),
    }


async def consume_trial(phone_hash: str) -> None:
    if HAS_FIRESTORE:
        db.collection("users").document(phone_hash).set(
            {"trial_used": True, "last_search_at": datetime.now(timezone.utc)}, merge=True
        )
        return
        
    def _save():
        now_iso = datetime.now(timezone.utc).isoformat()
        _execute_query(
            "INSERT INTO users (phone_hash, trial_used, last_search_at) VALUES (?, 1, ?) "
            "ON CONFLICT(phone_hash) DO UPDATE SET trial_used=1, last_search_at=excluded.last_search_at",
            (phone_hash, now_iso)
        )
    await asyncio.to_thread(_save)


async def upgrade_user_tier(phone_hash: str, tier: str) -> None:
    tier_limits = {
        "report_5": {"tier": "basic", "reports_remaining": 5},
        "monthly": {"tier": "pro", "reports_remaining": -1},
        "ngo_monthly": {"tier": "ngo", "reports_remaining": -1},
    }
    update = tier_limits.get(tier, {"tier": tier, "reports_remaining": -1})
    if HAS_FIRESTORE:
        db.collection("users").document(phone_hash).set(update, merge=True)
        return
        
    def _save():
        _execute_query(
            "INSERT INTO users (phone_hash, tier, reports_remaining) VALUES (?, ?, ?) "
            "ON CONFLICT(phone_hash) DO UPDATE SET tier=excluded.tier, reports_remaining=excluded.reports_remaining",
            (phone_hash, update["tier"], update["reports_remaining"])
        )
    await asyncio.to_thread(_save)


# ── Conversation History (WhatsApp) ─────────────────────────────────────────

async def get_conversation(phone_hash: str) -> list:
    if HAS_FIRESTORE:
        doc = db.collection("conversations").document(phone_hash).get()
        return doc.to_dict().get("messages", []) if doc.exists else []
        
    def _get():
        return _execute_query("SELECT messages FROM conversations WHERE phone_hash = ?", (phone_hash,), fetch_one=True)
        
    row = await asyncio.to_thread(_get)
    if row and row.get("messages"):
        try:
            return json.loads(row["messages"])
        except Exception:
            return []
    return []


async def save_conversation(phone_hash: str, messages: list) -> None:
    """Keeps only the last 10 messages — enough context for Gemini,
    small enough to stay cheap on every call."""
    messages = messages[-10:]
    if HAS_FIRESTORE:
        db.collection("conversations").document(phone_hash).set(
            {"messages": messages, "updated_at": datetime.now(timezone.utc)}, merge=True
        )
        return
        
    def _save():
        now_iso = datetime.now(timezone.utc).isoformat()
        _execute_query(
            "INSERT INTO conversations (phone_hash, messages, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(phone_hash) DO UPDATE SET messages=excluded.messages, updated_at=excluded.updated_at",
            (phone_hash, json.dumps(messages), now_iso)
        )
    await asyncio.to_thread(_save)


# ── Metered Consultation Sessions ───────────────────────────────────────────

async def start_consult_session(phone_hash: str, scheme_session_id: str) -> str:
    session_id = hashlib.sha256(f"{phone_hash}{time.time()}".encode()).hexdigest()[:16]
    start_time = datetime.now(timezone.utc)
    
    if HAS_FIRESTORE:
        db.collection("consult_sessions").document(session_id).set({
            "phone_hash": phone_hash,
            "scheme_session_id": scheme_session_id,
            "start_time": start_time,
            "status": "active",
        })
    else:
        def _save():
            _execute_query(
                "INSERT INTO consult_sessions (session_id, phone_hash, scheme_session_id, start_time, status) VALUES (?, ?, ?, ?, ?)",
                (session_id, phone_hash, scheme_session_id, start_time.isoformat(), "active")
            )
        await asyncio.to_thread(_save)
        
    return session_id


async def end_consult_session(phone_hash: str, consult_session_id: str) -> int:
    """Returns minutes elapsed (rounded up, minimum 1) for billing."""
    now = datetime.now(timezone.utc)
    
    if HAS_FIRESTORE:
        doc_ref = db.collection("consult_sessions").document(consult_session_id)
        doc = doc_ref.get()
        start = doc.to_dict()["start_time"] if doc.exists else now
    else:
        def _get():
            return _execute_query("SELECT start_time FROM consult_sessions WHERE session_id = ?", (consult_session_id,), fetch_one=True)
        row = await asyncio.to_thread(_get)
        if row and row.get("start_time"):
            start = datetime.fromisoformat(row["start_time"].replace("Z", "+00:00"))
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
        else:
            start = now

    elapsed_seconds = (now - start).total_seconds()
    minutes = max(1, int(elapsed_seconds // 60) + (1 if elapsed_seconds % 60 else 0))

    if HAS_FIRESTORE:
        db.collection("consult_sessions").document(consult_session_id).set(
            {"status": "ended", "end_time": now, "minutes_elapsed": minutes}, merge=True
        )
    else:
        def _save():
            _execute_query(
                "UPDATE consult_sessions SET status = ?, end_time = ?, minutes_elapsed = ? WHERE session_id = ?",
                ("ended", now.isoformat(), minutes, consult_session_id)
            )
        await asyncio.to_thread(_save)

    return minutes


# ── Scheme Tracking (deadline reminders) ────────────────────────────────────

async def track_scheme(phone_hash: str, scheme_id: str, deadline: Optional[str]) -> None:
    doc_id = f"{phone_hash}_{scheme_id}"
    created_at = datetime.now(timezone.utc).isoformat()
    
    if HAS_FIRESTORE:
        db.collection("tracked_schemes").document(doc_id).set({
            "phone_hash": phone_hash,
            "scheme_id": scheme_id, 
            "deadline": deadline, 
            "status": "not_started",
            "created_at": created_at,
        })
        return
        
    def _save():
        _execute_query(
            "INSERT INTO tracked_schemes (id, phone_hash, scheme_id, deadline, status, created_at) VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET deadline=excluded.deadline",
            (doc_id, phone_hash, scheme_id, deadline, "not_started", created_at)
        )
    await asyncio.to_thread(_save)


async def get_tracked_schemes(phone_hash: str) -> list[dict]:
    if HAS_FIRESTORE:
        docs = db.collection("tracked_schemes").where("phone_hash", "==", phone_hash).stream()
        return [d.to_dict() for d in docs]
        
    def _get():
        return _execute_query("SELECT * FROM tracked_schemes WHERE phone_hash = ?", (phone_hash,), fetch_all=True)
        
    return await asyncio.to_thread(_get) or []
