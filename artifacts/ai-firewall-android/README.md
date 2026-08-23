# EraseAI Firewall Android (Play v1)

Dual-rail billing:

- **Android (this app):** Google Play Billing only — required for Play Store digital subscriptions.
- **Web app ([eraseai.ai](https://eraseai.ai)):** Stripe checkout — unchanged.

## Scope

- Backend scanning for prompts and shared text/JSON uploads.
- Mobile bearer session tokens from `/api/mobile-auth/*`.
- Play-safe Accessibility guard for user-selected AI apps.
- Google Play purchase verification via `POST /api/mobile/play/verify`.

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

1. Create Play Console subscriptions with the IDs above.
2. Sign up / sign in and confirm 7-day trial entitlement.
3. Subscribe via Google Play from **Trial & Subscription**.
4. Confirm `/api/mobile/play/verify` activates the plan.
5. Manage/cancel via **Manage in Google Play** (not Stripe).
6. Enable Accessibility, protect AI apps, run scan/sanitize flows.
