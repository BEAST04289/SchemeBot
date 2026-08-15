"""
GrantBot Eligibility Agent — THE Unified Brain
=================================================
ONE LangGraph agent serves BOTH the web dashboard and the WhatsApp bot.
This is the actual resolution to "build one system, not two": the web
form and the WhatsApp conversation are just two different ways of
populating the same AgentState, which then flows through identical
match and explain nodes. Same Gemini prompts, same scheme matching,
same evidence logging, two entry points at the bottom of this file.

MATCHING APPROACH — Sibasis Das (IBM Senior Inventor), applied directly:
  "Stop leaning on embeddings for everything. Eligibility text embeds
  badly, but the underlying criteria are structured — age, income
  ceiling, category, state, occupation. Run an LLM pass to extract
  those into metadata fields, then filter on them and let vector
  search handle the rest. Have Gemini generate a plain-language summary
  per scheme and embed that alongside the raw text — citizen-style
  queries match it far better than the bureaucratic source register."

Concretely: _hard_filter_pass() does the structured filtering BEFORE
any similarity ranking happens. ChromaDB (built by scripts/ingest_schemes.py)
stores a combined embedding of plain-language-summary + structured-text
per scheme, exactly per his advice.

FLEXIBILITY: when ChromaDB isn't running (config.HAS_CHROMADB is False),
matching falls back to pure rule-based scoring over the seed JSON —
same hard-filter logic, same result shape, just no vector search.
The rest of the system never needs to know which path ran.
"""

import json
import logging
import asyncio
from pathlib import Path
from typing import TypedDict, Optional, Literal

import google.generativeai as genai
from langgraph.graph import StateGraph, END

from config import settings, HAS_CHROMADB, HAS_GEMINI
from utils.gemini_helpers import generate_with_retry, parse_json_safely
from db.firestore import get_cached_profile, save_cached_profile

logger = logging.getLogger("grantbot.eligibility")

if HAS_GEMINI:
    genai.configure(api_key=settings.gemini_api_key)

FLASH_JSON = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config=genai.GenerationConfig(temperature=0.1, response_mime_type="application/json"),
) if HAS_GEMINI else None

FLASH = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config=genai.GenerationConfig(temperature=0.4, max_output_tokens=800),
) if HAS_GEMINI else None


# ── Seed Scheme Fallback (used when ChromaDB unavailable) ─────────────────────
# Path resolved relative to THIS file, not the working directory — avoids
# a class of bugs where the bot works from one launch directory and not another.
# eligibility.py is at backend/agents/eligibility.py
# parent = backend/agents/  →  parent.parent = backend/  →  backend/data/schemes_seed.json
SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "schemes_seed.json"


def _load_seed_schemes() -> list[dict]:
    try:
        return json.loads(SEED_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        logger.error(f"Seed schemes file not found at {SEED_PATH} — matching will return nothing")
        return []


_SEED_SCHEMES = _load_seed_schemes()
_SEED_INDEX = {s["id"]: s for s in _SEED_SCHEMES}

if HAS_CHROMADB:
    import chromadb
    _chroma = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    _scheme_collection = _chroma.get_or_create_collection("schemes", metadata={"hnsw:space": "cosine"})


# ── Agent State ─────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    session_id: str
    channel: Literal["web", "whatsapp"]
    raw_profile: Optional[dict]            # web: complete form submission
    conversation_history: Optional[list]   # whatsapp: message list, may be partial
    normalized_profile: dict
    matched_schemes: list[dict]
    explanation_hi: str
    explanation_en: str
    needs_more_info: bool
    missing_fields: list[str]


PROFILE_JSON_SCHEMA = """{
  "age": integer or null,
  "state": "official Indian state name in English, or null",
  "occupation": "farmer|student|artisan|small_business|salaried|daily_wage|self_employed|unemployed, or null",
  "annual_income_inr": integer or null,
  "income_category": "BPL|low|middle|high, or null",
  "social_category": "General|SC|ST|OBC|EWS, or null",
  "is_widow": boolean,
  "is_senior": boolean (true if age >= 60),
  "is_student": boolean,
  "has_land": boolean or null,
  "has_aadhaar": boolean or null,
  "artisan_trade": "carpenter|blacksmith|weaver|tailor|potter|cobbler|mason|barber|other, or null",
  "language_preference": "hi|en, default hi",
  "profile_complete": boolean (true once state + occupation + age + income_category are ALL known),
  "missing_critical": ["list of fields still needed, empty if profile_complete"]
}"""


# ── Node 1: Intake ───────────────────────────────────────────────────────────

def intake_node(state: AgentState) -> AgentState:
    """
    Two modes, one output shape:

    web — raw_profile is already a complete form submission. One Gemini
          call just standardizes field values (state name spelling etc).
          profile_complete is always True here — the form enforced it.

    whatsapp — conversation_history may be partial across several turns.
               Gemini extracts what it can; if critical fields are still
               missing, needs_more_info is set and the explain_node will
               ask a follow-up question instead of attempting a match.
    """
    if state["channel"] == "web" and state.get("raw_profile"):
        profile = dict(state["raw_profile"])
        profile.setdefault(
            "income_category",
            "BPL" if profile.get("annual_income_inr", 999_999) < 120_000 else "low",
        )
        profile["is_senior"] = (profile.get("age") or 0) >= 60
        profile["is_widow"] = profile.get("is_widow", False)
        profile["is_student"] = profile.get("occupation") == "student"
        profile["profile_complete"] = True
        profile["missing_critical"] = []
        return {**state, "normalized_profile": profile, "needs_more_info": False, "missing_fields": []}

    # ── WhatsApp mode: incremental extraction ──────────────────────────────
    
    cached_profile = state.get("normalized_profile")
    if cached_profile and cached_profile.get("profile_complete"):
        logger.info(f"Using cached COMPLETE profile for {state['session_id']}, skipping Gemini extraction.")
        return {
            **state,
            "needs_more_info": False,
            "missing_fields": []
        }
    elif cached_profile:
        logger.info(f"Cached profile for {state['session_id']} is incomplete — re-extracting with Gemini.")
        
    conversation = state.get("conversation_history") or []
    conv_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in conversation)

    fallback_profile = {
        "profile_complete": False,
        "missing_critical": ["state", "occupation", "age", "income"],
        "language_preference": "hi",
    }

    if not HAS_GEMINI:
        return {**state, "normalized_profile": fallback_profile,
                "needs_more_info": True, "missing_fields": fallback_profile["missing_critical"]}

    prompt = f"""
Extract an Indian citizen's profile from this WhatsApp conversation with
GrantBot, a government scheme discovery assistant.

CONVERSATION:
{conv_text}

Return ONLY this JSON (no markdown, no explanation):
{PROFILE_JSON_SCHEMA}

RULES:
- "kheti/zameen/khet" mentioned -> occupation=farmer, has_land=true
- "vidhwa/pati ka dehant" mentioned -> is_widow=true
- BPL = annual income under Rs 1,20,000/year (roughly Rs 10,000/month)
- profile_complete=true ONLY when state + occupation + age + income_category
  are all known. Do not guess values that were never mentioned.
"""
    try:
        raw = generate_with_retry(FLASH_JSON, prompt, max_retries=2)
        profile = parse_json_safely(raw, fallback=fallback_profile)
    except Exception as e:
        logger.error(f"Intake extraction failed for session {state['session_id']}: {e}")
        profile = fallback_profile

    needs_more = not profile.get("profile_complete", False)
            
    return {
        **state,
        "normalized_profile": profile,
        "needs_more_info": needs_more,
        "missing_fields": profile.get("missing_critical", []),
    }


# ── Node 2: Match — Sibasis Das's hard-filter-then-score approach ─────────────

def _hard_filter_pass(scheme_meta: dict, profile: dict) -> bool:
    """
    Structured eligibility check — runs BEFORE any similarity ranking.
    This is the core of Sibasis's advice: don't trust embeddings alone
    to know a scheme's income ceiling excludes this user. Check the
    extracted metadata field directly.
    """
    income_ceiling = scheme_meta.get("income_ceiling_inr", 999_999_999)
    user_income = profile.get("annual_income_inr") or (
        60_000 if profile.get("income_category") == "BPL" else 150_000
    )
    if user_income > income_ceiling:
        return False

    min_age, max_age = scheme_meta.get("min_age", 0), scheme_meta.get("max_age", 100)
    user_age = profile.get("age") or 35
    if not (min_age <= user_age <= max_age):
        return False

    state_scope = scheme_meta.get("state_scope", "central")
    if state_scope != "central" and state_scope != profile.get("state"):
        return False

    return True


def _soft_score(scheme: dict, profile: dict) -> float:
    """Relevance ranking on top of the hard filter — schemes that pass the
    filter but aren't a great fit still rank below schemes that are."""
    score = 0.0
    elig = scheme.get("eligibility", {})
    occs = [o.lower() for o in elig.get("occupation", [])]
    user_occ = (profile.get("occupation") or "").lower()

    if occs and user_occ and any(o in user_occ or user_occ in o for o in occs):
        score += 5
    if profile.get("is_senior") and scheme.get("category") == "senior":
        score += 6
    if profile.get("is_widow") and "widow" in scheme.get("id", ""):
        score += 8
    if profile.get("is_student") and scheme.get("category") == "student":
        score += 5
    if profile.get("income_category") in ("BPL", "low") and scheme.get("category") in ("housing", "health", "food"):
        score += 3
    if profile.get("artisan_trade") and scheme.get("id") == "pm_vishwakarma":
        score += 7
    if profile.get("occupation") == "farmer" and scheme.get("category") == "farmer":
        score += 4
    if profile.get("has_land") and scheme.get("id") == "kisan_credit_card":
        score += 3

    return score


def _match_via_chromadb(profile: dict) -> list[dict]:
    """RAG path: embed the profile as a citizen-language query, retrieve
    candidates, hard-filter them, then soft-score the survivors."""
    query = (
        f"Government scheme for {profile.get('occupation', 'citizen')} in "
        f"{profile.get('state', 'India')}, age {profile.get('age', 40)}, "
        f"income {profile.get('income_category', 'low')}, "
        f"category {profile.get('social_category', 'General')}"
    )
    if profile.get("is_widow"):
        query += ", widow pension"
    if profile.get("is_senior"):
        query += ", senior citizen pension"
    if profile.get("is_student"):
        query += ", student scholarship"

    embedding = genai.embed_content(
        model="models/text-embedding-004", content=query, task_type="retrieval_query"
    )["embedding"]

    results = _scheme_collection.query(
        query_embeddings=[embedding], n_results=10, include=["metadatas", "distances"]
    )

    candidates = []
    for i, meta in enumerate(results["metadatas"][0]):
        if not _hard_filter_pass(meta, profile):
            continue
        similarity = 1 - results["distances"][0][i]
        full_scheme = _SEED_INDEX.get(meta["id"], meta)  # prefer rich seed data when available
        score = similarity * 10 + _soft_score(full_scheme, profile)
        candidates.append({**full_scheme, "_score": score})

    candidates.sort(key=lambda x: x["_score"], reverse=True)
    return candidates[:4]


def _match_via_seed_fallback(profile: dict) -> list[dict]:
    """Pure rule-based path when ChromaDB isn't running. Same filter logic,
    same result shape — callers never need to know which path executed.
    
    NOTE: Every scheme that passes the hard filter is included, even with
    score 0 — the hard filter already guarantees basic eligibility. The
    soft score only ranks within that set. Filtering on score > 0 was a
    bug that silently excluded valid schemes for users whose profile
    didn't trigger any bonus conditions (e.g., salaried workers)."""
    candidates = []
    for scheme in _SEED_SCHEMES:
        if not _hard_filter_pass(scheme, profile):
            continue
        score = _soft_score(scheme, profile)
        candidates.append({**scheme, "_score": score})
    candidates.sort(key=lambda x: (x["_score"], x.get("annual_value", 0)), reverse=True)
    return candidates[:4]


def match_node(state: AgentState) -> AgentState:
    if state["needs_more_info"]:
        return {**state, "matched_schemes": []}

    profile = state["normalized_profile"]
    if HAS_CHROMADB:
        try:
            matches = _match_via_chromadb(profile)
        except Exception as e:
            logger.warning(f"ChromaDB match failed ({e}), falling back to seed JSON for this request")
            matches = _match_via_seed_fallback(profile)
    else:
        matches = _match_via_seed_fallback(profile)

    return {**state, "matched_schemes": matches}


# ── Node 3: Explain ────────────────────────────────────────────────────────────

def explain_node(state: AgentState) -> AgentState:
    """
    Age-aware tone, bilingual output, strictly grounded in scheme data.
    The grounding rule matters: Gemini is instructed to use ONLY the
    benefit amounts passed in, never estimate or round attractively.
    """
    profile = state["normalized_profile"]
    matches = state["matched_schemes"]
    age = profile.get("age") or 35

    tone = (
        "casual, warm, use 1-2 emojis naturally" if age < 25 else
        "clear, professional, respectful" if age < 55 else
        "warm, gentle, very simple short sentences, no jargon at all"
    )

    # ── Case: need more info ────────────────────────────────────────────────
    if state["needs_more_info"]:
        missing = state["missing_fields"][:2] or ["आपकी जानकारी"]
        if not HAS_GEMINI:
            return {**state, "explanation_hi": f"कृपया बताएं: {', '.join(missing)}",
                    "explanation_en": f"Please tell us: {', '.join(missing)}"}
        try:
            hi = generate_with_retry(
                FLASH,
                f"Tone: {tone}. Ask warmly for: {', '.join(missing)}. "
                f"Explain briefly why (to find the right government schemes). "
                f"Under 60 words. Reply ONLY in Hindi (Devanagari script).",
                max_retries=1,
            )
            en = generate_with_retry(
                FLASH,
                f"Tone: {tone}. Ask warmly for: {', '.join(missing)}. "
                f"Explain briefly why (to find the right government schemes). "
                f"Under 60 words. Reply ONLY in English.",
                max_retries=1,
            )
        except Exception as e:
            logger.error(f"Follow-up question generation failed: {e}")
            hi = f"कृपया बताएं: {', '.join(missing)}"
            en = f"Please tell us: {', '.join(missing)}"
        return {**state, "explanation_hi": hi, "explanation_en": en}

    # ── Case: no matches ─────────────────────────────────────────────────────
    if not matches:
        return {
            **state,
            "explanation_hi": "अभी कोई योजना नहीं मिली। कृपया अपना राज्य और पेशा फिर से बताएं।",
            "explanation_en": "No matching schemes found right now. Please share your state and occupation again.",
        }

    # ── Case: matches found — main value delivery ───────────────────────────
    scheme_lines = []
    for i, s in enumerate(matches[:3], 1):
        docs = ", ".join(s.get("documents", [])[:2]) or "Aadhaar, Bank account"
        scheme_lines.append(
            f"{i}. {s['name']} ({s.get('name_hindi', '')}) — {s.get('benefit', '')} "
            f"— Docs: {docs} — Apply: {s.get('apply_url', '')}"
        )
    schemes_block = "\n".join(scheme_lines)
    total_value = sum(s.get("annual_value", 0) for s in matches)

    if not HAS_GEMINI:
        fallback = f"आपको {len(matches)} योजनाएँ मिलीं:\n{schemes_block}"
        return {**state, "explanation_hi": fallback, "explanation_en": fallback}

    base = f"""
Tone: {tone}. User: {profile.get('occupation')}, {profile.get('state')}, age {age}.
Schemes found (use ONLY this data — NEVER invent or round amounts):
{schemes_block}
Total potential value: Rs {total_value:,}

Write a message that: opens with the total value as a hook, lists each
scheme with its ONE key document, says which scheme to apply for FIRST
and why, ends by offering help with the application. Under 250 words.
"""
    try:
        hi = generate_with_retry(FLASH, base + "\nReply ONLY in Hindi (Devanagari script).", max_retries=2)
        en = generate_with_retry(FLASH, base + "\nReply ONLY in English.", max_retries=2)
    except Exception as e:
        logger.error(f"Explanation generation failed for session {state['session_id']}: {e}")
        hi = en = f"Schemes found:\n{schemes_block}"

    return {**state, "explanation_hi": hi, "explanation_en": en}


# ── Graph Assembly ──────────────────────────────────────────────────────────

def _build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("intake", intake_node)
    graph.add_node("match", match_node)
    graph.add_node("explain", explain_node)
    graph.set_entry_point("intake")
    graph.add_edge("intake", "match")
    graph.add_edge("match", "explain")
    graph.add_edge("explain", END)
    return graph.compile()


_graph = _build_graph()


def _format_matches(matches: list[dict]) -> list[dict]:
    return [{
        "scheme_id": m["id"],
        "name": m["name"],
        "ministry": m.get("ministry", ""),
        "benefit_amount": m.get("benefit", ""),
        "documents_required": m.get("documents", []),
        "application_url": m.get("apply_url", ""),
        "annual_value": m.get("annual_value", 0),
        "confidence_score": round(m.get("_score", 0), 2),
    } for m in matches]


# ── Public Entry Points ──────────────────────────────────────────────────────
# These are the ONLY two functions the rest of the system calls.
# Both wrap the synchronous graph invocation in a thread so the FastAPI
# event loop isn't blocked while Gemini API calls are in flight — a
# genuine "better handling" fix since Gemini calls can take 1-3 seconds.

async def run_eligibility_agent_web(session_id: str, profile: dict) -> dict:
    state: AgentState = {
        "session_id": session_id, "channel": "web", "raw_profile": profile,
        "conversation_history": None, "normalized_profile": {}, "matched_schemes": [],
        "explanation_hi": "", "explanation_en": "", "needs_more_info": False, "missing_fields": [],
    }
    final = await asyncio.to_thread(_graph.invoke, state)
    return {
        "matches": _format_matches(final["matched_schemes"]),
        "explanation_hi": final["explanation_hi"],
        "explanation_en": final["explanation_en"],
    }


async def run_eligibility_agent_whatsapp(session_id: str, conversation: list) -> dict:
    cached = None
    try:
        cached = await get_cached_profile(session_id)
    except Exception as e:
        logger.warning(f"Failed to read cache for {session_id}: {e}")

    state: AgentState = {
        "session_id": session_id, "channel": "whatsapp", "raw_profile": None,
        "conversation_history": conversation, 
        "normalized_profile": cached if cached else {}, 
        "matched_schemes": [],
        "explanation_hi": "", "explanation_en": "", 
        "needs_more_info": False, "missing_fields": [],
    }
    
    final = await asyncio.to_thread(_graph.invoke, state)
    
    if not final["needs_more_info"] and not cached:
        try:
            await save_cached_profile(session_id, final["normalized_profile"])
        except Exception as e:
            logger.warning(f"Failed to write cache for {session_id}: {e}")

    return {
        "matches": _format_matches(final["matched_schemes"]),
        "explanation_hi": final["explanation_hi"],
        "explanation_en": final["explanation_en"],
    }
