"""
Scheme Ingestion — Seed + HuggingFace Supplement, Dual-Embedding
====================================================================
TWO DATA TIERS:
  Tier 1 — Seed schemes (backend/data/schemes_seed.json): 20 hand-curated,
    highest-value schemes with hand-written plain_language_summary. These
    NEVER get overwritten by the HuggingFace sync — highest confidence.
  Tier 2 — HuggingFace supplement (shrijayan/gov_myscheme, 700+ schemes):
    broader coverage, auto-normalized and auto-summarized by Gemini.
    Lower confidence, much broader coverage. Only pulled with --full.

Both tiers get the SAME dual-embedding treatment — Sibasis Das's advice:
  "Have Gemini generate a short plain-language summary per scheme and
   embed that alongside the raw text — citizen-style queries match it
   far better than the bureaucratic source register."
Each scheme embeds TWO texts (plain-language + structured-eligibility),
averaged into one vector, so both citizen-style and technical-style
queries retrieve it well.

RUN:
  python scripts/ingest_schemes.py            # seed only — fast, no HF download
  python scripts/ingest_schemes.py --full      # seed + 700 HuggingFace schemes
"""

import sys
import json
import time
import hashlib
import logging
import argparse
from pathlib import Path

# Add backend/ to Python path so config/utils imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import chromadb
import google.generativeai as genai

from config import settings, HAS_GEMINI
from utils.gemini_helpers import generate_with_retry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger("ingest")

if HAS_GEMINI:
    genai.configure(api_key=settings.gemini_api_key)

EMBED_MODEL = "models/text-embedding-004"
SUMMARY_MODEL = genai.GenerativeModel(
    "gemini-2.5-flash", generation_config=genai.GenerationConfig(temperature=0.2)
) if HAS_GEMINI else None

SEED_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "schemes_seed.json"


def load_seed_schemes() -> list[dict]:
    schemes = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    logger.info(f"Loaded {len(schemes)} seed schemes (Tier 1, hand-curated)")
    return schemes


def download_huggingface_schemes() -> list[dict]:
    try:
        from datasets import load_dataset
        dataset = load_dataset("shrijayan/gov_myscheme", split="train")
        raw = [dict(row) for row in dataset]
        logger.info(f"Downloaded {len(raw)} schemes from HuggingFace (Tier 2)")
        return raw
    except Exception as e:
        logger.warning(f"HuggingFace download failed ({e}) — skipping Tier 2, seed-only ingestion")
        return []


def normalize_hf_scheme(raw: dict, seed_ids: set[str]) -> dict | None:
    """Normalizes one HuggingFace scheme, generating a plain-language
    summary via Gemini. Returns None if malformed or already in seed."""
    name = (raw.get("Scheme Name") or raw.get("scheme_name") or "").strip()
    if not name:
        return None

    scheme_id = "hf_" + hashlib.md5(name.encode()).hexdigest()[:10]
    if scheme_id in seed_ids:
        return None  # Seed version takes priority

    eligibility_raw = str(raw.get("Eligibility Criteria", ""))
    prompt = f"""
Summarize this Indian government scheme in ONE simple sentence a villager
would understand, in the style: "Who gets it and what they get."
Scheme: {name}
Eligibility: {eligibility_raw[:500]}
Benefit: {str(raw.get("Benefits", ""))[:300]}
Return ONLY the one sentence, no preamble, no markdown.
"""
    try:
        summary = generate_with_retry(SUMMARY_MODEL, prompt, max_retries=1).strip()
    except Exception as e:
        logger.warning(f"Summary generation failed for '{name}': {e}")
        summary = str(raw.get("Description", name))[:300]

    income_ceiling = 999_999_999
    low = eligibility_raw.lower()
    if "bpl" in low or "below poverty" in low:
        income_ceiling = 120_000
    elif "1 lakh" in low or "1,00,000" in low:
        income_ceiling = 100_000
    elif "2 lakh" in low or "2,00,000" in low:
        income_ceiling = 200_000

    return {
        "id": scheme_id,
        "name": name,
        "name_hindi": raw.get("Scheme Name (Hindi)", ""),
        "ministry": raw.get("Ministry", "Government of India"),
        "category": "general",
        "state_scope": raw.get("State", "central") or "central",
        "income_ceiling_inr": income_ceiling,
        "min_age": int(raw.get("Min Age") or 0),
        "max_age": int(raw.get("Max Age") or 100),
        "allowed_categories": ["General", "SC", "ST", "OBC", "EWS"],
        "benefit": str(raw.get("Benefits", "As per scheme guidelines"))[:300],
        "benefit_hindi": "",
        "plain_language_summary": summary,
        "documents": ["Aadhaar card", "Bank account"],
        "apply_url": raw.get("Official Link", "https://myscheme.gov.in"),
        "annual_value": 0,  # Unknown for auto-ingested schemes — matching still works via text
        "tier": 2,
    }


def build_embedding_texts(scheme: dict) -> tuple[str, str]:
    plain = scheme.get("plain_language_summary", scheme.get("benefit", ""))
    structured = (
        f"Scheme: {scheme['name']}. Ministry: {scheme['ministry']}. "
        f"Income limit: Rs {scheme.get('income_ceiling_inr', 'none'):,}. "
        f"Age: {scheme.get('min_age', 0)}-{scheme.get('max_age', 100)}. "
        f"Benefit: {scheme.get('benefit', '')}."
    )
    return plain, structured


def embed_batch(texts: list[str], batch_size: int = 10) -> list[list[float]]:
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        result = genai.embed_content(model=EMBED_MODEL, content=batch, task_type="retrieval_document")
        embeddings.extend(result["embedding"])
        time.sleep(0.6)  # Rate limiting
        logger.info(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)}")
    return embeddings


def ingest(full: bool = False) -> None:
    if not HAS_GEMINI:
        logger.error("GEMINI_API_KEY not set — cannot ingest (embeddings require it)")
        sys.exit(1)

    seed_schemes = load_seed_schemes()
    seed_ids = {s["id"] for s in seed_schemes}
    all_schemes = list(seed_schemes)

    if full:
        hf_raw = download_huggingface_schemes()
        for raw in hf_raw:
            normalized = normalize_hf_scheme(raw, seed_ids)
            if normalized:
                all_schemes.append(normalized)
        logger.info(f"Total after HuggingFace merge: {len(all_schemes)} schemes")

    client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    try:
        client.delete_collection("schemes")
    except Exception:
        pass
    collection = client.create_collection("schemes", metadata={"hnsw:space": "cosine"})

    plain_texts, structured_texts = [], []
    for s in all_schemes:
        p, st = build_embedding_texts(s)
        plain_texts.append(p)
        structured_texts.append(st)

    logger.info("Embedding plain-language summaries...")
    plain_embeddings = embed_batch(plain_texts)
    logger.info("Embedding structured eligibility texts...")
    structured_embeddings = embed_batch(structured_texts)

    # Average the two embeddings — matches both citizen and technical queries
    combined = [
        [(p + s) / 2 for p, s in zip(pe, se)]
        for pe, se in zip(plain_embeddings, structured_embeddings)
    ]

    ids = [s["id"] for s in all_schemes]
    metadatas = [{
        "id": s["id"], "name": s["name"], "category": s.get("category", "general"),
        "state_scope": s.get("state_scope", "central"),
        "income_ceiling_inr": s.get("income_ceiling_inr", 999999999),
        "min_age": s.get("min_age", 0), "max_age": s.get("max_age", 100),
        "annual_value": s.get("annual_value", 0), "apply_url": s.get("apply_url", ""),
        "tier": s.get("tier", 1),
    } for s in all_schemes]

    collection.upsert(ids=ids, documents=plain_texts, embeddings=combined, metadatas=metadatas)

    logger.info(f"✓ Ingested {len(all_schemes)} schemes "
                f"({len(seed_schemes)} seed + {len(all_schemes) - len(seed_schemes)} HuggingFace)")

    # Quick sanity test
    test_embedding = genai.embed_content(
        model=EMBED_MODEL, content="old widow woman in village needs pension", task_type="retrieval_query"
    )["embedding"]
    results = collection.query(query_embeddings=[test_embedding], n_results=3)
    logger.info("Sanity check — 'old widow woman needs pension' matches:")
    for i, meta in enumerate(results["metadatas"][0]):
        logger.info(f"  {i + 1}. {meta['name']} (distance: {results['distances'][0][i]:.3f})")


async def run_refresh():
    """Called by /api/refresh (Cloud Scheduler, nightly). Runs the full
    ingestion in a background thread so it never blocks the event loop."""
    import asyncio
    await asyncio.to_thread(ingest, True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Also pull HuggingFace supplement (700+ schemes)")
    args = parser.parse_args()
    ingest(full=args.full)
