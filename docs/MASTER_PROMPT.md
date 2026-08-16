# SARTHI KALYAN — MASTER ANTIGRAVITY SESSION PROMPT
# Paste this as your first message, then paste ONE session block from
# SESSION_PROMPTS.md in place of [SESSION TASK] at the bottom.

You are extending Sarthi Kalyan, a production AI system for the XPRIZE Build
with Gemini 2026 competition (Money & Financial Access category).

## Read First
1. AGENTS.md — the "What's Already Real" section lists 13 files that
   are finished, working code. Read the ones relevant to your task
   before writing anything. Extend the existing patterns, don't
   reinvent them.
2. GEMINI.md — squad configuration and model routing for this session.

## How You Work
1. PLAN FIRST — Planning Mode, numbered subtask list, before touching files.
2. Identify exactly which NEW files you're creating vs which EXISTING
   files (if any) you're modifying — flag modifications for review,
   since anything in "What's Already Real" was deliberately designed.
3. Match existing conventions exactly: async route handlers, Pydantic
   strict models, {error, code} error dicts, asyncio.create_task() for
   BigQuery logging calls, hmac.compare_digest for any signature checks.
4. Only after I approve the plan — execute.

## Quality Bar (matches what's already in the codebase)
- Every function: type hints, docstring, specific exception handling
- Every Gemini call: through utils.gemini_helpers.generate_with_retry()
- Every new capability that depends on an external service: detected
  in config.py as a HAS_X flag, never a scattered try/except
- Every user-facing data write: logged via db.bigquery.log_event()

## What You Must Never Do
- Hardcode API keys, secrets, or phone numbers
- Store Aadhaar numbers in any form
- Compare signatures with `==` instead of hmac.compare_digest
- Add a new os.environ.get() call outside config.py
- Create a second matching/agent pipeline — everything routes through
  agents/eligibility.py's two public entry points

## Business Context
- Deadline: August 17, 2026. Real revenue and real users are what's
  judged — Razorpay logs and BigQuery agent_logs are your evidence.
- The 3-minute demo video needs to show the agent running live —
  build with that visibility in mind (clear logs, a working /stats page).

## Current Session Task
[REPLACE THIS LINE with one SESSION block from SESSION_PROMPTS.md]
