# Sarthi Kalyan — Antigravity-Specific Rules (GEMINI.md)
# Highest priority over AGENTS.md in Antigravity. Covers Manager Surface
# squad configuration and Planning Mode preferences specific to this IDE.

## Current Build State
Backend core is DONE — real, working code, not stubs (see AGENTS.md
"What's Already Real"). Every Antigravity session from here targets ONLY
what's listed in "What's Still Needed." Do not regenerate existing files
unless explicitly asked to modify them — read them first, extend them.

## Agent Squad Configuration (Manager Surface)

Agent 1 — "Architect" (model: claude-opus-4-6)
  Role: Reviews plans against AGENTS.md before any session starts.
  Use for: deciding how new peripheral routers should integrate with
  the existing safe-mount pattern in main.py.

Agent 2 — "Backend" (model: claude-opus-4-6)
  Role: api/reminders.py, api/tracker.py, api/admin.py, api/impact.py
  Must follow the existing file patterns exactly — same error-code
  convention, same async log_event() calls, same Pydantic strict models.
  Files it owns: backend/api/{reminders,tracker,admin,impact}.py

Agent 3 — "Frontend" (model: gemini-3-flash)
  Role: All Next.js pages and React components
  Files it owns: frontend/**

Agent 4 — "Security" (model: claude-opus-4-6)
  Role: Reviews any NEW code touching auth, payments, or PII before merge
  Required for: admin.py (NGO dashboard handles client PII)

Agent 5 — "QA" (model: gemini-3-flash)
  Role: pytest for backend, jest for frontend
  Write tests against the REAL functions in agents/eligibility.py and
  db/firestore.py — they already exist, test them, don't mock what's real

## Planning Mode Rules
ALWAYS use Planning Mode for: new routers, anything touching payments
or auth, any change to the AgentState shape in eligibility.py.
Fast Mode is fine for: frontend styling tweaks, typo fixes, adding a
new scheme to schemes_seed.json.

## Context Strategy
Backend core is now ~1,800 lines across 12 files. For any session
touching backend/, load config.py, agents/eligibility.py, and the
specific file being modified — not the whole directory. Opus 4.6's 1M
context can hold it all, but loading only what's relevant keeps
sessions faster and cheaper.

## Quota Management
Spend Opus 4.6 on: Security agent (auth/payment review), Backend agent
when building admin.py (handles NGO client PII — gets it right the
first time matters more than speed here).
Use Gemini for: Frontend (all of it), QA (test generation), simple
peripheral routes like reminders.py and tracker.py which mostly follow
the exact pattern already established in match.py and whatsapp.py.

## When Opus Quota Runs Out
Switch to gemini-3-1-pro. Paste this context first:
"Here is backend/agents/eligibility.py [paste file] — this is the
existing pattern. Build backend/api/[X].py following the SAME
conventions: async def route handlers, Pydantic strict models, error
codes as {error, code} dicts, asyncio.create_task() for logging calls
that must never block the response."
Gemini needs the existing file pasted as context far more than Opus
does — Opus infers patterns from a directory listing, Gemini needs to
see the actual code it's matching style against.