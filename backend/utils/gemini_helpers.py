"""
Gemini API Call Wrapper — Retry Logic + Safe JSON Parsing
=============================================================
Every Gemini call in this codebase goes through generate_with_retry()
instead of calling model.generate_content() directly. This is a concrete
"better handling" fix — none of the earlier drafts of this bot had retry
logic, which is a real production risk: Gemini occasionally returns
transient 429 (rate limit) or 503 (overloaded) errors, and without retry
those show up as user-facing failures instead of a 1-2 second delay.
"""
from __future__ import annotations


import json
import time
import logging
from typing import Optional

logger = logging.getLogger("sarthi_kalyan.gemini")

# These are typically transient — worth retrying with backoff
RETRYABLE_ERROR_NAMES = (
    "ResourceExhausted", "ServiceUnavailable", "DeadlineExceeded",
    "InternalServerError", "TooManyRequests",
)


def generate_with_retry(model, prompt: str, max_retries: int = 2, base_delay: float = 1.0) -> str:
    """
    Calls model.generate_content(prompt) with exponential backoff on
    transient errors. Returns response.text.

    Raises the final exception if all retries are exhausted, or immediately
    for non-retryable errors (bad API key, invalid request) — no point
    retrying those.
    """
    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            response = model.generate_content(prompt)
            if not response.text:
                raise ValueError("Empty response from Gemini")
            return response.text
        except Exception as e:
            error_name = type(e).__name__
            last_error = e

            if error_name not in RETRYABLE_ERROR_NAMES:
                logger.error(f"Non-retryable Gemini error ({error_name}): {e}")
                raise

            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    f"Gemini call failed ({error_name}), attempt {attempt + 1}/{max_retries + 1}. "
                    f"Retrying in {delay:.1f}s"
                )
                time.sleep(delay)

    logger.error(f"Gemini call failed after {max_retries + 1} attempts: {last_error}")
    if last_error:
        raise last_error
    raise RuntimeError("generate_with_retry failed with no last_error")


def parse_json_safely(text: str, fallback: dict) -> dict:
    """
    Gemini's JSON output mode is reliable but not perfect — occasionally
    wraps output in markdown code fences despite instructions not to.
    This strips those and parses safely, returning `fallback` if parsing
    still fails rather than crashing the whole request.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        if len(parts) >= 2:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed ({e}). Raw text (first 200 chars): {text[:200]}")
        return fallback
