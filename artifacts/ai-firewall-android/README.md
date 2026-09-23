# EraseAI Firewall Android (Play v1)

Dual-rail billing:

- **Android (this app):** Google Play Billing only — required for Play Store digital subscriptions.
- **Web app ([eraseai.ai](https://eraseai.ai)):** Stripe checkout — unchanged.

## Scope

- Backend scanning for prompts and shared text/JSON/CSV uploads.
- **Send gate (three layers):**
  - **EraseAI Keyboard (IME, recommended):** withholds risky typed text before it reaches the AI app — no send-button tracking.
  - **Accessibility curtain (fallback):** geometry-based submit-band overlay when IME is off or attachments are present.
  - **Strict network gate (optional):** local VPN blackhole for protected apps while a risky prompt is held.
- **Multi-piece scans:** prompt + attachment files via `/api/mobile/analyze-pieces`.
- **Dataset sanitizer:** upload CSV/JSON/TXT → analyze → apply fixes → download cleaned file (`/api/datasets/*`).
- Mobile bearer session tokens from `/api/mobile-auth/*`.
- Play-safe Accessibility guard for user-selected AI apps (ChatGPT, Claude, Gemini adapters first).
- Google Play purchase verification via `POST /api/mobile/play/verify`.

## Safety policy (text path)

Send-gate uses `/api/personal/analyze` and `/api/mobile/analyze-pieces` with:

| Category | Behavior |
|---|---|
| PII / secrets | Warn / redact |
| Child sexual exploitation | **Block** — Cancel only (no Send Anyway, no Sanitize & Send) |
| Mass-harm / attack planning | **Block** |
| Firearm + school/crowd timing combo | **Block** (violence_intent) |
| Firearm alone | Warn — Send Anyway allowed |
| In-composer attachments | Always **unscanned** — Cancel or Send Anyway; never safe auto-send |

Native apps do not expose attachment bytes to Accessibility, so EraseAI cannot fully block ChatGPT/Gemini file pickers — it gates **Send** after a chip is detected.

## Play Console subscription IDs

Create these subscription product IDs in Play Console (must match backend):

| Product ID | Plan | Period |
|---|---|---|
| `eraseai_personal_monthly` | Personal | Monthly |
| `eraseai_personal_annual` | Personal | Annual |
| `eraseai_pro_monthly` | Developer | Monthly |
| `eraseai_pro_annual` | Developer | Annual |

## Backend env (Play verification)

Set on the api-server deployment:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_PLAY_PACKAGE_NAME=com.eraseai.firewall
```

Use a Google Play Console service account with **View financial data** / subscription access linked to the app.

## Run locally

```sh
cd artifacts/ai-firewall-android
./gradlew assembleDebug
```

## Internal testing checklist

Full end-to-end Play publish steps (Internal → Production): see **[PLAY_STORE_PUBLISH_CHECKLIST.md](./PLAY_STORE_PUBLISH_CHECKLIST.md)**.

1. Create Play Console subscriptions with the IDs above.
2. Sign up / sign in and confirm 7-day trial entitlement.
3. Subscribe via Google Play from **Trial & Subscription**.
4. Confirm `/api/mobile/play/verify` activates the plan.
5. Manage/cancel via **Manage in Google Play** (not Stripe).
6. Enable Accessibility, protect AI apps, run scan/sanitize flows.
