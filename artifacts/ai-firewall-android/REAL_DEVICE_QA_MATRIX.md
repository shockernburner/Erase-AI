# Real-Device QA Matrix

Use synthetic test data only. Do not enter real phone numbers, emails, API keys, auth tokens, customer IDs, billing IDs, or private prompts.

## Required Device Coverage

| Device class | Device model | Android version | Tester | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| Samsung Android 13+ |  |  |  |  |  |
| Pixel or clean Android 13+ |  |  |  |  |  |
| Lower-end Android 9/10/11 if available |  |  |  |  |  |

## Target Apps

ChatGPT, Gemini, Claude, DeepSeek, Replit.

## QA Execution Rows

| Device | Android version | Target app | Test case | Expected result | Actual result | Pass/Fail | Notes | Screenshot/video filename |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | EraseAI | Install/first launch | App installs, opens, and shows login or dashboard without crash |  |  |  |  |
|  |  | EraseAI | Login/signup | User can sign in or create account; errors are safe |  |  |  |  |
|  |  | EraseAI | Entitlement refresh | Plan and scan status refresh after login and app resume |  |  |  |  |
|  |  | Android Settings | Accessibility permission enablement | User manually enables EraseAI Firewall Accessibility Service |  |  |  |  |
|  |  | EraseAI | Protected app selection | User can select only intended AI apps; selection persists/syncs |  |  |  |  |
|  |  | EraseAI | Manual scan | Synthetic text scans and returns allow/warn/redact/block safely |  |  |  |  |
|  |  | Android share sheet | Share-sheet scan | Shared text opens Manual Scan and is truncated at 5000 chars |  |  |  |  |
|  |  | ChatGPT | App composer detection | Text typed in composer is detected only when app is selected |  |  |  |  |
|  |  | Gemini | App composer detection | Text typed in composer is detected only when app is selected |  |  |  |  |
|  |  | Claude | App composer detection | Text typed in composer is detected only when app is selected |  |  |  |  |
|  |  | DeepSeek | App composer detection | Text typed in composer is detected only when app is selected |  |  |  |  |
|  |  | Replit | App composer detection | Text typed in composer is detected only when app is selected |  |  |  |  |
|  |  | ChatGPT | Overlay display | Overlay appears for risky synthetic text and omits raw prompt text |  |  |  |  |
|  |  | Gemini | Overlay display | Overlay appears for risky synthetic text and omits raw prompt text |  |  |  |  |
|  |  | Claude | Overlay display | Overlay appears for risky synthetic text and omits raw prompt text |  |  |  |  |
|  |  | DeepSeek | Overlay display | Overlay appears for risky synthetic text and omits raw prompt text |  |  |  |  |
|  |  | Replit | Overlay display | Overlay appears for risky synthetic text and omits raw prompt text |  |  |  |  |
|  |  | Selected AI app | Redact | Direct redaction replaces composer text when supported |  |  |  |  |
|  |  | Selected AI app | Copy Safe Text fallback | Safe text is copied when direct replacement is unavailable |  |  |  |  |
|  |  | Selected AI app | Ignore Once | Current text hash is ignored once without disabling firewall globally |  |  |  |  |
|  |  | Selected AI app | Open Details | Details opens EraseAI without exposing raw prompt text in diagnostics |  |  |  |  |
|  |  | EraseAI | Free/expired user behavior | Upgrade/manage billing prompt appears; app does not crash |  |  |  |  |
|  |  | EraseAI/web billing | Billing handoff | Custom Tab opens eraseai.ai billing; app refreshes entitlement on resume |  |  |  |  |
|  |  | EraseAI/AI app | Offline behavior | Safe network/server message; no raw text in diagnostics |  |  |  |  |
|  |  | Android Settings/EraseAI | Accessibility revoked behavior | Dashboard reports disabled; no crash after revocation |  |  |  |  |
|  |  | EraseAI | App update behavior | App updates over previous build and preserves safe local settings |  |  |  |  |
|  |  | EraseAI | Logout | User can sign out; protected state remains safe; no token in diagnostics |  |  |  |  |
|  |  | EraseAI | Diagnostics copy | Copied diagnostics contains only sanitized status fields |  |  |  |  |

Repeat relevant target-app rows across Samsung Android 13+, Pixel/clean Android 13+, and lower-end Android 9/10/11 if available.