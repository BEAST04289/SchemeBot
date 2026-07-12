# GrantBot — Extension Ideas

All optional. None required for the XPRIZE submission. Ordered by when
they're actually worth building, not by how interesting they sound.

## Add after your first 20 paying users

**Voice note support.** Gemini 2.0 Flash accepts audio input directly —
many rural users will find speaking easier than typing, especially in
regional languages. Twilio delivers voice notes as a media URL; download
it and pass the audio bytes to Gemini instead of (or alongside) `Body`.
Sketch:
```python
if request_form.get("MediaContentType0", "").startswith("audio"):
    audio_url = request_form["MediaUrl0"]
    # download, then:
    response = FLASH.generate_content([
        {"mime_type": "audio/ogg", "data": audio_bytes},
        "Transcribe this and extract the user's profile information."
    ])
```

**Family bundle tracking.** One WhatsApp thread, multiple profiles —
"check for my father" / "check for my mother-in-law." Store as
sub-documents keyed by `{phone_hash}_{relation}` in Firestore rather
than overwriting the single conversation document.

**Proactive new-scheme alerts.** The nightly refresh in
`scripts/ingest_schemes.py` already diffs the scheme set. Extend it:
when a genuinely NEW scheme appears matching an existing user's stored
profile, queue an outbound WhatsApp message. This is what makes
"AI-native operations" visibly continuous rather than only reactive —
strong XPRIZE evidence.

## Add in month two, after product-market fit is clearer

**Referral loop.** After a successful match: "Send this to 3 friends
who might need it" with a pre-filled `wa.me/?text=...` link. Zero-cost
acquisition, and the sharing itself is a testimonial in disguise.

**State-specific scheme prioritization.** Once `impact_log` has enough
rows with `claimed: true`, weight `_soft_score()` by which schemes
actually converted to received benefits in that state before — you're
already collecting the data this needs, just not using it yet.

**WhatsApp Business API upgrade.** Once you have 25+ regular users,
apply for the real Business API (not Sandbox) so your number is
permanent and you can send template messages for reminders without
the user messaging first (Sandbox has a 24-hour session window).
Zero code changes needed — `config.py` already reads
`TWILIO_WHATSAPP_NUMBER` from the environment.

## Explicitly not recommended before submission

**Community or forum page.** Ghost-town risk is real — a community
needs critical mass to feel alive, and you won't have it in 50 days.
If the social-proof instinct is strong, a curated WhatsApp group of
people who successfully claimed a scheme gets you the same effect
with zero engineering and no moderation burden.

**Full Aadhaar API / UIDAI integration.** Requires government licensing
and a 3-6 month approval process. Gemini Vision OCR on a photo of the
Aadhaar card gets you 90% of the practical value (pre-filling name,
DOB) with none of the licensing overhead. DigiLocker OAuth is the
correct upgrade path later — it's a same-day integration, unlike
direct UIDAI access.

**Supporting more than Hindi/English in the first 30 days.** Spreads
prompt-engineering effort thin before you've validated the core flow
actually works well in the two languages that cover the most users.
`language_preference` in the profile schema already supports more —
add them once Hindi/English is genuinely solid, not before.