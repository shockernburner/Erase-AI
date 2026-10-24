# EraseAI: read this first (project memory for every Claude session)

Last updated: 2026-10-24. Dated history lives in `docs/handoff/CONTEXT.md`; this file is the instant brief. If something here
contradicts the code, the code wins: fix this file. Mark facts you could not verify as `[owner said]`.

How to work with the owner: they want exact click-by-click steps for web consoles (Google Ads, Play Console, Chrome Web Store,
GA4, Product Hunt), honest answers over cheerful ones, and no wasted effort. They have corrected me when I assumed instead of checking
(for example I repeated "merge PR #16" after it had merged). **Verify state with a tool before saying what is pending.** Their pronouns
are not stated: use "they" or "the owner". They merge PRs and deploy the website themselves (republish on Replit); never merge or deploy
for them, and open a PR only when asked.

## 1. Company and product

- **Vantward Solutions Pte. Ltd.**, Singapore. Reg. No. 202606980C. 68 Circular Road #02-01, Singapore 049422. Director's contact (public, on the store
  listing and site footer): director@vantward.com, +65 8243 0739. Site: https://eraseai.ai. Bootstrapped, live, not a pre-product.
- **Product: EraseAI Firewall.** Checks what you are about to send to ChatGPT, Claude, Gemini (and Replit on Chrome) and holds the message if it finds
  personal data, card numbers, passwords or API keys. You choose: Cancel, Sanitize & Send, or Send Anyway.
- **Detection is rules-based** (patterns plus validators such as the Luhn checksum). Never say "AI detection". It can miss things and flag harmless text; say so.
- **Founder story (owner-approved wording, used on `/start`):** 17 years in security (Air Force: physical, national, cyber), then aerospace engineer (protecting sensitive
  information was the core duty), then started a software company and wrote the code by hand. Saw people on teams paste company information into public AI tools. One
  morning, as a father, realised they had done the same with information about their own child. Do not add details about the child. Do not invent a rank.

## 2. Our strength, and what we are NOT strong at (owner decision, 2026-10-24)

- **Strength: Android.** Send-level filtering of sensitive chats inside the AI apps the user chooses, plus the **Chrome attachment scanning and Sanitize & Send**
  (paid). In one standard web search I found no Android competitor doing send-level filtering; that is **not proof**. Never claim "first" or "only".
- **Weak: the Chrome extension on its own.** Many competitors exist on the Chrome Web Store (Redactopia, Prompt Seal, SafePaste, Caviard, Nightfall, others).
  We support **Chrome only**: no Edge, no Safari, no Firefox. Do not spend effort marketing the extension as a standalone win. Say "other browsers soon" (owner's plan).
- **Safari/iOS:** a Safari Web Extension is possible later (reuses the JS) but only worth it if GA4 shows Safari on Mac at 15% or more of paid visits.
  A native iOS app is **not viable**: iOS gives no way to check text typed in other apps (a custom keyboard is the only close option and is weak).
- Do not lead with the AWS-key demo: people do not pay to filter an AWS key. Lead with personal data and customer files (names, emails, card numbers) and Android chats.

## 3. Full feature set (what is real today)

Plans and prices are fixed (`artifacts/eraseai/src/lib/pricingPlans.ts`, must match `api-server` `billing-source.mjs`). **Do not change prices or plan ids (`pro`, `business`).**

| Plan | Price | What it includes |
|---|---|---|
| Free | $0, no account | Chrome: every message to ChatGPT, Claude, Gemini checked on-device, no limit, see what was found, cancel or send. Android: free trial **7 days or 25 messages**. Web dashboard: 7-day trial, 25 scans. |
| **Personal** | **$5/month or $54/year** | Chrome: one-click Sanitize & Send; **attachment and screenshot scanning (PDF, Word, Excel, slides, images; OCR runs in the browser)** with "Download clean copy"; Android: protection stays on, Sanitize, EraseAI Safe files; unlimited checks, history, alerts, AI rewriting. |
| Pro | $19/month | Everything in Personal + API (5 keys, 10,000 requests/month), input/output scanning, webhooks and request logs, dataset sanitizer up to 1,000 rows. |
| Teams/Family | $9/person/month ($8 annual), 3 to 10 people | Everything in Personal for each person, admin dashboard, invite links, family cover. Marked "soon": company rules, audit-log export, **managed rollout** label. |
| Enterprise | contact us | Sales-led. |

**Attachment scanning, Sanitize & Send and clean-copy download are paid (Personal and up). Never say they are free or part of a trial.** There is currently no way to try attachment
scanning without paying (a product gap worth fixing: it would make the pitch stronger).

- **Android app** (`artifacts/ai-firewall-android`, package `com.eraseai.firewall`, **v1.0.9 / versionCode 38**, live): Accessibility-service send gate with a "curtain" over the
  send button, the gate card (Cancel / Sanitize & Send / Send Anyway), optional **EraseAI Keyboard** (IME), Protected Apps picker, Manual/Share scan, **EraseAI Safe** files, Dataset
  Sanitizer, scan history, Play Billing. Dark theme. **Not a VPN: no `VpnService`, no foreground service** (Play rejected v37 for this; see CONTEXT.md). Any change touching
  VpnService, foreground services or accessibility scope needs a Play-policy review first. We cannot build Android here (no SDK); do not change Android code without a real build and tests.
- **Chrome extension** (`extension/`, **v1.6.0**, live): checks ChatGPT, Claude, Gemini, Replit. Permissions: `storage`, `activeTab`, hosts for those sites plus eraseai.ai. Free = on-device
  checks (`local-scanner.js` is generated from the server rules by `scripts/src/build-extension-local-scanner.mjs`; tests fail if stale). With an API key the text goes to the API over HTTPS.
  Images are OCR'd in the browser, never uploaded. **No remote code** (a test enforces it; Chrome Web Store rejected 1.6.0 once for CDN URLs). Never upload a package while one is in review.
- **Developer API** (`artifacts/api-server`, docs at `/developer-api`): `GET /api/dev/ping`, `POST /api/dev/analyze`, `POST /api/dev/sanitize`; keys start `eak_`; 10,000 chars per request; 60 requests/minute per key.
- **Web app** (`artifacts/eraseai`): React + Vite + wouter + framer-motion; public landing is a scene-by-scene "film"; Check out on a plan opens a looped PIP animation (`FeaturePip.tsx`);
  6 languages; prerendered SEO pages and `/learn` guides; sitemap and llms.txt.
- **Public-copy rules:** no invented or sample numbers anywhere public (the old fake-number dashboards were removed). No social proof we do not have (no user counts, ratings, "trusted by").

## 4. Where things live

- `artifacts/eraseai/` web (build: `cd artifacts/eraseai && PORT=3000 BASE_PATH=/ pnpm run build`; typecheck: `pnpm exec tsc --noEmit -p .`). New public pages must be registered in four places:
  `src/App.tsx` route, `src/seo/site.ts` entry, `src/seo/prerender-entry.tsx`, and a rewrite in `.replit-artifact/artifact.toml` (the build fails if missing). `noindex: true` keeps a page out of the sitemap.
- `artifacts/api-server/` Express API, billing (Stripe), `/api/dev/*`. `artifacts/ai-firewall-android/` Android. `extension/` Chrome.
- `marketing-assets/google-ads/` full Google Ads kit: `CAMPAIGN_PLAN.md`, `copy/BUILD_SHEET.md` (paste-ready ad text and keywords), CSVs, 3 ad videos, images, build scripts.
- `marketing-assets/start-video/build/` builds the `/start` page video (real extension footage + Android scenes). `artifacts/ai-firewall-android/store-assets/trailer/` builds the Play trailer
  (`UPLOAD.md` has the upload steps); `.../play-screenshots/` (6 screenshots, `-en` and `-zh-HK`); `.../listing-en/` and `.../listing-zh-HK/` store listing text; the old `screenshots-OUTDATED-light-theme/` must not be uploaded.
- `docs/marketing/` launch posts and outreach (Personal-only attachments wording already fixed). `docs/handoff/CONTEXT.md` history.
- Fonts for video rendering come from npm (`@fontsource/noto-sans-hk`, `@fontsource/roboto`: `npm pack`, unpack, set `FONTS_HK` and `FONTS_ROBOTO`). Chromium at `/opt/pw-browsers/chromium`.
  The real extension can be loaded headless (`marketing-assets/start-video/build/capture_chrome.mjs`), with its API calls answered inside the service worker.

## 5. Live URLs and identifiers (all public)

- Site https://eraseai.ai. Ad landing page **https://eraseai.ai/start** (noindex). Key pages: `/ai-firewall`, `/chatgpt-data-leak`, `/ai-prompt-security`, `/api-key-protection-ai`, `/developer-api`, `/pricing`, `/learn`, `/privacy`.
- Chrome Web Store: https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp (ID `hckhbadbpkihjpooeljdocgidelcampp`). Publisher is now **Vantward Solutions Pte. Ltd.**, declared
  **trader**, verified with a D-U-N-S number (shown publicly). 0 ratings and 0 reviews so far. Do not buy or invent reviews; a neutral "if it helped, leave a review" nudge is fine.
- Google Play: https://play.google.com/store/apps/details?id=com.eraseai.firewall. Default listing en-US; **zh-HK** added as a language of the default listing (not a custom listing; a custom listing forces English too).
- GA4 property "EraseAI Website", measurement ID `G-K82G1MZ7SE` (separate from the Chrome Web Store property). Repo: github.com/shockernburner/Erase-AI. Work branch: `feature/launch-download-links-b5hke7`
  (reuse the name; after a PR merges, `git fetch origin main && git merge --ff-only origin/main`).

## 6. Analytics

Consent Mode v2 (default denied; Accept grants analytics and ad storage, `ad_personalization` stays denied; GPC or DNT counts as decline, so a browser with DNT on shows no banner by design). Events: `sign_up`,
`begin_checkout`, `generate_lead`, `click_chrome_store`, `click_google_play`, `purchase` (once per Stripe session; no amount for free trials). UTM/gclid attribution is kept in sessionStorage and carried onto
the Chrome Web Store and Play links. GA4 undercounts people who decline. GA4 is linked to Google Ads; `click_chrome_store` and `sign_up` are Primary conversion goals ("Outbound clicks", "Sign-ups"), others Secondary.
`[owner said]` the `purchase` key event was to be marked once it appeared.

## 7. Google Ads (owner-managed, in a shared account)

The account also holds the owner's **unrelated campaigns (Rubikation, CookHub)** and conversion actions: never touch them; filter reports by campaign name containing `Extension+Leak`. Account currency USD; the account
time zone is Pacific (GMT-7, GMT-8 after Nov 1) while Singapore and Hong Kong are GMT+8 (schedule below is in Pacific).

- **Campaign 1: `SG-HK | Search | EN | Extension+Leak`.** Search, Singapore + Hong Kong (Presence), English, **computers only** (mobile and tablet -100%: extensions install only on computers), $15.60/day,
  Maximize clicks with a **max CPC cap of $3.00** (raised from $2.30 on Oct 24; status "Eligible (Limited)" was the cap), conversion goals Outbound clicks + Sign-ups. Schedule Sun to Thu 17:00-24:00 and Mon to Fri 00:00-05:00 Pacific
  (about 08:00-20:00 SGT; shifts one hour on Nov 1). Shared negative list **"EraseAI"** (phrase match, 38 terms + `"anubis"`, `"network firewall"`).
  Five ad groups, each 15 headlines + 4 descriptions (10 headlines and 3 descriptions shared; exact text in `copy/BUILD_SHEET.md`): `chatgpt-data-leak` (+ added `"chatgpt data privacy"`, `"chatgpt security"`, `"prevent ai data leak"`),
  `ai-dlp`, `api-keys-secrets`, `ai-firewall`, `developer-api`. Final URL pattern: `https://eraseai.ai<page>?utm_source=google&utm_medium=cpc&utm_campaign=sg_hk_search_en&utm_content={adgroupid}`
  (campaign tag must be the slug, never the display name: spaces and pipes are illegal). Two ad groups were pointed at `/start` on Oct 24 `[owner said; verify which two, expected ai-firewall and chatgpt-data-leak]`; the others use `/ai-firewall`, `/api-key-protection-ai`, `/developer-api`.
- **Campaign 2: `HK | Search | ZH-HK | Extension+Leak`.** Hong Kong only, Traditional Chinese, $6.24/day, same bidding and schedule, groups `chatgpt-洩漏` and `ai-資料防洩漏`, `utm_campaign=hk_search_zh`, negative list **"EraseAI_CN"** (15 terms).
- **Results as of Oct 24 (all time):** EN $12.93, 6 clicks, 5.66% CTR, about 106 impressions, about $2.16 per click, no key events yet; best term `"ai prompt security"` (4 clicks, $8.44). ZH-HK $0, 0 clicks.
  GA4: 12 sessions in 28 days, 5 with the live campaign tag, 1 engaged, 0 key events. Junk queries seen: llamafirewall, claude kyc, "prompt injection" (a different topic), anubis firewall, ai network firewall.
- **Owner decision: let the campaigns run untouched until real visitors appear.** Checkpoint **Oct 31**: Search terms (filtered) + GA4 paid sessions + whether `click_chrome_store` fired + status no longer "Limited". Stop rule: if spend reaches about $60 with no
  `click_chrome_store` or sign-up from paid traffic, pause and fix the landing page. Ignore Google's "Apply all" recommendations (Search Partners etc.) and the optimization score.
- **Strategic mismatch to resolve:** the Search campaigns are Chrome-led and computers-only, but Android is the strength. A mobile or App campaign for Android is a separate decision (not built).

## 8. Launch plan

- **Product Hunt:** draft exists (tags Chrome Extensions, Artificial Intelligence, Security). Proposed launch **Tue Nov 3 2026** (12:01 AM PT = 4:01 PM Singapore after the Nov 1 clock change; Oct 28 is the earlier option). Company-info answers written: lead with the
  founder story, admit that other tools check at send time, differentiate on the phone, never say "first" or "only", leave revenue blank or "Just launched". UTM `?utm_source=producthunt&utm_medium=launch`. Reply to every comment; no vote begging.
- **Play Console** `[owner said, verify]`: add English description from `listing-en/listing-en.md` (the old text says "internal testers" and "sign in with an EraseAI account" and is wrong), zh-HK text + feature graphic + screenshots, upload the trailer to YouTube
  (Public or Unlisted, not age-restricted, **monetization off**) and paste the link. Listing changes need review before launch day.
- Organic: launch posts in `docs/marketing/extension-launch-posts.md` (UTM per channel), then B2B outreach in Singapore (free 30-day pilot up to 10 people; work-email-domain sign-ups are the lead signal).

## 9. Open items and next actions (in order)

1. **PR #18** (`/start` rework: Android + Chrome-attachments story, new video, this file) awaits the owner's merge and Replit republish. After that the campaigns keep running; **no changes until visitors show up.**
2. Oct 31 checkpoint (section 7). Then decide: keep the $3.00 cap, widen keywords, or change the page.
3. Finish Play Console listing work and the YouTube trailer; wait for review before launch day.
4. Decide on a way for free Chrome users to try attachment scanning (product gap). Decide on an Android-first (mobile or App) campaign.
5. Pricing page still labels Chrome managed rollout "soon" although extension 1.6.0 is live: fix the label.
6. Optional: GPC-only consent change, Search Console link in GA4, zh-TW or zh-CN listings (different wording or script from zh-HK), Safari only if the data supports it.
7. Root `pnpm typecheck` is red because of the unrelated `artifacts/landing-video` package; leave it alone.

## 10. Standing rules (do not break)

- No VPN claims, ever (see section 3). No "AI detection" claims. Pricing and plan names unchanged. Attachments, Sanitize & Send and clean copies are paid, never free.
- No fake data, fake testimonials, user counts or ratings. Cite only what the repo or the owner supports. Competitor claims must be sourced and hedged.
- Chinese copy for Hong Kong is Traditional with Hong Kong wording (私隱, 電郵, 網絡, 應用程式); Taiwan and Simplified Chinese need their own text.
- Never upload an extension or app package while one is in review. Keep the no-remote-code test green.
- GitHub access is through the GitHub MCP tools only (no `gh`); end PR bodies and commits with the attribution lines from the session. Do not open a PR unless asked, and do not merge or deploy.
- Be frugal: do not re-derive what this file already says, and do not build marketing for things we are not strong at.
