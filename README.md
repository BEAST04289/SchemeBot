# GrantBot

AI-powered Indian government scheme discovery — WhatsApp + Web.

Built for **XPRIZE Build with Gemini 2026**, Money & Financial Access category.

## What It Does

GrantBot finds Indian citizens the government welfare schemes they already qualify for but don't know exist — PM Kisan, widow pensions, scholarships, artisan grants, health insurance — delivered through WhatsApp and a web dashboard, both powered by one shared eligibility engine.

## Quick Start (Local Dev)

```bash
cd backend
cp .env.example .env
# Edit .env → add only your GEMINI_API_KEY

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/health — you should see:
```json
{
  "status": "ok",
  "capabilities": {
    "gemini": true,
    "chromadb": false,
    "firestore": false,
    "bigquery": false,
    "razorpay": false
  }
}
```

**Only `GEMINI_API_KEY` is required.** Everything else degrades gracefully — see `backend/config.py` for the flexibility mechanism.

## Architecture

```
One LangGraph Agent → Two Entry Points → Shared Everything Else

WhatsApp (Twilio) ─→ api/whatsapp.py ─→ agents/eligibility.py ─→ Gemini Flash
Web Dashboard     ─→ api/match.py    ─→ agents/eligibility.py ─→ Gemini Flash
```

See `docs/SYSTEM_ARCHITECTURE.md` for the full design.

## Tech Stack

- **Backend**: FastAPI, Python 3.11, LangGraph 0.2+, Pydantic v2
- **AI**: Gemini 2.0 Flash (fast/cheap), text-embedding-004
- **Vector DB**: ChromaDB (optional — falls back to rule-based matching)
- **User DB**: Firestore (optional — falls back to in-memory)
- **Analytics**: BigQuery (optional — falls back to local JSONL)
- **Payments**: Razorpay
- **Auth**: Firebase Phone OTP → JWT httpOnly cookie
- **Deploy**: Cloud Run (backend), Vercel (frontend)

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Saffron | `#FF9933` | Primary, CTAs |
| Navy | `#000080` | Headers, text |
| Green | `#138808` | Success, accent |
| Font | Inter + Noto Sans Devanagari | |

