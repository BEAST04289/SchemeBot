# Sarthi Kalyan — Remaining Antigravity Sessions
# Backend core is real code (see AGENTS.md). These sessions cover what's
# still needed. Paste the relevant SESSION block into Antigravity along
# with a note: "Read AGENTS.md and the existing backend/ files first."

# ════════════════════════════════════════════════════════════════
# SESSION A — Frontend: Homepage + Auth + Dashboard
# ════════════════════════════════════════════════════════════════
SESSION_A_FRONTEND = """
Build the Next.js frontend calling the REAL backend routes that already
exist: POST /api/auth/session, POST /api/match, POST /api/payment/create-order,
POST /api/payment/verify. Read backend/api/auth.py and backend/api/match.py
first so your request/response shapes match exactly.

File: frontend/app/page.tsx — Homepage
  Tricolour stripe (4px saffron | white | green) at top.
  Navy header, hero section with bilingual H1, saffron primary CTA to /auth.
  Category cards (Farmer/Student/Woman/Business/Senior/Job Seeker).
  Pricing section: Free / Rs 99 / Rs 249 tiers.
  Footer with XPRIZE + myscheme.gov.in attribution.
  Full design system in AGENTS.md — follow it exactly.

File: frontend/app/auth/page.tsx — Phone OTP Auth
  "use client". Two steps: phone input with Cloudflare Turnstile widget
  (@marsidev/react-turnstile, site key from NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  then 6-digit OTP input. Uses Firebase signInWithPhoneNumber client SDK,
  then POSTs {id_token, turnstile_token} to /api/auth/session exactly as
  defined in backend/api/auth.py's SessionRequest model.
  On success: redirect to /dashboard.

File: frontend/app/dashboard/page.tsx — Profile Form + Results
  Form fields matching backend/api/match.py's UserProfile model EXACTLY:
  age, state, occupation, annual_income_inr, social_category, has_aadhaar,
  language. Submit calls POST /api/match with credentials:'include' (cookie
  auth). On 402 TRIAL_EXHAUSTED response: show PaywallModal. On success:
  show bilingual explanation + SchemeCard list from the matches array.

File: frontend/components/scheme/SchemeCard.tsx
  Props match the match_schemes response shape exactly: scheme_id, name,
  ministry, benefit_amount, documents_required, application_url,
  annual_value, confidence_score. Saffron left border, confidence badge,
  document bullet list, apply button linking to application_url.

File: frontend/components/scheme/PaywallModal.tsx
  Three tiers: report_5 (Rs 99), monthly (Rs 249) — these EXACT tier
  strings, they must match backend/utils/razorpay.py's TIER_PRICING_PAISE
  keys. Razorpay checkout.js flow: POST /api/payment/create-order -> get
  order_id -> open Razorpay -> on success POST /api/payment/verify with
  the exact field names from VerifyPaymentRequest in backend/api/payments.py.
"""

# ════════════════════════════════════════════════════════════════
# SESSION B — Peripheral Routes: Reminders, Tracker, Impact
# ════════════════════════════════════════════════════════════════
SESSION_B_PERIPHERAL_ROUTES = """
Build three routers following the EXACT conventions already established
in backend/api/match.py and backend/api/payments.py: async route handlers,
Pydantic strict models, {error, code} error responses, asyncio.create_task()
for any logging that shouldn't block the response.

File: backend/api/reminders.py
  router = APIRouter()
  POST /track — body: {session_id: str, scheme_id: str, deadline: str|None}
    Calls db.firestore.track_scheme(phone_hash, scheme_id, deadline)
    (this function already exists — read db/firestore.py)
  GET /pending — returns tracked schemes with deadline within 7 days,
    for the phone_hash on request.state (set by SessionAuthMiddleware)

File: scripts/send_reminders.py
  Standalone script, called by Cloud Scheduler daily at 9am IST.
  Queries all tracked_schemes across users where deadline is within 7 days.
  For each: generate a reminder message via Gemini Flash (use
  utils.gemini_helpers.generate_with_retry, follow the pattern in
  agents/eligibility.py's explain_node for tone).
  Log each reminder sent via db.bigquery.log_event("reminders_sent", {...}).
  Phase 1: just log. Phase 2 (add a TODO comment): send via Twilio WhatsApp
  using the same twilio.rest.Client pattern implied by config.py's
  twilio_sid/twilio_token settings.

File: backend/api/tracker.py
  router = APIRouter()
  GET /{scheme_id} — returns tracking status for phone_hash + scheme_id
  POST /update — body: {scheme_id: str, status: str} where status is one
    of: not_started|docs_gathering|applied|pending_review|received
  When status == "received": also accept optional benefit_amount_inr and
    log to db.bigquery.log_event("impact_log", {..., claimed: True}) —
    this updates the claimed flag on records already created in match.py

File: backend/api/impact.py
  router = APIRouter()
  GET /summary — no auth required (public evidence). Reads
    db.bigquery.read_local_logs("impact_log") and returns:
    {total_benefits_inr, beneficiaries_count, avg_benefit_inr, state_breakdown}
  This is what /stats in main.py could eventually call instead of
  duplicating the aggregation logic — refactor main.py's /stats to use
  this if you build it.

main.py already has safe_mount() calls waiting for all three of these —
no changes to main.py needed, just create the files.
"""

# ════════════════════════════════════════════════════════════════
# SESSION C — NGO Partner Dashboard
# ════════════════════════════════════════════════════════════════
SESSION_C_NGO_DASHBOARD = """
Build the NGO dashboard. SECURITY AGENT reviews this — it handles client
PII beyond the individual end-user's own data.

File: backend/api/admin.py
  router = APIRouter()
  Middleware check at the top of every route: read tier from Firestore
  via db.firestore.check_trial_status(phone_hash) — if tier != "ngo",
  raise HTTPException(403, {"error": "NGO access required", "code": "NOT_NGO"})
  
  POST /clients — add a client under this NGO's account, runs
    agents.eligibility.run_eligibility_agent_web() for them directly
    (NGO tier bypasses the trial/paywall check entirely)
  GET /clients — list all clients added by this NGO (Firestore query
    filtered by ngo_phone_hash field)
  GET /export — CSV export of client_name, schemes_matched, benefit_amounts,
    apply_urls — this is what an NGO submits to THEIR grant applications,
    and also becomes YOUR XPRIZE customer evidence

File: frontend/app/admin/page.tsx
  Protected: check tier==='ngo' from a /api/auth/me endpoint (build this
  small addition to backend/api/auth.py: GET /me returns {tier} from
  db.firestore.check_trial_status).
  Table of clients with Add Client modal (same form as /dashboard) and
  Export CSV button calling GET /api/admin/export.
"""

# ════════════════════════════════════════════════════════════════
# SESSION D — Deployment
# ════════════════════════════════════════════════════════════════
SESSION_D_DEPLOY = """
File: backend/Dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

File: cloudbuild.yaml
  Build -> push -> deploy to Cloud Run, region asia-south1,
  --min-instances=0 --max-instances=10 --memory=2Gi
  --set-secrets pulling GEMINI_API_KEY, FIREBASE_ADMIN_SDK_JSON,
  RAZORPAY_KEY_SECRET, JWT_SECRET, REFRESH_SECRET from Secret Manager

File: frontend/vercel.json
  Rewrite /api/* to the Cloud Run backend URL (avoids CORS in prod)

File: scripts/setup_scheduler.py
  Two Cloud Scheduler jobs:
  1. Nightly refresh: 0 20 * * * -> POST {backend_url}/api/refresh
     with header X-Refresh-Secret: {settings.refresh_secret}
  2. Daily reminders: 30 3 * * * -> POST {backend_url}/api/reminders/send
     (build this trigger route as part of SESSION B if not already present)

WhatsApp Business API upgrade path (once you have 25+ regular users):
  Apply at developers.facebook.com/docs/whatsapp/cloud-api
  Only change needed: TWILIO_WHATSAPP_NUMBER in .env — no code changes,
  since backend/api/whatsapp.py already reads it from config.py
"""