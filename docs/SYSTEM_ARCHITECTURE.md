# Sarthi Kalyan — System Architecture

## The core design decision

One LangGraph agent. Two entry points. Shared everything else.

```
                    ┌─────────────────────────┐
                    │   Web Dashboard Form     │
                    │   (complete profile,     │
                    │    one submission)       │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  run_eligibility_agent_   │
                    │  web(session_id, profile) │
                    └────────────┬─────────────┘
                                 │
┌────────────────────┐          │          ┌──────────────────────┐
│  WhatsApp Message   │          │          │                      │
│  (partial profile,  │  ┌───────▼────────┐ │   AgentState is the  │
│   built up over     ├─▶│  intake_node    │◀┤   ONLY thing that    │
│   several turns)    │  └───────┬────────┘ │   differs between    │
└──────────┬──────────┘          │          │   channels — a       │
           │           ┌──────────▼─────────┐│   dict, not two      │
┌──────────▼──────────┐│   match_node        ││   codebases          │
│ run_eligibility_     ││   (Sibasis's hard-  ││                      │
│ agent_whatsapp(      ││   filter-then-score)│└──────────────────────┘
│  session_id, conv)   │└──────────┬─────────┘
└───────────────────────┘          │
                         ┌──────────▼─────────┐
                         │   explain_node      │
                         │   (age + language    │
                         │    aware, grounded)  │
                         └──────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              agent_logs      impact_log      (returned to
              (BigQuery/      (BigQuery/       caller as
               local)          local)          matches + text)
```

## Why this matters for XPRIZE specifically

The judging criteria score "AI-Native Operations" — the extent to
which AI is live in production and executes key decisions. A system
where the website has one matching implementation and the WhatsApp bot
has a different, looser one is *two products pretending to be one
business*. Evidence logs that come from two different code paths are
harder to reconcile into a single coherent story. One agent means one
evidence trail: every match, on either channel, produces an identical
`agent_logs` row shape and an identical `impact_log` row shape.

## The matching approach (Sibasis Das, IBM Senior Inventor)

> "Stop leaning on embeddings for everything. Eligibility text embeds
> badly, but the underlying criteria are structured — age, income
> ceiling, category, state, occupation. Extract those into metadata,
> filter on them, let vector search handle the rest. Embed a
> plain-language summary alongside the raw text — citizen queries
> match it far better than the bureaucratic source register."

Concretely, in `agents/eligibility.py`:

1. `_hard_filter_pass()` checks income ceiling, age range, and state
   scope as hard boolean conditions — a scheme a user cannot possibly
   qualify for is excluded before any similarity ranking happens.
2. `scripts/ingest_schemes.py` embeds TWO texts per scheme — a
   plain-language summary ("widow gets monthly pension") and a
   structured eligibility text ("age 40-79, income ceiling Rs 120,000")
   — and averages them into one vector. This is what lets a citizen's
   casual phrasing and an NGO worker's technical query both retrieve
   the same scheme accurately.
3. `_soft_score()` ranks the schemes that survive the hard filter,
   so a technically-eligible-but-marginal match ranks below a strong fit.

## The flexibility layer

`config.py` computes five capability flags once, at import time:
`HAS_GEMINI`, `HAS_CHROMADB`, `HAS_FIRESTORE`, `HAS_BIGQUERY`,
`HAS_RAZORPAY`. Every data-layer function (in `db/firestore.py`,
`db/bigquery.py`, the matching functions in `agents/eligibility.py`)
branches on these internally, with an in-memory or local-file fallback
for every cloud dependency except Gemini itself. Route handlers and
the agent's public entry points never check these flags — they just
call the function and get a consistent result shape back, degraded or
not.

This is why the system runs identically (from the caller's point of
view) whether you've set up nothing but a Gemini key, or a full
production stack with Firestore, BigQuery, ChromaDB, and Razorpay all
live.

## Data flow for one WhatsApp message, end to end

1. Twilio POSTs to `/api/whatsapp/webhook`
2. `hash_phone()` — raw number never touches storage or logs
3. `db.firestore.get_conversation()` — Firestore or in-memory, last 10 turns
4. `run_eligibility_agent_whatsapp()` — the shared agent
5. `intake_node` — Gemini Flash extracts profile fields from the conversation
6. `match_node` — ChromaDB RAG or seed-JSON fallback, hard-filtered, scored
7. `explain_node` — Gemini Flash generates age-aware Hindi + English text
8. `db.bigquery.log_event()` — async, two rows: agent_logs + impact_log
9. `db.firestore.save_conversation()` — persists the turn
10. TwiML response sent back through Twilio to WhatsApp

Every step in this list has an identical counterpart in the web
dashboard's flow through `/api/match` — steps 5 through 8 are literally
the same function calls.