# Sarthi Kalyan — Gemini Handoff Prompt
## Paste this ENTIRE document as your first message to Gemini when Claude tokens are exhausted.

---

## IDENTITY

You are building Sarthi Kalyan — an AI agent that finds Indian citizens the government welfare schemes they qualify for but don't know exist. It has TWO entry points (Next.js web dashboard + WhatsApp bot) powered by ONE shared LangGraph eligibility engine. Built for XPRIZE Build with Gemini 2026, Money & Financial Access category.

---

## WHAT IS ALREADY BUILT AND WORKING (DO NOT REWRITE)

The **entire backend** is complete. Every file below exists, has real code, and follows established conventions. Read them before touching anything.

### Directory Structure (REAL, ON DISK)
```
Sarthi Kalyan/
├── AGENTS.md                       ← project rules, design system, safety rules
├── GEMINI.md                       ← agent config, planning mode rules
├── .gitignore
├── backend/
│   ├── __init__.py
│   ├── config.py                   ← THE flexibility mechanism: HAS_X flags, Settings dataclass, dotenv loading
│   ├── main.py                     ← FastAPI entry point, lifespan, CORS, router mounting, /health, /stats
│   ├── requirements.txt            ← pinned Python deps
│   ├── .env.example                ← env var template
│   ├── agents/
│   │   ├── __init__.py
│   │   └── eligibility.py          ← THE unified brain: AgentState, intake/match/explain nodes, LangGraph graph
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py                 ← POST /api/auth/session — Firebase OTP + Turnstile → JWT cookie
│   │   ├── match.py                ← POST /api/match — web dashboard scheme matching
│   │   ├── whatsapp.py             ← POST /api/whatsapp/webhook — Twilio WhatsApp
│   │   └── payments.py             ← POST /api/payment/create-order, POST /api/payment/verify
│   ├── db/
│   │   ├── __init__.py
│   │   ├── firestore.py            ← session/trial storage with in-memory fallback
│   │   └── bigquery.py             ← XPRIZE evidence logging with local JSONL fallback
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── gemini_helpers.py       ← generate_with_retry() + parse_json_safely()
│   │   └── razorpay.py             ← order creation + timing-safe signature verification
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py                 ← JWT session middleware, cookie-based
│   ├── data/
│   │   └── schemes_seed.json       ← 20 hand-curated Indian government schemes
│   └── logs/
│       └── .gitkeep
├── scripts/
│   └── ingest_schemes.py           ← dual-embedding ChromaDB ingestion (seed + HuggingFace)
└── docs/
    ├── systemarchitechture.md
    └── sessionprompt.md
```

### Key Architecture Decisions (MUST FOLLOW)

1. **One Agent, Two Entry Points**: `eligibility.py` exports `run_eligibility_agent_web()` and `run_eligibility_agent_whatsapp()`. Both populate the same `AgentState` and run through identical intake→match→explain nodes.

2. **Flexibility Principle** (`config.py`): Every capability (ChromaDB, Firestore, BigQuery, Razorpay) is detected ONCE at startup as a `HAS_X` boolean. Modules branch on these flags in exactly ONE place (the data-layer function), never in route handlers. Local dev needs only `GEMINI_API_KEY`.

3. **Error Convention**: All API errors return `{"error": "message", "code": "ERROR_CODE"}`. Never return raw Python exceptions.

4. **Logging**: Every agent decision goes through `db/bigquery.py:log_event()` via `asyncio.create_task()` — async, non-blocking. Four log tables: `agent_logs`, `revenue_log`, `impact_log`, `customer_log`.

5. **Safety Rules** (NEVER VIOLATE):
   - Never store Aadhaar numbers in any form
   - Phone numbers always SHA-256 hashed via `db.firestore.hash_phone()` before storage
   - All Razorpay signatures verified with `hmac.compare_digest` — never `==`
   - Env vars ONLY from `config.py`'s Settings — never scattered `os.environ.get()`
   - Every Gemini call goes through `utils/gemini_helpers.generate_with_retry()`

---

## DESIGN SYSTEM

| Token | Value | Usage |
|-------|-------|-------|
| Saffron | `#FF9933` | Primary, CTAs |
| Navy | `#000080` | Headers, text |
| Green | `#138808` | Success, accent |
| White | `#FFFFFF` | Backgrounds |
| Font UI | Inter | All UI text |
| Font Hindi | Noto Sans Devanagari | Hindi text |

- Scheme cards: 4px saffron left border
- Tricolour stripe at page top (saffron-white-green)
- **No dark mode** in v1 — target users are on low-end Android devices
- Mobile-first, touch-friendly, works on 4G

---

## WHAT STILL NEEDS TO BE BUILT

### Priority 1: Frontend (Next.js 14 App Router, TypeScript strict, Tailwind CSS)

Deploy target: Vercel. Backend API at: `http://localhost:8000` (dev) / Cloud Run URL (prod).

**Pages needed:**

1. **`/` — Homepage**
   - Hero: "सरकारी योजनाओं का फायदा उठाएं" with saffron CTA "अपनी योजनाएं खोजें"
   - How-it-works: 3-step (Tell us → We match → You apply)
   - Trust signals: scheme count, families helped (pull from `/stats`)
   - Tricolour stripe at top

2. **`/auth` — Phone OTP Login**
   - Firebase Phone Authentication
   - Cloudflare Turnstile widget
   - On success: call `POST /api/auth/session` with `{id_token, turnstile_token}`
   - Backend sets httpOnly cookie `sarthi_kalyan_session`

3. **`/dashboard` — Scheme Discovery (the money page)**
   - Profile form: age, state (dropdown 28+8 UTs), occupation, income, social_category, has_aadhaar
   - Submit → `POST /api/match` with profile
   - Results: scheme cards with saffron left border, showing name (Hindi+English), benefit amount, required docs, apply link
   - Bilingual explanation panel (Hindi + English) from the agent
   - Paywall: after free trial, show upgrade modal (₹99 for 5 reports)

4. **`/payment` — Razorpay Checkout**
   - Call `POST /api/payment/create-order` → get order_id
   - Open Razorpay checkout.js with order_id
   - On success callback: `POST /api/payment/verify` with signature

**Frontend file structure:**
```
frontend/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← root layout, Inter + Noto Sans Devanagari fonts
│   │   ├── page.tsx            ← homepage
│   │   ├── auth/page.tsx       ← login
│   │   ├── dashboard/page.tsx  ← scheme discovery
│   │   └── payment/page.tsx    ← checkout
│   ├── components/
│   │   ├── SchemeCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── TricolourStripe.tsx
│   │   └── PaymentModal.tsx
│   └── lib/
│       └── api.ts              ← fetch wrapper for backend calls
```

### Priority 2: Peripheral Backend Routers

These follow the EXACT pattern of `api/match.py` and `api/whatsapp.py`. `main.py` already has `_safe_mount()` stubs waiting:

1. **`backend/api/reminders.py`** — POST /api/reminders/set, GET /api/reminders/list
   - Track scheme application deadlines
   - Uses `db.firestore.track_scheme()` and `get_tracked_schemes()`

2. **`backend/api/tracker.py`** — GET /api/tracker/status, POST /api/tracker/update
   - Application progress tracking (not_started → documents_collected → applied → approved)

3. **`backend/api/admin.py`** — NGO dashboard routes
   - Requires tier="ngo" check
   - Bulk client management, aggregated impact stats

4. **`backend/api/impact.py`** — GET /api/impact/summary
   - XPRIZE evidence aggregation from BigQuery/local logs

5. **`scripts/send_reminders.py`** — Cloud Scheduler cron job
   - Queries tracked schemes with upcoming deadlines, sends WhatsApp reminders

### Priority 3: Deployment

- `Dockerfile` for backend (Python 3.11, uvicorn)
- `cloudbuild.yaml` for Cloud Run (asia-south1)
- `vercel.json` for frontend
- Cloud Scheduler setup for nightly ingestion refresh + reminders

---

## HOW TO RUN LOCALLY RIGHT NOW

```bash
cd Sarthi Kalyan/backend
cp .env.example .env
# Edit .env → add your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Open http://localhost:8000/health → should show capabilities JSON
```

---

## CONVENTIONS YOU MUST FOLLOW

1. **Pydantic models**: Always use `ConfigDict(strict=True)`
2. **Route errors**: Always `{"error": "...", "code": "ERROR_CODE"}` dict
3. **Logging**: Use `asyncio.create_task(log_event(...))` — never block the response
4. **New integrations**: Detect in `config.py` as `HAS_X`, branch in ONE data-layer function
5. **Gemini calls**: Always through `generate_with_retry()`, never raw `model.generate_content()`
6. **Phone numbers**: Always `hash_phone()` before any storage or logging
7. **Payments**: Always `hmac.compare_digest()` for signatures
8. **Frontend**: Next.js 14 App Router, TypeScript strict, Tailwind CSS, mobile-first
9. **Model routing**: Gemini 2.0 Flash for everything (fast/cheap), text-embedding-004 for embeddings

---

## YOUR FIRST TASK

Start with **Priority 1: Frontend**. Create the Next.js app in `Sarthi Kalyan/frontend/` with:
```bash
npx -y create-next-app@latest ./frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

Then build the homepage, auth page, dashboard, and payment page following the design system above. The backend is running at `http://localhost:8000` — all API endpoints are real and tested.

Remember: the user's target audience is rural Indian citizens on low-end Android phones with 4G connections. Every design decision should optimize for them — large touch targets, minimal data usage, fast load times, clear Hindi text.
