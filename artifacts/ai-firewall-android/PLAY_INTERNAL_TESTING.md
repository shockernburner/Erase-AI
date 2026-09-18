# Play Console Internal Testing

This checklist is for the EraseAI Android AI Firewall internal testing track. It is not a production launch checklist.

## 1. Play Console Setup Steps

1. Create or open the Android app in Play Console.
2. Confirm package name/applicationId is `com.eraseai.firewall`.
3. Complete App access, Ads, Content rating, Target audience, Data Safety, and Privacy Policy sections.
4. Complete the Accessibility permission declaration before submitting for review.
5. Create an Internal testing release and upload the signed AAB.

## 2. App Name

EraseAI Firewall

## 3. Short Description

Warns before sensitive text is sent to selected AI apps.

## 4. Full Description Draft

EraseAI Firewall helps internal testers check sensitive prompts before sending them to AI tools. Users sign in with an EraseAI account, manually enable Android Accessibility, and choose which AI apps to protect. When protection is active, EraseAI can inspect text the user is actively entering in selected apps and show a warning or redaction option before the text is sent. The app also supports manual scan, share-sheet scan, protected app sync, web billing handoff, and sanitized diagnostics.

## 5. Internal Testing Track Steps

1. Open Play Console > Testing > Internal testing.
2. Create or select an internal tester list.
3. Create a new release.
4. Upload the signed AAB.
5. Add release notes for `0.1.1-internal`.
6. Review warnings and complete declarations.
7. Roll out to internal testing only.

## 6. Upload Signed AAB Instructions

Build locally:

```sh
cd artifacts/ai-firewall-android
scripts/build-signed-aab.sh
```

Upload:

```text
app/build/outputs/bundle/release/app-release.aab
```

Do not upload `app-release-unsigned.apk` or an unsigned AAB.

## 7. Tester Group Instructions

- Use trusted internal testers only.
- Share the opt-in link from Play Console.
- Ask testers to use synthetic sensitive data only.
- Ask testers to complete `REAL_DEVICE_QA_MATRIX.md` and `TESTER_FEEDBACK_TEMPLATE.md`.
- Ask testers not to submit screenshots or videos containing real prompts, tokens, emails, phone numbers, or billing identifiers.

## 8. Data Safety Form Guidance

The app sends selected text to the EraseAI backend for scanning only when protection is active or when the user manually scans or shares text/uploads. Account/auth data is used for sign-in and entitlement. **Android subscriptions use Google Play Billing.** The eraseai.ai website uses Stripe separately. Do not claim local-only processing. Do not claim VPN or traffic decryption.

Confirm the form reflects:

- Account identifiers for sign-in and entitlement.
- User-provided text for safety scanning (composer text, shared prompts, shared text/JSON uploads).
- Diagnostics that exclude raw prompt text, tokens, API keys, phone numbers, emails, and billing/customer IDs.
- No sale of user data.

## 9. Accessibility Permission Declaration Guidance

Use this explanation exactly in the Play Console declaration where appropriate:

“EraseAI Firewall uses Android Accessibility permission only to inspect text the user is actively entering in apps they explicitly select, so it can warn or redact sensitive data before the user sends it to AI tools.”

Make clear that:

- The user manually enables Accessibility.
- The user manually chooses protected apps.
- The app does not scan all apps by default.
- The app does not read password fields.
- The app does not decrypt traffic.
- The app is not a VPN.
- The app can be disabled anytime.
- The app sends selected text to EraseAI backend for scanning only when protection is active or user manually scans/shares text.
- Android subscriptions are purchased and managed through Google Play Billing.
- Web billing at eraseai.ai uses Stripe and is separate from the Android app.

## 10. Sensitive Permissions Explanation

Current app permissions:

- `INTERNET` / `ACCESS_NETWORK_STATE` for API calls to eraseai.ai.
- Accessibility Service binding (`BIND_ACCESSIBILITY_SERVICE`) on the guard service only.
- Manifest `PACKAGE_ADDED` receiver (exported) to detect newly installed known LLM packages and offer protection — not `QUERY_ALL_PACKAGES`.

The app does not request VPN, foreground service, overlay permission (uses Accessibility overlay type), contacts, SMS, microphone, camera, location, or broad storage permissions. Share-sheet text/JSON is read only when the user explicitly shares into EraseAI.

## 11. Privacy Policy Checklist

- Explain account sign-in and entitlement checks.
- Explain selected text scanning and backend processing.
- Explain Accessibility is manually enabled and limited to selected apps.
- State password fields are skipped.
- State the app does not decrypt network traffic and is not a VPN.
- Explain billing is handled through eraseai.ai web billing.
- Explain diagnostics are sanitized and exclude raw prompt text and secrets.
- Provide support/contact instructions for deletion or access requests.

## 12. Release Notes Draft

Internal testing build `0.1.2-internal` of EraseAI AI Firewall for Android. Dual-rail billing: Google Play subscriptions on Android, Stripe on eraseai.ai web. Includes sign-in/signup, 7-day trial entitlement, manual + share-sheet scan/sanitize, Accessibility protection, protected LLM app sync, and sanitized diagnostics.

## 13. Known Limitations to Disclose Internally

- Google Play subscription product IDs must be created in Play Console before checkout works.
- Backend Play verification requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` on eraseai.ai.

## 14. Tester Feedback Template

Use `TESTER_FEEDBACK_TEMPLATE.md` for each test issue or device pass.