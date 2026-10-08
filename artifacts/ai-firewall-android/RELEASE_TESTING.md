# EraseAI Android AI Firewall Release Testing

This guide prepares the Android AI Firewall for Play Store Internal Testing and real-device QA.

Scope guardrails:

- Web billing on eraseai.ai remains **Stripe**.
- Android uses **Google Play Billing** only (no Stripe checkout in the app).
- The app declares no `VpnService` and no foreground service (the Strict network gate was removed for the Play VpnService policy). Do not add machine unlearning or dataset governance to this app.

## Build Environment

Use Android Studio's bundled JBR on macOS if Java is not otherwise installed:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

## Debug APK

```sh
cd artifacts/ai-firewall-android
./gradlew clean
./gradlew assembleDebug
```

Install on a connected real device:

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Debug builds may show the Manual Scan QA sample button. Release builds must not show it because it is gated by `BuildConfig.DEBUG`.

## Release APK / AAB

Unsigned release build:

```sh
cd artifacts/ai-firewall-android
./gradlew assembleRelease
./gradlew bundleRelease
```

Signed release build requires local signing only. Copy `keystore.properties.example` to `keystore.properties`, fill the values, and keep both `keystore.properties` and the keystore file out of git.

```properties
RELEASE_STORE_FILE=release.jks
RELEASE_STORE_PASSWORD=local-secret
RELEASE_KEY_ALIAS=eraseai-firewall
RELEASE_KEY_PASSWORD=local-secret
```

Equivalent environment variables may be used instead of `keystore.properties`.

### One-Time Upload Keystore Generation

Generate a local upload keystore if needed:

```sh
scripts/create-upload-keystore.sh
```

The helper prompts for passwords through `keytool`; it does not print or store passwords. You can also call `keytool` directly:

```sh
keytool -genkeypair -v -keystore release.jks -alias eraseai-firewall -keyalg RSA -keysize 2048 -validity 10000
```

Back up the upload keystore and passwords in a secure password manager or secrets vault. Losing the upload key creates Play Console account and release recovery problems.

Do not commit real keystore material, passwords, Play Console credentials, API keys, auth tokens, Stripe IDs, or customer IDs.

### Build Signed AAB

After configuring `keystore.properties` or equivalent environment variables:

```sh
scripts/build-signed-aab.sh
```

The script fails with clear instructions if signing values or the keystore file are missing. It prints the exact output path after signature verification.

### Verify AAB Signature

```sh
scripts/verify-aab-signature.sh app/build/outputs/bundle/release/app-release.aab
```

Upload this signed file to Play Console Internal Testing:

```text
app/build/outputs/bundle/release/app-release.aab
```

## Real Device Install

For APK QA:

```sh
adb install -r app/build/outputs/apk/release/app-release.apk
```

For Play Internal Testing, upload the signed `.aab` from:

```text
app/build/outputs/bundle/release/app-release.aab
```

## Accessibility Service Test

1. Install the app and sign in with an EraseAI test account.
2. Open Settings > Accessibility > EraseAI Firewall and enable the service manually.
3. Open EraseAI Firewall > Protected Apps and confirm only intended AI apps are selected.
4. Confirm password fields, Android system UI, banking apps, and unrelated apps are not scanned by default.
5. In each selected AI app, type a non-sensitive synthetic test prompt containing fake sample data.
6. Confirm debounce prevents repeated overlays while typing.
7. Confirm the overlay shows only finding labels/types, never the raw prompt text.
8. Confirm Redact, Copy Safe Text fallback, Ignore Once, and Open Details work.

## Manual Scanner Test

1. Open Manual Scan.
2. Paste synthetic test text only, up to 5000 characters.
3. Confirm scan returns allow/warn/redact/block state.
4. Confirm raw text does not appear in logs, crash reports, diagnostics, or overlay labels.
5. Confirm free accounts see the correct upgrade handling when rewrite is unavailable.

## Share-Sheet Scanner Test

1. Share text from another app to EraseAI Firewall.
2. Confirm Manual Scan opens with shared text truncated to 5000 characters.
3. Confirm scan and rewrite behavior match Manual Scanner Test.
4. Confirm no raw shared text appears in diagnostics or bug reports.

## Billing Handoff QA (Google Play)

1. Free/trial user opens **Trial & Subscription**.
2. Chooses monthly or annual Google Play product.
3. Completes purchase in the Google Play sheet.
4. App verifies via `POST /api/mobile/play/verify`.
5. Entitlement refreshes with paid features.
6. User manages/cancels via **Manage in Google Play** (not Stripe).

Web users continue to subscribe at eraseai.ai with Stripe — do not open web checkout from Android.

## Diagnostics QA

Open Settings > Diagnostics. The screen and copied report may include only:

- App version
- Backend status
- Auth status
- Entitlement status
- Accessibility permission status
- Protected apps count
- Last scan time
- Last scan result type: allow, warn, redact, or block
- Last error category

The diagnostics report must never include raw prompt text, raw redacted text, API keys, phone numbers, emails, auth tokens, Stripe IDs, customer IDs, or full backend internals.

## Expo Orbit / Emulator Smoke Test

Emulator-only validation pass. No real Android phone was available, so this section does not claim real-device QA success. Expo Orbit may be used to launch the Android emulator and install the APK, but this app is native Kotlin/Compose, so Android SDK emulator and adb remain the primary test path.

Environment tested: Android emulator AVD `Medium_Phone_API_36.1` as `emulator-5554`.

APK tested:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Commands run:

```sh
./gradlew clean assembleDebug lintDebug
adb -s emulator-5554 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5554 shell monkey -p com.eraseai.firewall -c android.intent.category.LAUNCHER 1
adb -s emulator-5554 shell am start -a android.intent.action.SEND -t text/plain -n com.eraseai.firewall/.MainActivity --es android.intent.extra.TEXT 'Synthetic test only with fake identifiers for smoke testing.'
adb -s emulator-5554 shell am start -a android.settings.ACCESSIBILITY_SETTINGS
```

### What Passed

- `./gradlew clean assembleDebug lintDebug` completed successfully.
- Debug APK installed successfully on the emulator.
- App launched successfully; `MainActivity` reached the foreground and remained alive.
- Login screen rendered correctly with email, password, sign-in, and create-account controls.
- Invalid or rejected authentication displayed a safe message: `Please sign in again.`
- Direct Android `ACTION_SEND` text intent opened EraseAI Firewall in the emulator.
- Android Accessibility settings opened successfully and showed `EraseAI Firewall` under Downloaded apps with permission state `Off`.
- App-specific log review found no crash lines and no raw account email, Stripe/customer IDs, or printed prompt content from the app.
- Broad sensitive-pattern log matches were false positives from Android timestamps, package metadata, Play services, or system log formatting, not EraseAI app logging.
- Static source review found no `Log.` or `println` calls in the app source.
- Diagnostics report content is sanitized by construction: app version, backend status, auth status, entitlement status, Accessibility status, protected-app count, last scan time, last scan result type, and last error category only.

### What Failed Or Was Blocked

- Sign-in with the provided test account did not reach the dashboard; the app showed `Please sign in again.`
- Create-account retry did not complete into an authenticated dashboard during emulator smoke testing.
- Public backend health check to `https://eraseai.ai/api/mobile/health` returned `401 Authentication required`, so backend status could not be confirmed as reachable from the production endpoint during this pass.
- `/api/mobile/entitlement` loading, entitlement refresh on resume, manual scan, redaction entitlement behavior, scanner history, billing handoff, and diagnostics copy could not be fully runtime-validated because the app did not obtain an authenticated mobile session.
- Share-sheet text entry could only be validated as launching the app; because no authenticated session existed, it did not proceed to a full Manual Scan flow.

### Backend/Auth Blocker Diagnosis

Current backend source expects `GET /api/mobile/health` to be public. The auth middleware whitelist includes `/api/mobile/health`, and the mobile health router returns a static no-store capability payload without requiring `req.user`. If production returns `401 Authentication required` for `https://eraseai.ai/api/mobile/health`, production is not running the current backend build or an upstream deployment/proxy is applying an older auth rule.

Android sends mobile auth requests to `https://eraseai.ai/api` with JSON fields `email` and `password`:

```text
POST /api/mobile-auth/login
POST /api/mobile-auth/signup
```

The backend response contract is `{ token, user }`, where `token` is a server session id accepted through `Authorization: Bearer <token>` on later mobile calls. Android stores that `token` field and sends it as a Bearer token, so no Android contract mismatch is currently known.

### Controlled Mobile Test Account

Do not hardcode or commit test credentials. Create internal mobile test accounts through the existing public mobile signup endpoint after confirming production is running the current backend:

```sh
curl -sS -X POST https://eraseai.ai/api/mobile-auth/signup \
	-H 'Content-Type: application/json' \
	-d '{"email":"tester@example.com","password":"choose-a-local-secret"}'
```

Store the password only in a password manager. If the email already exists, use the existing account password or create a new internal tester email. After signup succeeds, use the same credentials manually in the Android emulator and rerun login, entitlement, manual scan, redaction entitlement, history, billing handoff, resume refresh, and copied diagnostics checks.

### What Cannot Be Validated In Emulator

- Third-party AI app composer detection for ChatGPT, Gemini, Claude, DeepSeek, Replit, or other target apps.
- Vendor-specific Accessibility behavior on Samsung, Pixel, or clean Android physical devices.
- Overlay behavior over real third-party app composers.
- Direct composer redaction, Copy Safe Text fallback, Ignore Once, and Open Details over real AI apps.
- Real billing completion and return behavior after web billing on a physical device.

### Real-Device QA Still Required

Real-device QA is still required before closed beta or production claims. At minimum, test one Samsung Android 13+ device and one Pixel or clean Android 13+ device, with at least two target AI apps verified end to end. Until that passes, third-party AI composer detection must remain marked as `requires real device`.

### Play Console Readiness

The signed AAB and Play Console internal-testing upload may proceed despite real-device QA still being pending, but only for the Internal testing track. Do not claim closed beta, production readiness, or real-device QA success from emulator results alone.

## Accessibility App Matrix

Use synthetic test data only.

| App | Android version | Phone model | App version | Composer text detected | Debounce works | Overlay appears | Redact works directly | Copy Safe Text fallback | Ignore Once works | Open Details works | No unrelated text scanned | Password fields skipped |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ChatGPT |  |  |  |  |  |  |  |  |  |  |  |  |
| Gemini |  |  |  |  |  |  |  |  |  |  |  |  |
| Claude |  |  |  |  |  |  |  |  |  |  |  |  |
| DeepSeek |  |  |  |  |  |  |  |  |  |  |  |  |
| Replit |  |  |  |  |  |  |  |  |  |  |  |  |

## Error Handling QA

Verify user-safe behavior for each case:

| Case | Expected behavior |
| --- | --- |
| No internet | Network unavailable message, no raw text in logs or diagnostics |
| Backend down | Temporary unavailable message, retry works later |
| Invalid token | User is asked to sign in again |
| Expired session | User is asked to sign in again; accessibility service shows at most one prompt |
| Expired subscription | Upgrade/manage billing path is visible |
| Scan limit exceeded | Upgrade prompt is shown; diagnostics category is entitlement |
| Rewrite unavailable | Safe error; no raw prompt text shown |
| Accessibility revoked | Dashboard shows Accessibility disabled |
| Protected app removed | App remains stable; user can update Protected Apps |
| Very large text shared | Text is truncated to 5000 characters before scan |
| Backend timeout | Network/server-safe message; no sensitive crash data |

## Play Store Internal Testing Blockers

- Signed release AAB must be generated with local keystore or Play App Signing upload key.
- Privacy policy and Data Safety answers must match actual behavior.
- Accessibility declaration must explain: EraseAI Firewall uses Android Accessibility permission only to inspect text you are actively entering in selected AI apps, so it can warn or redact sensitive data before it is sent.
- Real-device QA must pass on at least one device before inviting testers.

## Closed Beta Blockers

- Passing real-device QA on one Samsung device and one Pixel or clean Android device.
- Android 13+ coverage.
- At least two target AI apps verified.
- Billing handoff confirmed with a non-production Stripe test flow or controlled account.

## Production Blockers

- Production cannot be declared ready until real-device tests pass on at least one Samsung device, one Pixel or clean Android device, Android 13+, and at least two target AI apps.
- Play Console policy review must pass for Accessibility usage.
- Crash/error telemetry policy must be confirmed to exclude raw scanned text.
- Support runbook for safe diagnostics and bug reports must be ready.

## Safe Bug Reports

Ask testers to include:

- App version
- Android version
- Phone model
- Target AI app and version
- Diagnostics report from Settings > Diagnostics
- Steps to reproduce using synthetic data only

Ask testers not to include screenshots or logs containing real prompts, phone numbers, emails, API keys, auth tokens, billing IDs, customer IDs, or redacted output from real data.