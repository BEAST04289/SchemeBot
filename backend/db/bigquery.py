"""
BigQuery Evidence Logger — with Local JSONL Fallback
======================================================
XPRIZE evidence lives here. Every agent decision, payment, and impact
event gets logged through log_event(). In dev mode (no GCP project
configured), logs go to local logs/*.jsonl files instead — same schema,
so migrating to BigQuery later is a `bq load` command, not a code change.

Call log_event() via asyncio.create_task() from API routes so logging
never blocks the response the user is waiting on.
"""
from __future__ import annotations


import json
import os
import logging
from pathlib import Path
from datetime import datetime, timezone

from config import settings, HAS_BIGQUERY

logger = logging.getLogger("grantbot.bigquery")

# Use absolute path relative to this file so logs dir is always inside backend/
_LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
os.makedirs(_LOGS_DIR, exist_ok=True)

_bq_client = None


def _get_client():
    global _bq_client
    if _bq_client is None and HAS_BIGQUERY:
        from google.cloud import bigquery
        _bq_client = bigquery.Client(project=settings.gcp_project)
    return _bq_client


async def log_event(table: str, row: dict) -> None:
    """
    Logs one row to BigQuery table `grantbot.{table}`, or to
    logs/{table}.jsonl if BigQuery isn't configured or the insert fails.
    Never raises — a logging failure should never break the user-facing
    request that triggered it.
    """
    row = {**row, "logged_at": datetime.now(timezone.utc).isoformat()}

    if HAS_BIGQUERY:
        try:
            client = _get_client()
            table_id = f"{settings.gcp_project}.grantbot.{table}"
            errors = client.insert_rows_json(table_id, [row])
            if errors:
                logger.error(f"BigQuery insert errors: {errors}")
                _log_local(table, row)
            return
        except Exception as e:
            logger.error(f"BigQuery log failed ({e}), falling back to local file")

    _log_local(table, row)


def _log_local(table: str, row: dict) -> None:
    log_path = _LOGS_DIR / f"{table}.jsonl"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")


def read_local_logs(table: str, limit: int = 1000) -> list[dict]:
    """Used by /stats and the evidence dashboard to summarize local logs
    when BigQuery isn't configured (or as a quick local sanity check
    even when it is)."""
    log_path = _LOGS_DIR / f"{table}.jsonl"
    if not log_path.exists():
        return []
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()[-limit:]
    parsed = []
    for line in lines:
        try:
            parsed.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return parsed
