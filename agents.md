# GrantBot — Agent Rules (Cross-Tool: Antigravity + Claude Code + Cursor)
# Place in project root. All tools read this automatically.
# Priority in Antigravity: GEMINI.md > AGENTS.md > .agent/rules/

## Project Identity
GrantBot is ONE system with TWO entry points: a Next.js web dashboard and
a WhatsApp bot, both served by the SAME LangGraph eligibility agent
(backend/agents/eligibility.py). There is no separate "MVP" and "full
system" anymore — this IS the full system, built to run in degraded
mode locally and in full mode in production.

Built for XPRIZE Build with Gemini 2026, Money & Financial Access category.

## What's Already Real (read before touching — extend, don't rewrite)
- backend/config.py — capability detection, the flexibility mechanism
- backend/utils/gemini_helpers.py — retry wrapper for all Gemini calls
- backend/agents/eligibility.py — the unified agent (web + WhatsApp)
- backend/db/firestore.py — session/trial storage, in-memory fallback
- backend/db/bigquery.py — evidence logging, local JSONL fallback
- backend/utils/razorpay.py — payment order + signature verification
- backend/middleware/auth.py — JWT session middleware
- backend/api/{auth,match,whatsapp,payments}.py — core routes
- backend/main.py — entry point, mounts core + optional routers
- backend/data/schemes_seed.json — 20 hand-curated schemes
- scripts/ingest_schemes.py — ChromaDB ingestion, dual-embedding

## What's Still Needed (build via .antigravity/SESSION_PROMPTS.md)
- frontend/ — homepage, auth page, dashboard, scheme cards (carries
  forward from earlier design work — see SESSION_PROMPTS.md SESSION_A)
- backend/api/{reminders,tracker,admin,impact}.py — peripheral routers,
  main.py already has safe-mount stubs waiting for these
- Deployment configs (Dockerfile, cloudbuild.yaml, Cloud Scheduler)

## Tech Stack (do not deviate without explicit instruction)
- Frontend: Next.js 14 App Router, TypeScript strict, Tailwind CSS
- Backend: FastAPI Python 3.11, LangGraph 0.2+, Pydantic v2
- AI: Gemini 2.0 Flash (fast/cheap), text-embedding-004
- Vector DB: ChromaDB, cosine index, dual-embedding per scheme
- User DB: Firestore (session-scoped) — in-memory fallback always available
- Analytics: BigQuery — local JSONL fallback always available
- Payments: Razorpay (India-first)
- Auth: Firebase Phone OTP -> JWT httpOnly cookie
- Bot protection: Cloudflare Turnstile (dev mode: validation skipped)
- Deploy: Cloud Run (backend, asia-south1), Vercel (frontend)
- WhatsApp: Twilio Sandbox (dev) -> Meta Business API (prod, Phase 2)

## The Flexibility Principle (read backend/config.py first)
Every capability (ChromaDB, Firestore, BigQuery, Razorpay) is detected
ONCE at startup and exposed as a HAS_X boolean. Every module imports
these flags instead of doing its own try/except. This means:
  - Local dev needs ONLY GEMINI_API_KEY to run
  - Adding a service (e.g. docker run chromadb) upgrades matching
    quality without any code change
  - Production (ENV=production) refuses to start if Gemini, Firestore,
    or Razorpay are missing — fail loud at startup, not silently later
When adding a new integration, follow this pattern: detect once in
config.py, expose a HAS_X flag, branch on it in exactly one place
(the data-layer function), never in route handlers.

## Hard Safety Rules — Never Violate
1. Never store Aadhaar numbers in ANY form (plain, hashed, encrypted)
2. Session profile data -> Firestore, no permanent PII retention design
3. All public API routes validate Cloudflare Turnstile server-side
   (dev mode: settings.turnstile_secret empty -> validation skipped,
   this is intentional for local testing, never true in prod)
4. LangGraph state is scoped per session_id — no cross-session bleeding
5. Every agent decision logged via db/bigquery.py log_event() — async,
   non-blocking, this IS the XPRIZE evidence trail
6. Env vars ONLY from config.py's Settings — never os.environ.get()
   scattered through route files
7. Phone numbers always SHA-256 hashed via db.firestore.hash_phone()
   before any storage or logging operation
8. All Razorpay signatures verified with hmac.compare_digest — never `==`
9. Never return raw Python exceptions to the client — {error, code} only
10. Every Gemini call goes through utils/gemini_helpers.generate_with_retry()

## Design System
Saffron #FF9933 (primary/CTAs) | Navy #000080 (headers/text) |
Green #138808 (success/accent) | White #FFFFFF (backgrounds)
Font UI: Inter | Font Hindi: Noto Sans Devanagari
Scheme cards: 4px saffron left border. Tricolour stripe at page top.
No dark mode in v1 — target users are on low-end devices.

## Model Routing (cost control)
- Gemini 2.0 Flash: intake, explain, translate, chatbot, summaries
- text-embedding-004: all scheme and query embeddings
- Reserve Gemini Pro for cases where Flash output quality is
  demonstrably insufficient — check cost impact before routing there

## XPRIZE Evidence (every feature must feed these four logs)
- agent_logs — timestamp, session_id, agent_name, decision, scheme_ids
- revenue_log — payment_id, amount, tier, phone_hash
- impact_log — session_id, scheme_ids, benefit_amount_inr
- customer_log — name (first name only), phone_hash, testimonial
These four ARE your submission. /stats aggregates them into your headline.