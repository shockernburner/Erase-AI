# Device QA Baseline — 2026-09-22

Physical device: **OPPO CPH2473** (`adb -s 26ed2d65`)

## Installed AI apps

| Package | App |
|---------|-----|
| `com.openai.chatgpt` | ChatGPT |
| `com.google.android.apps.bard` | Gemini |
| `com.google.android.googlequicksearchbox` | Google / Gemini |

Claude (`com.anthropic.claude`) not installed on this handset.

## adb setup notes

- `stay_on_while_plugged_in` requires `WRITE_SECURE_SETTINGS` (not available over vanilla adb on OPPO).
- Use **Developer options → Stay awake while charging** on the phone instead.
- After every `installDebug`, re-enable Accessibility manually or via Settings UI.

## Trace command

```bash
adb -s 26ed2d65 logcat -c && adb -s 26ed2d65 logcat -s EraseAIGuard
```

## Expected trace (risky prompt)

```
composer.locate pkg=... found=true ...
composer.text   pkg=... len=... via=locator
risk.scan       pkg=... level=high ...
curtain.show    pkg=... reason=level=high mode=geometry|resolved ...
```

## Known fragility (pre real-firewall work)

| Failure mode | Cause |
|--------------|-------|
| Send leaks on fast tap | Race before curtain pins submit band |
| `found=false` | Composer in secondary window (Gemini) or UI redesign |
| Sanitize/Send Anyway no-op | Stale send node after gate |
| Attachment unscanned | Native apps hide file bytes from Accessibility |

## Post-implementation verification

Re-run Phase A in `REAL_DEVICE_QA_MATRIX.md` plus:

- **Geometry curtain:** `curtain.show` logs `mode=geometry` when send node unresolved
- **IME path:** Enable EraseAI Keyboard → risky text withheld before composer (`ime.withhold`)
- **Strict egress:** Settings → Strict network gate ON → `egress.arm` while curtain up; send tap fails to reach network
- **IME primary:** With EraseAI keyboard active, text-only prompts skip `curtain.show` (`curtain.skip reason=ime-primary`)
