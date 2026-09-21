# EraseAI Firewall — Android Play Store Publish Checklist

Use this as the single end-to-end list from “code is ready” through production on Google Play.  
Package: `com.eraseai.firewall` · Dual-rail billing: **Google Play on Android**, **Stripe on eraseai.ai only**.

Related docs (do not replace this file):

- [PLAY_INTERNAL_TESTING.md](./PLAY_INTERNAL_TESTING.md) — internal track details / copy drafts  
- [RELEASE_TESTING.md](./RELEASE_TESTING.md) — signing & build commands  
- [REAL_DEVICE_QA_MATRIX.md](./REAL_DEVICE_QA_MATRIX.md) — device QA before promote  
- [TESTER_FEEDBACK_TEMPLATE.md](./TESTER_FEEDBACK_TEMPLATE.md) — tester notes  

Mark each box when done. Do not skip Internal → Closed/Open → Production promotions.

---

## Phase 0 — Pre-flight (before any Play upload)

### 0.1 Product decisions

- [ ] App display name finalized: **EraseAI Firewall**
- [ ] Package / applicationId confirmed: **`com.eraseai.firewall`** (cannot change after first upload)
- [ ] Privacy policy live at **https://eraseai.ai/privacy** (or your final URL; must match Play listing)
- [ ] Account deletion URL live at **https://eraseai.ai/deleteprofile** (Play Console → App content → Account deletion)
- [ ] Support email / contact URL ready for Play listing and privacy requests
- [ ] Confirm you will **not** put Stripe checkout inside the Android app

### 0.2 Backend / production API (must be live before billing QA)

- [ ] Latest `api-server` deployed to production (`https://eraseai.ai`)
- [ ] Confirm these endpoints respond (auth where required):
  - [ ] `GET /api/mobile/health`
  - [ ] `POST /api/mobile-auth/login` (or signup)
  - [ ] `GET /api/mobile/entitlement`
  - [ ] `POST /api/personal/analyze`
  - [ ] `POST /api/mobile/analyze-pieces`
  - [ ] `POST /api/mobile/outcome`
  - [ ] `POST /api/mobile/play/verify`
  - [ ] `GET /api/mobile/play/products`
- [ ] Env set on production API:
  - [ ] `GOOGLE_PLAY_PACKAGE_NAME=com.eraseai.firewall`
  - [ ] `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={...full service account JSON...}`
  - [ ] (Optional) `WEB_BASE_URL=https://eraseai.ai`
- [ ] Without the service account JSON, subscribe will fail with **PLAY_NOT_CONFIGURED** — fix before charging real users

### 0.3 Version & branding in code

Current `app/build.gradle.kts` (update before each store upload):

- [ ] Bump **`versionCode`** (integer; must increase every Play upload)
- [ ] Bump **`versionName`** (user-visible; e.g. `0.1.2` or `1.0.0`)
- [ ] `API_BASE_URL` is production: `https://eraseai.ai/api`
- [ ] Launcher / splash use web shield assets (`eraseai_logo.png` / `eraseai_shield.png`)
- [ ] Splash tagline reviewed: *EraseAI — the firewall that stops unwanted data from reaching public AI apps*
- [ ] Debug-only QA sample button is **not** present in release (`BuildConfig.DEBUG` gate)

### 0.4 Signing keys (one-time, then forever)

- [ ] Create upload keystore (if not already):

```sh
cd artifacts/ai-firewall-android
scripts/create-upload-keystore.sh
```

- [ ] Copy `keystore.properties.example` → `keystore.properties` and fill values (never commit)
- [ ] Back up **keystore file + passwords + alias** in a password manager / vault
- [ ] Confirm `keystore.properties`, `*.jks`, `*.keystore` are gitignored
- [ ] Decide Play App Signing: enroll in **Play App Signing** (recommended; upload key ≠ app signing key)

---

## Phase 1 — Play Console app shell

### 1.1 Create / open the app

- [ ] Open [Google Play Console](https://play.google.com/console)
- [ ] Create app (or open existing) with package **`com.eraseai.firewall`**
- [ ] Default language set (e.g. English US)
- [ ] App type: **App** · Free/paid: match your model (subscriptions are in-app)

### 1.2 Developer account & policies

- [ ] Developer account verified / payments profile complete (required for paid subscriptions)
- [ ] Accept Play Developer Program Policies
- [ ] Countries / regions selected for distribution (start narrow if preferred)

---

## Phase 2 — Store listing assets

### 2.1 Text

- [ ] **App name:** EraseAI Firewall (≤ 30 characters)
- [ ] **Short description** (≤ 80 chars), e.g.:  
  `Warns before sensitive text is sent to selected AI apps.`
- [ ] **Full description** (see draft in `PLAY_INTERNAL_TESTING.md`; update for production: mention Google Play Billing, Accessibility opt-in, not a VPN)
- [ ] Do **not** claim: VPN, decrypting traffic, scanning all apps by default, machine unlearning

### 2.2 Graphics

- [ ] **App icon** 512×512 PNG — use `store-assets/icon-512.png` (web shield)
- [ ] **Feature graphic** 1024×500
- [ ] Phone screenshots (minimum required by Console; typically ≥ 2)
  - [ ] Splash / home
  - [ ] Enable Accessibility / protected apps
  - [ ] Manual scan or subscription screen  
  Use synthetic/demo text only — no real PII, keys, or customer data
- [ ] Optional: 7-inch / 10-inch tablet screenshots if you support tablets
- [ ] Optional: promo video URL

### 2.3 Categorization & contact

- [ ] Category (e.g. Tools / Productivity / Security — pick one that fits)
- [ ] Tags / search keywords (where offered)
- [ ] Email (required)
- [ ] Website: `https://eraseai.ai`
- [ ] Privacy policy URL: `https://eraseai.ai/privacy`

---

## Phase 3 — Policy questionnaires (blocking for review)

Complete **every** section under App content / Policy until Console shows no remaining tasks.

### 3.1 Privacy Policy

- [ ] URL saved and reachable without login
- [ ] Policy mentions: account/auth, text scanning to eraseai.ai, Accessibility opt-in, selected apps only, password fields skipped, not a VPN, Google Play Billing on Android, Stripe on web only, data deletion/contact

### 3.2 Data safety form

Declare accurately (do **not** claim local-only processing):

- [ ] Account info (email / user id) — for sign-in & entitlement
- [ ] User-generated / entered text — prompts scanned when firewall is on or user scans/shares
- [ ] App activity / diagnostics — sanitized; no raw prompts, tokens, emails, phones, billing IDs
- [ ] Data is processed on servers (eraseai.ai)
- [ ] **Not** sold
- [ ] Encryption in transit (HTTPS)
- [ ] Users can request deletion via support / account flows you actually offer

### 3.3 Ads

- [ ] Declare **No ads** (unless you add an ad SDK later)

### 3.4 Content rating

- [ ] Complete IARC questionnaire
- [ ] Answer honestly about violence/weapons **detection** vs providing violent content (you scan/block risky prompts; you do not provide them)

### 3.5 Target audience & news apps

- [ ] Target age groups selected
- [ ] Confirm whether the app is designed for children (usually **not** for a security/firewall tool aimed at adults)
- [ ] News app declaration if prompted (likely No)

### 3.6 App access

- [ ] If login is required for core features: provide a **demo account** for Google reviewers  
  Email + password that can sign in, see dashboard, and (if possible) trial entitlement
- [ ] Instructions: how to enable Accessibility and pick a protected app (reviewers may not install ChatGPT)

### 3.7 Government apps / financial features / health

- [ ] Answer No unless true for your org

### 3.8 **Accessibility permission declaration (critical)**

Play scrutinizes Accessibility services. Use wording consistent with:

> EraseAI Firewall uses Android Accessibility permission only to inspect text the user is actively entering in apps they explicitly select, so it can warn or redact sensitive data before the user sends it to AI tools.

Also state clearly:

- [ ] User manually enables Accessibility
- [ ] User manually chooses protected apps
- [ ] Not all apps by default
- [ ] Password fields skipped
- [ ] Does not decrypt network traffic
- [ ] Not a VPN
- [ ] Can be disabled anytime
- [ ] Selected text sent to eraseai.ai for scanning when protection is active or user scans/shares
- [ ] Subscriptions via Google Play Billing only

### 3.9 Sensitive permissions inventory (for your notes / review replies)

Present in the app today:

- [ ] `INTERNET` / `ACCESS_NETWORK_STATE`
- [ ] `com.android.vending.BILLING`
- [ ] `BIND_ACCESSIBILITY_SERVICE` (guard service only)
- [ ] `PACKAGE_ADDED` receiver for known LLM install hints (not `QUERY_ALL_PACKAGES`)

### 3.9b EraseAI Keyboard — not shipped in this release

The IME service is present in the source but declared `android:enabled="false"`, so it never
appears in the system keyboard list and needs no Play declaration. It has no key layout yet, and
Android runs one IME at a time, so selecting it would leave the user unable to type. Before
enabling it, give it a real keyboard layout and add the `BIND_INPUT_METHOD` declaration back.

Not present (confirm before review):

- [ ] No VPN / `BIND_VPN_SERVICE`
- [ ] No `SYSTEM_ALERT_WINDOW` (overlay is Accessibility overlay type)
- [ ] No contacts / SMS / mic / camera / location / broad storage

---

## Phase 4 — Monetization (Google Play Billing)

### 4.1 Merchant & tax

- [ ] Payments profile / merchant account approved
- [ ] Tax info completed for your countries

### 4.2 Create subscription products (IDs must match backend exactly)

In Play Console → Monetize → Products → Subscriptions:

| Product ID | Base plan | Notes |
|---|---|---|
| `eraseai_personal_monthly` | Monthly | Personal |
| `eraseai_personal_annual` | Annual | Personal |
| `eraseai_pro_monthly` | Monthly | Developer / Pro |
| `eraseai_pro_annual` | Annual | Developer / Pro |

- [ ] All four product IDs created **exactly** as above (case-sensitive)
- [ ] Base plans activated / available
- [ ] Prices set per country
- [ ] Grace period / account hold settings reviewed (optional but recommended)
- [ ] Products linked to the app `com.eraseai.firewall`

### 4.3 License testers (for purchase QA without charging)

- [ ] Add license tester Gmail accounts (Setup → License testing)
- [ ] Testers use those accounts on the device Play Store

### 4.4 Service account for server verification

**Do not** put an Android OAuth client “Download JSON” file in `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. That file has a `client_id` and is for app signing / OAuth identity — Play purchase verification will fail.

Use a **service account key** instead:

- [ ] Google Cloud project with **Google Play Android Developer API** enabled
  - `https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview?project=YOUR_PROJECT_ID`
- [ ] Service account created (e.g. `eraseai@YOUR_PROJECT.iam.gserviceaccount.com`); **Keys → Add key → Create new key → JSON**
- [ ] The JSON must include `"type": "service_account"`, `client_email`, and `private_key`
- [ ] In Play Console → Users and permissions (or Setup → API access): invite that **service account email** with access to view financial data / manage orders
- [ ] Paste the **service account** JSON into production env `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (single-line JSON is fine)
- [ ] Redeploy API and confirm `POST /api/mobile/play/verify` no longer returns `PLAY_NOT_CONFIGURED`

---

## Phase 5 — Build the release AAB

### 5.1 Environment

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
cd artifacts/ai-firewall-android
```

### 5.2 Build

- [ ] `versionCode` / `versionName` bumped and committed
- [ ] `keystore.properties` present locally
- [ ] Build signed bundle:

```sh
scripts/build-signed-aab.sh
```

- [ ] Verify signature:

```sh
scripts/verify-aab-signature.sh app/build/outputs/bundle/release/app-release.aab
```

- [ ] Output path confirmed:

```text
app/build/outputs/bundle/release/app-release.aab
```

- [ ] Do **not** upload unsigned AAB / debug APK to production tracks

---

## Phase 6 — Internal testing (required first)

### 6.1 Create internal release

- [ ] Play Console → Testing → **Internal testing** → Create release
- [ ] Upload `app-release.aab`
- [ ] Release name / notes for this version (see §12 draft below)
- [ ] Resolve any Console warnings (missing declarations, 16 KB page size, etc.)
- [ ] Roll out to **Internal testing** only

### 6.2 Testers

- [ ] Create email list / Google Group of trusted testers
- [ ] Share opt-in link from Console
- [ ] Testers install from Play (not sideload) for billing to work

### 6.3 Real-device QA (you / testers)

Complete [REAL_DEVICE_QA_MATRIX.md](./REAL_DEVICE_QA_MATRIX.md):

- [ ] Sign up / sign in → trial entitlement
- [ ] Splash / branding looks correct
- [ ] Enable Accessibility → choose ChatGPT / Claude / Gemini
- [ ] Safe prompt → auto-send
- [ ] PII prompt → Cancel / Sanitize / Send Anyway
- [ ] Harm-intent (firearm + school timing) → **blocked** (Cancel only)
- [ ] Attachment chip → unscanned review (Cancel / Send Anyway)
- [ ] Manual scan + Dataset Sanitizer
- [ ] **Subscribe** with license tester → `/play/verify` upgrades plan
- [ ] **Restore purchases**
- [ ] **Manage in Google Play** (not Stripe)
- [ ] Collect feedback via `TESTER_FEEDBACK_TEMPLATE.md`

### 6.4 Fix & re-upload if needed

- [ ] Increment `versionCode`
- [ ] Rebuild AAB
- [ ] New internal release
- [ ] Retest failed rows only

---

## Phase 7 — Closed testing (recommended before production)

- [ ] Testing → Closed testing → create track / release
- [ ] Upload same or newer AAB (`versionCode` ≥ previous)
- [ ] Larger tester group (optional)
- [ ] Complete any country-specific questionnaire for closed track
- [ ] Wait for review if Console requires review for closed track
- [ ] Confirm no policy rejection related to Accessibility / billing / misleading claims

---

## Phase 8 — Open testing (optional)

- [ ] Open testing release uploaded
- [ ] Public open-testing link reviewed
- [ ] Monitor crash / ANR / reviews
- [ ] Billing works for non–license-testers in open testing (real charges may apply — warn testers)

---

## Phase 9 — Production launch

### 9.1 Pre-production gate

- [ ] Internal (and closed, if used) QA signed off
- [ ] No open P0 crashes
- [ ] Privacy / Accessibility / Data safety declarations match the shipped build
- [ ] Subscription products active in all launch countries
- [ ] Production API + Play service account verified with a real or license-tester purchase
- [ ] Support channel staffed for launch week

### 9.2 Create production release

- [ ] Production → Create release
- [ ] Upload final AAB
- [ ] Production release notes
- [ ] Countries / staged rollout percentage (start at **10–20%** if available)
- [ ] Review and roll out
- [ ] Submit for **production review**

### 9.3 After approval

- [ ] Confirm listing is **Published** / Available
- [ ] Install from Play Store on a clean device (not only internal link)
- [ ] Fresh account: trial → subscribe → verify entitlement
- [ ] Cancel / manage subscription from Play subscriptions page
- [ ] Monitor Play Console: crashes, ANRs, vitals, policy mail
- [ ] Monitor API: `/mobile/play/verify` errors, 401/503 spikes

### 9.4 Staged rollout completion

- [ ] Raise rollout to 50% after 24–72h if metrics are clean
- [ ] Raise to 100%
- [ ] Document production `versionCode` / `versionName` in release notes / changelog

---

## Phase 10 — Post-publish ops

- [ ] Store listing screenshots still match current UI
- [ ] Privacy policy updated if scanning categories change
- [ ] When shipping updates: always bump `versionCode`, rebuild signed AAB, prefer Internal → Production
- [ ] Keep upload keystore backup current
- [ ] Never rotate Play products IDs without updating `MOBILE_PLAY_PRODUCTS` in `mobileEntitlement.ts` and redeploying API
- [ ] Web Stripe and Android Play remain separate (no “cancel on web” for `gplay:*` subs)

---

## Copy drafts (production-ready starters)

### Short description

```text
Warns before sensitive text is sent to selected AI apps.
```

### Release notes (template)

```text
EraseAI Firewall {versionName}

• Background AI firewall for ChatGPT, Claude, Gemini, and other selected apps
• Send gate with Cancel, Sanitize, and Send Anyway (high-risk safety blocks)
• Manual / share scan and dataset sanitizer
• Subscriptions via Google Play (trial available)
• Accessibility is optional and limited to apps you choose
```

### Accessibility declaration (paste candidate)

```text
EraseAI Firewall uses Android Accessibility permission only to inspect text the user is actively entering in apps they explicitly select, so it can warn or redact sensitive data before the user sends it to AI tools. Users manually enable Accessibility and choose protected apps. Password fields are skipped. The app does not decrypt network traffic and is not a VPN. Selected text is sent to eraseai.ai for scanning when protection is active or when the user manually scans or shares text. Android subscriptions use Google Play Billing; eraseai.ai web billing uses Stripe separately.
```

---

## Quick “stop / do not ship” list

Stop and fix before production if any of these are true:

1. [ ] `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` missing on production  
2. [ ] Subscription product IDs do not match backend exactly  
3. [ ] Accessibility declaration incomplete or overclaims (VPN / all apps)  
4. [ ] Privacy policy still says Stripe-only for Android  
5. [ ] Reviewer cannot log in (no demo account)  
6. [ ] Harm-intent / analyze-pieces API not deployed  
7. [ ] Uploading debug or unsigned build  
8. [ ] Same `versionCode` as a previous upload  

---

## Suggested order of work (one sitting vs weeks)

| Day | Focus |
|---|---|
| 1 | Phase 0 backend + signing + version bump |
| 1–2 | Phase 1–3 Console shell + policy forms |
| 2 | Phase 4 products + service account |
| 2 | Phase 5 AAB build |
| 3 | Phase 6 internal upload + device QA |
| 4–7 | Fix / retest |
| Next | Phase 7–9 closed → production |

When every Phase 0–6 box is checked and QA is green, you are ready to promote toward production.
