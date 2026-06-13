# EraseAI Firewall Android (Play v1)

This Android app is the AI Firewall-only surface for Google Play.

## Scope

- Keep existing web app and web billing behavior unchanged.
- Use backend scanning for text and attachments.
- Use mobile bearer session tokens from `/api/mobile-auth/*`.
- Start with a Play-safe guard model (supported app detection + user-driven actions).

## Current status

- Kotlin + Compose AI Firewall app with mobile auth, entitlement checks, manual scanning, share-sheet handling, history, protected-app selection, and an Accessibility Service guard.
- Mobile bearer session tokens from `/api/mobile-auth/*` are stored with EncryptedSharedPreferences when Android Keystore is available.
- Billing opens the web billing surface in a Chrome Custom Tab so the Android app stays provider-agnostic.

## Run locally

1. Open this folder in Android Studio: `artifacts/ai-firewall-android`.
2. Make sure the Gradle wrapper jar exists at `gradle/wrapper/gradle-wrapper.jar`.
	- If it is missing, run `gradle wrapper --gradle-version 8.9` from this directory, or let Android Studio sync generate it.
	- The repository includes the wrapper scripts and `gradle-wrapper.properties`; the jar is a generated binary and must be produced locally.
3. Update `BuildConfig.API_BASE_URL` in `app/build.gradle.kts` for your environment if needed.
4. Build and run on a real Android 9+ device:

```sh
cd artifacts/ai-firewall-android
chmod +x ./gradlew
./gradlew assembleDebug
```

## Internal testing checklist

1. Log in with a mobile account and confirm the dashboard loads entitlement state.
2. Enable the Accessibility Service from Android Settings.
3. Select protected AI apps and verify local selections persist after app restart.
4. Type the debug QA sample or similar sensitive text into a selected AI app and confirm the overlay shows finding labels without raw sensitive values.
5. Test Manual Scan, Share to EraseAI, History, billing handoff, logout, expired session, network failure, and free-plan limit states.
