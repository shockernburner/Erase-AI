# Real Device QA Matrix

Run this checklist on a physical Android device before promoting an internal test build to production. Emulator-only validation is not sufficient for Accessibility send-gating.

## Prerequisites

- Signed-in EraseAI account with trial or subscription
- Accessibility enabled for EraseAI Firewall
- ChatGPT, Claude, and Gemini installed (minimum adapter set)
- Backend deployed with `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` for billing verification

## Phase A — Send gate

| # | Scenario | Expected |
|---|----------|----------|
| A1 | Type safe prompt in ChatGPT, tap Send | Brief "All clear", message sends |
| A2 | Type prompt with email/phone, tap Send | Modal: Cancel / Sanitize / Send Anyway (no Send Anyway if high-risk block) |
| A3 | Tap Cancel on gate | Prompt stays, nothing sent |
| A4 | Tap Sanitize & Send | Prompt rewritten, send proceeds |
| A5 | Tap Send Anyway (medium risk) | Message sends after confirmation |
| A6 | Press Enter in composer (Gemini) | Same gate as send button |

## Phase B — Attachments

| # | Scenario | Expected |
|---|----------|----------|
| B1 | Manual scan + Add attachment (TXT/CSV) | Per-file rows in results |
| B2 | Share CSV into EraseAI | Opens manual scan with content |
| B3 | ChatGPT with PDF attachment chip visible | Gate shows skipped attachment warning |

## Phase C — Dataset sanitizer

| # | Scenario | Expected |
|---|----------|----------|
| C1 | Upload sample CSV | Row count shown |
| C2 | Analyze | Issue summary by type |
| C3 | Apply fixes + download | Clean file shareable |

## Phase D — Polish

| # | Scenario | Expected |
|---|----------|----------|
| D1 | Cold start splash | Branded gradient splash |
| D2 | Accessibility guide | Setup checklist visible |
| D3 | Google Play subscribe/restore | Entitlement updates |

## Notes

- Stripe checkout must **not** appear in the Android app (Google Play only).
- Record failures with app version, device model, and protected app package name.
