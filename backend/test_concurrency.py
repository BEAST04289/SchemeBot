"""
Concurrency + Smoke Test
==========================
Tests the WhatsApp webhook with 3 concurrent requests and validates
that responses are well-formed TwiML XML. Also tests health and stats
endpoints.

Requires the server to be running: uvicorn main:app --port 8000
"""

import asyncio
import sys
import httpx


BASE_URL = "http://localhost:8000"


async def test_health():
    """Verify the server is running and reports capabilities."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BASE_URL}/health")
        assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
        data = resp.json()
        assert data["status"] == "ok", f"Health status not ok: {data}"
        print(f"✅ Health check passed — capabilities: {data['capabilities']}")
        return data


async def test_stats():
    """Verify the stats/evidence endpoint returns valid data."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BASE_URL}/stats")
        assert resp.status_code == 200, f"Stats endpoint failed: {resp.status_code}"
        data = resp.json()
        assert "headline" in data, f"Stats missing headline: {data}"
        print(f"✅ Stats endpoint passed — {data['headline']}")
        return data


async def test_dev_login(phone_suffix: str = "9876543210"):
    """Test the dev-login endpoint returns a session cookie."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{BASE_URL}/api/auth/dev-login",
            json={"phone": phone_suffix},
        )
        assert resp.status_code == 200, f"Dev login failed: {resp.status_code} — {resp.text}"
        cookies = dict(resp.cookies)
        assert "grantbot_session" in cookies, f"No session cookie returned: {cookies}"
        print(f"✅ Dev login passed — session cookie set")
        return cookies["grantbot_session"]


async def test_whatsapp_webhook(client: httpx.AsyncClient, phone_suffix: str, message: str):
    """Send a WhatsApp-style POST and validate the TwiML response."""
    resp = await client.post(
        f"{BASE_URL}/api/whatsapp/webhook",
        data={"From": f"whatsapp:+91900000{phone_suffix}", "Body": message},
    )
    assert resp.status_code == 200, f"Phone ...{phone_suffix}: status={resp.status_code}, body={resp.text[:200]}"
    assert "<Response>" in resp.text, f"Phone ...{phone_suffix}: response is not TwiML: {resp.text[:200]}"
    assert "<Message>" in resp.text, f"Phone ...{phone_suffix}: TwiML missing <Message>: {resp.text[:200]}"

    # Check the response isn't just the error fallback
    is_error = "तकनीकी समस्या" in resp.text or "technical issue" in resp.text.lower()
    status = "⚠️ ERROR FALLBACK" if is_error else "✅ SUCCESS"

    # Truncate for display
    preview = resp.text[:300].replace("\n", " ")
    print(f"{status} Phone ...{phone_suffix}: {preview}...")
    return resp


async def test_concurrent_webhooks():
    """Send 3 concurrent WhatsApp messages and validate all responses."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        results = await asyncio.gather(
            test_whatsapp_webhook(client, "0001", "Hi, I am a 45 year old teacher from Punjab, income 3 lakh"),
            test_whatsapp_webhook(client, "0002", "Namaste, main 30 saal ki mahila hoon, Rajasthan se, small business, income 2 lakh"),
            test_whatsapp_webhook(client, "0003", "Main 70 saal ki vidhwa hoon Bihar se, BPL card hai"),
            return_exceptions=True,
        )

        passed = 0
        failed = 0
        for r in results:
            if isinstance(r, Exception):
                print(f"❌ FAILED: {r}")
                failed += 1
            else:
                passed += 1

        print(f"\nConcurrency test: {passed}/3 passed, {failed}/3 failed")
        return failed == 0


async def test_web_match(session_token: str):
    """Test the web match endpoint with a complete profile."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/api/match",
            json={
                "age": 35,
                "state": "Maharashtra",
                "occupation": "farmer",
                "annual_income_inr": 100000,
                "social_category": "OBC",
                "has_aadhaar": True,
                "language": "hi",
            },
            cookies={"grantbot_session": session_token},
        )
        assert resp.status_code == 200, f"Match failed: {resp.status_code} — {resp.text[:300]}"
        data = resp.json()
        assert "matches" in data, f"Match response missing 'matches': {data}"
        print(f"✅ Web match passed — {len(data['matches'])} schemes matched")
        for m in data["matches"][:3]:
            print(f"   → {m['name']} (score: {m.get('confidence_score', '?')})")
        return data


async def main():
    print("=" * 60)
    print("SchemeBot Smoke Test Suite")
    print("=" * 60)

    all_passed = True

    # 1. Health check
    print("\n--- Health Check ---")
    try:
        await test_health()
    except Exception as e:
        print(f"❌ Health check FAILED: {e}")
        print("Is the server running? Start with: uvicorn main:app --port 8000")
        sys.exit(1)

    # 2. Stats endpoint
    print("\n--- Stats Endpoint ---")
    try:
        await test_stats()
    except Exception as e:
        print(f"❌ Stats FAILED: {e}")
        all_passed = False

    # 3. Dev login
    print("\n--- Dev Login ---")
    try:
        token = await test_dev_login()
    except Exception as e:
        print(f"❌ Dev login FAILED: {e}")
        all_passed = False
        token = None

    # 4. Web match (requires auth)
    if token:
        print("\n--- Web Match ---")
        try:
            await test_web_match(token)
        except Exception as e:
            print(f"❌ Web match FAILED: {e}")
            all_passed = False

    # 5. Concurrent WhatsApp webhooks
    print("\n--- Concurrent WhatsApp Webhooks ---")
    try:
        if not await test_concurrent_webhooks():
            all_passed = False
    except Exception as e:
        print(f"❌ Concurrent webhooks FAILED: {e}")
        all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("⚠️  SOME TESTS FAILED — check output above")
    print("=" * 60)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
