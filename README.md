# Sarthi Kalyan — AI Sathi for Government Schemes 🇮🇳

> **XPRIZE Build with Gemini 2026** | Money & Financial Access

AI-powered assistant that matches low-income Indian families to government welfare schemes they qualify for but don't know exist — via WhatsApp and a web dashboard, in Hindi and English.

## 🎯 The Problem

India runs **750+ government welfare schemes** worth ₹15 lakh crore/year. But **₹3+ lakh crore goes unclaimed** annually because the families who need them can't navigate 50 ministry websites in bureaucratic English.

## 💡 What Sarthi Kalyan Does

1. **Asks 5 simple questions** — age, state, occupation, income, category
2. **Matches you to eligible schemes** — using Gemini 2.0 Flash + LangGraph
3. **Explains in Hindi + English** — benefits, documents needed, how to apply
4. **Tracks your application** — discovery → documents → applied → approved
5. **Works on WhatsApp** — no app download, no smartphone literacy required

## 🚀 Quick Start (Local Dev)

```bash
# Backend
cd backend
cp .env.example .env          # Add your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                    # Opens http://localhost:3000
```

**Only `GEMINI_API_KEY` is required.** Everything else degrades gracefully — see [`config.py`](backend/config.py).

## 🏗️ Architecture

```
One LangGraph Agent → Two Entry Points → Shared Everything

WhatsApp (Twilio) ─→ api/whatsapp.py ─→ agents/eligibility.py ─→ Gemini 2.0 Flash
Web Dashboard     ─→ api/match.py    ─→ agents/eligibility.py ─→ Gemini 2.0 Flash
Web Chat          ─→ api/match.py    ─→ agents/eligibility.py ─→ Gemini 2.0 Flash
```

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health + capability flags |
| `/stats` | GET | XPRIZE evidence summary (public) |
| `/api/auth/dev-login` | POST | Dev-mode phone login |
| `/api/match` | POST | Web scheme matching (structured profile) |
| `/api/chat` | POST | Conversational scheme matching |
| `/api/whatsapp/webhook` | POST | Twilio WhatsApp webhook |
| `/api/payment/create-order` | POST | Razorpay payment order |
| `/api/impact/summary` | GET | Impact metrics aggregation |
| `/api/tracker/status` | GET | Application tracking |
| `/api/admin/clients` | GET | NGO dashboard |

## 🤖 AI Usage — All Gemini

| Function | Model | What It Does |
|----------|-------|-------------|
| Profile Extraction | Gemini 2.0 Flash | Extracts structured JSON from freeform Hindi/English text |
| Scheme Explanation | Gemini 2.0 Flash | Generates personalized bilingual scheme descriptions |
| Semantic Search | text-embedding-004 | Dual-language scheme embeddings via ChromaDB |
| Retry Wrapper | — | All Gemini calls go through `generate_with_retry()` |

## 📊 XPRIZE Evidence

Every AI decision is logged for the evidence trail:

- **agent_logs** — session_id, channel, schemes matched, timestamps
- **impact_log** — benefit amounts surfaced per session
- **revenue_log** — payment transactions
- **customer_log** — user testimonials

Hit `/stats` to see the live headline.

## 🛡️ Safety

- Zero Aadhaar storage (never, not even hashed)
- Phone numbers SHA-256 hashed before any storage
- Razorpay signatures verified with `hmac.compare_digest`
- No raw exceptions to client — structured `{error, code}` only
- Production refuses to start without required env vars

## 💰 Business Model

| Tier | Price | Features |
|------|-------|----------|
| Free | ₹0 | 1 scheme report (lifetime) |
| Pro | ₹99/month | Unlimited reports + tracking + reminders |
| NGO | ₹999/month | Bulk client management for field workers |

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Saffron | `#FF9933` | Primary, CTAs |
| Navy | `#000080` | Headers, text |
| Green | `#138808` | Success, accent |
| Font | Inter + Noto Sans Devanagari | UI + Hindi |

## Tech Stack

- **Backend**: FastAPI, Python 3.10, LangGraph, Pydantic v2
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: Gemini 2.0 Flash, text-embedding-004
- **Vector DB**: ChromaDB (optional → rule-based fallback)
- **User DB**: Firestore (optional → SQLite fallback)
- **Analytics**: BigQuery (optional → local JSONL fallback)
- **Payments**: Razorpay
- **Auth**: Firebase Phone OTP → JWT httpOnly cookie
- **WhatsApp**: Twilio
- **Deploy**: Cloud Run + Vercel

## License

Built for XPRIZE Build with Gemini 2026.
