import asyncio
import httpx

async def send_message(client, phone_suffix, message):
    resp = await client.post(
        "http://localhost:8000/api/whatsapp/webhook",
        data={"From": f"whatsapp:+91900000{phone_suffix}", "Body": message}
    )
    print(f"Phone ...{phone_suffix}: status={resp.status_code}")
    return resp

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        results = await asyncio.gather(
            send_message(client, "0001", "Hi, I am a 45 year old teacher from Punjab"),
            send_message(client, "0002", "Hi, I am a 30 year old woman entrepreneur from Rajasthan"),
            send_message(client, "0003", "Hi, I am a 70 year old widow from Bihar"),
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Exception):
                print(f"FAILED: {r}")

if __name__ == "__main__":
    asyncio.run(main())
