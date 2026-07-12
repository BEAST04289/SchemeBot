"""
Impact API — XPRIZE Evidence Aggregation
==========================================
Aggregates the four XPRIZE evidence logs into a structured summary
for judges and the impact dashboard. This is the "show your work"
endpoint — everything in here was logged by real agent decisions.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from db.bigquery import read_local_logs

logger = logging.getLogger("grantbot.impact")
router = APIRouter()


@router.get("/summary")
async def impact_summary():
    """
    Returns aggregated XPRIZE evidence across all four log tables.
    No auth required — judges should be able to view this.
    """
    agent_rows = read_local_logs("agent_logs", limit=10000)
    impact_rows = read_local_logs("impact_log", limit=10000)
    revenue_rows = read_local_logs("revenue_log", limit=10000)
    customer_rows = read_local_logs("customer_log", limit=10000)

    # Unique sessions that received scheme matches
    matched_sessions = {r["session_id"] for r in agent_rows
                        if r.get("decision", "").startswith("matched_") and not r["decision"].endswith("_0_schemes")}

    # Total potential benefit value surfaced
    total_benefit = sum(r.get("benefit_amount_inr", 0) for r in impact_rows)

    # Revenue
    total_revenue_paise = sum(r.get("amount_paise", 0) for r in revenue_rows)
    paying_customers = len({r.get("phone_hash") for r in revenue_rows if r.get("phone_hash")})

    # Channel breakdown
    web_sessions = len([r for r in agent_rows if r.get("channel") == "web"])
    whatsapp_sessions = len([r for r in agent_rows if r.get("channel") == "whatsapp"])

    # Scheme frequency — which schemes are being matched most
    scheme_counts: dict[str, int] = {}
    for r in agent_rows:
        for sid in r.get("scheme_ids", []):
            scheme_counts[sid] = scheme_counts.get(sid, 0) + 1
    top_schemes = sorted(scheme_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Status transitions (from tracker)
    status_changes = [r for r in impact_rows if r.get("event") == "status_change"]
    applications_started = len([r for r in status_changes if r.get("new_status") == "applied"])
    applications_approved = len([r for r in status_changes if r.get("new_status") == "approved"])

    return {
        "headline": (
            f"GrantBot has helped {len(matched_sessions)} families discover "
            f"Rs {total_benefit:,} in potential government benefits"
        ),
        "evidence": {
            "agent_logs": {
                "total_decisions": len(agent_rows),
                "unique_matched_sessions": len(matched_sessions),
                "channel_breakdown": {"web": web_sessions, "whatsapp": whatsapp_sessions},
            },
            "impact_log": {
                "total_rows": len(impact_rows),
                "total_benefit_value_inr": total_benefit,
                "applications_started": applications_started,
                "applications_approved": applications_approved,
            },
            "revenue_log": {
                "total_revenue_inr": total_revenue_paise / 100,
                "paying_customers": paying_customers,
            },
            "customer_log": {
                "testimonials_collected": len(customer_rows),
            },
            "top_schemes_matched": [{"scheme_id": sid, "match_count": cnt} for sid, cnt in top_schemes],
        },
        "xprize_category": "Money & Financial Access",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
