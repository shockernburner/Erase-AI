# EraseAI Android — Production Week Checklist

**Goal:** Closed testing → staged production launch → measure funnel for investors  
**Package:** `com.eraseai.firewall` · **Target version:** `1.0.0` (versionCode **28**)  
**Today:** Internal testing · v0.3.5-internal (code **27**) on device

---

## Version bump (do before next AAB upload)

Edit `artifacts/ai-firewall-android/app/build.gradle.kts`:

```kotlin
versionCode = 28          // was 27 — must increase every Play upload
versionName = "1.0.0"     // was "0.3.5-internal" — drop "-internal" for production
```

Build signed AAB:

```bash
cd artifacts/ai-firewall-android
scripts/build-signed-aab.sh
# Output: app/build/outputs/bundle/release/app-release.aab
```

Commit Android fixes + version bump together before uploading.

---

## This week — day by day

### Monday — Ship candidate build

- [ ] Commit all Android v0.3.5 fixes (AWS detect, curtain, IME)
- [ ] Bump to **versionCode 28** / **versionName 1.0.0**
- [ ] `./gradlew test` + install on OPPO — smoke test send gate
- [ ] Build signed AAB
- [ ] Upload to **Closed testing** (not production yet)

### Tuesday — Play Console + billing

- [ ] Subscriptions **Active** in Play Console:
  - `eraseai_personal_monthly` · `eraseai_personal_annual`
  - `eraseai_pro_monthly` · `eraseai_pro_annual`
- [ ] Production API has `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (service account, not OAuth client JSON)
- [ ] **License tester** purchase: install from Play → subscribe → plan upgrades in app
- [ ] Reviewer **demo account** ready (email + password in App access form)
- [ ] Update listing copy (below) — remove “internal testing” language

### Wednesday — Wider QA (minimum 2 devices)

Run [`REAL_DEVICE_QA_MATRIX.md`](../artifacts/ai-firewall-android/REAL_DEVICE_QA_MATRIX.md):

| Device | Must pass |
|--------|-----------|
| OPPO (existing) | PII curtain, AWS key, Gboard + EraseAI keyboard |
| Second phone (Samsung/Pixel if possible) | Sign-in, Accessibility, one AI app send gate |
| Optional third | Play-installed build (not adb debug) |

- [ ] Install **ChatGPT + Gemini + Claude** on at least one device
- [ ] Billing from **Play install** (not sideload)
- [ ] No P0 crashes in 30 min session

### Thursday — Closed testing sign-off

- [ ] 5–10 testers on closed track (friends, LinkedIn, pilot contacts)
- [ ] Collect feedback via `TESTER_FEEDBACK_TEMPLATE.md`
- [ ] Fix blockers only — defer nice-to-haves
- [ ] If clean: upload same or patched AAB → **Production** track, **10% staged rollout**

### Friday — Launch + ads on

- [ ] Production submitted for Google review
- [ ] Start **Google App Campaign** (see Ads section below)
- [ ] Landing page / extension CTA live: eraseai.ai → “Get Android app”
- [ ] Spreadsheet or Notion: track daily metrics (template below)

### Weekend — Monitor

- [ ] Play Console: crashes, ANRs, reviews
- [ ] API: `/mobile/play/verify` errors
- [ ] If vitals clean 48h → raise rollout to **50%**, then **100%**

---

## Production store copy (paste-ready)

### Short description (≤ 80 chars)

```text
Warns before sensitive text is sent to selected AI apps.
```

### Full description

```text
EraseAI Firewall helps you check sensitive prompts before they reach ChatGPT, Claude, Gemini, and other AI apps you choose.

YOU STAY IN CONTROL
• You manually enable Android Accessibility and pick which apps to protect
• Password fields are skipped — we don't read those
• Not a VPN — we don't decrypt your network traffic

HOW IT WORKS
• Send gate: Cancel, Sanitize, or Send Anyway before text leaves your phone
• Detects PII, secrets, credentials, and high-risk content
• Manual scan and dataset sanitizer for files you share into the app

SUBSCRIPTIONS
• 7-day trial, then subscribe via Google Play
• Manage or cancel in Google Play subscriptions
• Web plans at eraseai.ai use Stripe separately

EraseAI is built by Vantward Solutions (Singapore). Privacy: eraseai.ai/privacy
```

### Release notes (1.0.0)

```text
EraseAI Firewall 1.0.0

• AI send gate for ChatGPT, Claude, Gemini, and apps you select
• Cancel, Sanitize, and Send Anyway — with safety blocks for severe risk
• Manual scan and dataset sanitizer
• Subscriptions via Google Play (trial available)
• Accessibility is optional — you choose protected apps
```

### Accessibility declaration (Play Console)

```text
EraseAI Firewall uses Android Accessibility permission only to inspect text the user is actively entering in apps they explicitly select, so it can warn or redact sensitive data before the user sends it to AI tools. Users manually enable Accessibility and choose protected apps. Password fields are skipped. The app does not decrypt network traffic and is not a VPN. Selected text is sent to eraseai.ai for scanning when protection is active or when the user manually scans or shares text. Android subscriptions use Google Play Billing.
```

---

## Google reviewer demo account (App access)

Provide in Play Console → App content → App access:

```text
Login: [CREATE reviewer@vantward.com or dedicated test account]
Password: [secure password]

Steps for reviewer:
1. Sign in on the Dashboard tab
2. Tap Protected apps → enable ChatGPT or Gemini (if installed)
3. Settings → Accessibility → enable "EraseAI Firewall"
4. Open a protected AI app, type "my email is test@example.com", tap Send
5. EraseAI curtain should appear with Cancel / Sanitize / Send Anyway

Note: ChatGPT/Claude/Gemini need not be installed for login/trial review; send gate requires a protected AI app + Accessibility enabled.
```

---

## Ads starter (week 1)

**Platform:** Google Ads → App campaign for Android (`com.eraseai.firewall`)

| Setting | Recommendation |
|---------|----------------|
| Budget | **$50–100/day** to start (adjust after 3 days CPI) |
| Goal | App installs (not in-app action yet — funnel too long) |
| Geo | US, UK, SG, AU, CA (English-first; expand later) |
| Creatives | 15–30s screen recording: paste fake API key → curtain blocks |
| Headlines | "Stop AI data leaks" · "Firewall for ChatGPT" · "Check before you Send" |
| Don't promise | "100% secure" · "blocks all apps" · "VPN" |

**Track separately:** ad spend, installs, **cost per install (CPI)**.  
Do **not** optimize for subscriptions in week 1 — not enough signal.

**Rubikation lesson:** You know how to buy installs. EraseAI will have **higher CPI** and **lower conversion** than a game — plan for that.

---

## 5 metrics for an investor slide

Copy this block onto a slide titled **"Android launch — what we measure"**:

---

### Slide content (investor)

**Android Play launch — honest funnel (not game economics)**

| # | Metric | Definition | Week-4 target (illustrative) |
|---|--------|------------|------------------------------|
| **1** | **Installs** | Play Store downloads (organic + paid) | 5,000–20,000 |
| **2** | **Activation rate** | % installs with Accessibility ON + ≥1 protected app within 7 days | **15–25%** (this is the key health metric) |
| **3** | **Trial starts** | Signed-in users who begin 7-day trial | 10–20% of activated |
| **4** | **Paid conversion** | Trial → Google Play subscription | **1–3% of installs** (not 25%) |
| **5** | **Blended CAC** | Ad spend ÷ paid subscribers | Track; goal &lt; 3× monthly ARPU ($15) |

**Narrative:** Play proves mobile execution and measures acquisition. **Primary revenue remains Team ($99/mo)** — Android is wedge + proof, not the whole ARR story.

**Example at 10k installs, 2% paid:** 200 × $5/mo ≈ **$1k MRR** mobile — credible.  
**5k subs from 20k installs** = 25% — do **not** put on deck unless you have data.

---

### How to compute each metric

| Metric | Source |
|--------|--------|
| Installs | Play Console → Statistics |
| Activation | Your backend: user with `accessibility_enabled` + `protected_apps.count ≥ 1` (add event if missing) |
| Trial starts | DB: `subscription_status = trialing` + `billing_source = google_play` |
| Paid conversion | Play Console → Subscriptions + `/mobile/play/verify` success |
| Blended CAC | Google Ads spend ÷ new paid subs that week |

**Minimum instrumentation:** If activation isn't tracked yet, add one API event this week: `POST /api/mobile/events` `{ "type": "activation" }` when user saves first protected app with Accessibility on.

---

## Stop / do not ship to production if

1. Play billing verify fails on Play-installed build  
2. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` missing on production API  
3. Accessibility declaration claims VPN or "scans all apps"  
4. Harm-intent block broken (mass-harm / CSAM categories)  
5. Demo account doesn't work for reviewer  
6. versionCode not bumped from last upload  

---

## After production — investor update template

```text
EraseAI Android 1.0.0 is live on Google Play (staged rollout).

Week N metrics:
• X installs (Y% from paid UA, CPI $Z)
• Activation: A% (Accessibility + protected app)
• Trial starts: B
• Paid subs: C (D% of installs)
• Mobile MRR: $E — Team pipeline: F pilots in conversation

Android validates distribution; seed focus remains Team ARR and enterprise design partners.
```

---

## File map

| Doc | Path |
|-----|------|
| Full publish checklist | `artifacts/ai-firewall-android/PLAY_STORE_PUBLISH_CHECKLIST.md` |
| Device QA matrix | `artifacts/ai-firewall-android/REAL_DEVICE_QA_MATRIX.md` |
| QA baseline (OPPO) | `artifacts/ai-firewall-android/DEVICE_QA_BASELINE.md` |
| Store screenshots | `artifacts/ai-firewall-android/store-assets/` |
| Build AAB | `artifacts/ai-firewall-android/scripts/build-signed-aab.sh` |

---

## One-line for tomorrow's investor meeting

> "Android 1.0 hits closed testing this week, production staged rollout next — we measure activation and paid conversion honestly; Team ARR is still the seed milestone."
