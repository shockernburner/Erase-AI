# Real Device QA Matrix

Run this checklist on a physical Android device before promoting an internal test build to production. Emulator-only validation is not sufficient for Accessibility send-gating.

## Prerequisites

- Signed-in EraseAI account with trial or subscription
- Accessibility enabled for EraseAI Firewall
- ChatGPT, Claude, and Gemini installed (minimum adapter set)
- Backend deployed with `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` for billing verification

## Test loop — debug build over adb, not Play

Do **not** iterate through Internal testing uploads. Install directly and watch the guard trace:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew installDebug
adb logcat -c && adb logcat -s EraseAIGuard
```

Expected trace while typing a risky prompt in Gemini:

```
composer.locate pkg=com.google.android.apps.bard found=true windowId=... windows=2
composer.text   pkg=com.google.android.apps.bard len=24 row=... via=locator
risk.scan       pkg=com.google.android.apps.bard level=high score=80 findings=1 held=true
curtain.show    pkg=com.google.android.apps.bard reason=level=high bounds=...
```

`found=false` means the composer window was not located; `curtain.hide` with a reason explains
every teardown. No prompt text is ever logged.

**Reinstalling unbinds the accessibility service.** Re-enable it after every `installDebug`, or the
whole matrix silently passes with no guard running:

```bash
adb shell settings put secure enabled_accessibility_services \
  com.eraseai.firewall/com.eraseai.firewall.guard.AiGuardAccessibilityService
adb shell settings put secure accessibility_enabled 1
```

### Known behaviour to expect

- Gemini repopulates its composer after `ACTION_SET_TEXT`, so the high-risk hold does not always
  stick there (`hold.repopulated` in the trace). The curtain is the guarantee, not the hold.
- `Sanitize & Send` calls the backend rewrite endpoint and needs a signed-in plan. Unauthenticated,
  it toasts and leaves the gate open (`sanitize.failed`) — the prompt stays blocked.
- The curtain covers the submit band only, so the text line stays editable on purpose.

## Phase A — Interception (the part that was broken)

| # | Scenario | Expected |
|---|----------|----------|
| A1 | Type safe prompt in ChatGPT, tap Send | No curtain, message sends normally |
| A2 | Type an API key in Gemini, wait ~0.5s | Red curtain covers the composer action row; text is pulled out of the composer |
| A3 | With curtain up, tap where Send is | Tap hits the curtain, **not** Gemini; gate opens. Gemini must not answer |
| A4 | With curtain up, press Enter on the soft keyboard | Nothing is sent (composer is empty because text is held) |
| A5 | With curtain up, resize composer (type multi-line) | Curtain tracks the row, `curtain.move` in logcat, never blinks off |
| A6 | Medium risk (firearm wording) | Amber curtain, text stays in composer, nothing sent until decided |
| A7 | Tap Cancel on gate | Prompt returned to composer, nothing sent, curtain does not re-arm on the same text |
| A8 | Tap Sanitize & Send | Prompt rewritten, send proceeds |
| A9 | Tap Send Anyway (medium risk) | Message sends |
| A10 | Firearm + "when are most students at school" | **Blocked** — Cancel only (no Send Anyway / Sanitize & Send) |
| A11 | Child-exploitation wording | **Blocked** — Cancel only |
| A12 | Voice send with risky text held | Nothing sent — the composer is empty |

## Phase A2 — EraseAI Keyboard (IME)

| # | Scenario | Expected |
|---|----------|----------|
| K1 | Enable EraseAI Keyboard in system settings | Appears under On-screen keyboards |
| K2 | Lowercase, Shift, 123, #+= layers | Can type `user@host.com`, `AKIA…`, symbols |
| K3 | Select EraseAI Keyboard in ChatGPT, type API key | `ime.withhold` in logcat; text removed from composer; gate shows HELD |
| K4 | Tap Discard on keyboard gate | Text gone, nothing sent |
| K5 | With risky text in composer, tap ChatGPT Send | `curtain.show` blocks tap even when EraseAI keyboard is active |
| K6 | Keyboard Send on safe text | Message sends (`ime.commit handled=true` or Enter fallback) |
| K7 | Attach a file with EraseAI Keyboard active | Accessibility curtain still appears (`mode=geometry` or `resolved`) |
| K8 | Minimize/reopen keyboard three times | Single keyboard instance (no stacking) |

## Phase A4 — Strict network gate (optional)

| # | Scenario | Expected |
|---|----------|----------|
| N1 | Settings → Strict network gate ON, accept VPN permission | `strict_egress_gate=on` in diagnostics |
| N2 | Risky prompt + curtain up | `egress.arm` / `egress.tunnel.up` in logcat; ChatGPT cannot reach network |
| N3 | Send Anyway approved | `egress.window` then send succeeds within ~15s window |

## Phase A3 — History hygiene

| # | Scenario | Expected |
|---|----------|----------|
| H1 | Type a long risky prompt without deciding | **Zero** new history rows |
| H2 | Open the gate and decide once | Exactly **one** history row, full prompt, correct risk score |
| H3 | Check trial counter after heavy typing | Scan allowance unchanged by background preview scans |

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
- Phase A must pass on a physical device before bumping `versionCode` and running
  `scripts/build-signed-aab.sh`. Accessibility overlays cannot be validated on an emulator.
