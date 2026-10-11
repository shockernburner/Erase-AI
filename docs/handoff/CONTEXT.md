<!-- Approved by the owner on 2026-10-10. This is the single source of truth for future sessions. Update it only with the owner's approval. -->
# EraseAI — Canonical Context History & Path Forward (as of 2026-10-10)

Sources: git history on `main` + PRs #1–#6 + repo docs (`BRANCHES.md`, `PLAY_FGS_DECLARATION.md`, `extension/CHANGELOG.json`).
Status marked **[repo]** = verified in code/git; **[user]** = you told us, not verifiable from the repo.

## 1. Product & company
- Vantward Solutions Pte. Ltd. (Singapore). Product: EraseAI Firewall — checks prompts before they reach ChatGPT/Claude/Gemini/Replit.
- Surfaces: Chrome extension (`extension/`), Android app (`artifacts/ai-firewall-android`), web app (`artifacts/eraseai`), API (`artifacts/api-server`).
- Detection is rules-based (patterns + validators). Never claim "AI detection".
- **Pricing (fixed — do not change):** Free $0 · Personal $5/mo ($54/yr) · Pro $19 · Teams/Family $9/person (3–10) · Enterprise contact-us. Plan ids `pro`, `business` unchanged.

## 2. Timeline
| Date | Event |
|---|---|
| Sep 22–27 | Extension 1.4.1–1.4.4 |
| Oct 2 | Android 1.0.3–1.0.6 (guest trials 7→14→21 days) |
| Oct 5 | **Extension 1.5.0**: free on-device protection, no key needed (fixed bug where no-key sends went unchecked); Personal adds Sanitize & Send, attachment scanning, history, Android. Also: organizations/invites, team billing, managed rollout (enrollment token for Chrome+Android policy), forgot-password, Android 1.0.7/1.0.8 |
| Oct 6 | AWS/Docker deploy guide; shield logo; Medium + LinkedIn articles |
| Oct 7 | **Website overhaul (PR #3)**: public landing becomes a non-scrolling, scene-by-scene "film" (`components/landing/*`, 6 languages); Developer→**Pro**, Team→**Teams/Family** (names only). SEO branch merged: prerendered pages, `/learn` guides, sitemap, llms.txt. **Android 1.0.8 / versionCode 37** = first production release, 7-day/25-message trial |
| Oct 8 | Google Play rejected the update: *"Missing or Incomplete Declaration"* under the **VpnService policy** → **PR #4**: deleted `EgressGateService` (Strict network gate), removed FOREGROUND_SERVICE*, POST_NOTIFICATIONS; **versionCode 38 / 1.0.9**. 65 unit tests, bundleRelease + lintRelease passed (per PR). IME and Accessibility send gates untouched |
| Oct 9 | Chrome Web Store rejected 1.6.0: *"remotely hosted code"* (tesseract.js CDN URLs) → **PR #5**: URLs removed, no-remote-code test added, and image OCR (previously broken by sandbox CSP) fixed. Version stays 1.6.0 (rejected draft never published). 273 tests pass |
| Oct 10 | **PR #6** (this session): Play links with UTM referrer, network-gate leftovers removed, launch posts refreshed for 1.6.0 |

## 3. Current release state
- **Extension 1.6.0** — live on Chrome Web Store **[user]**. Contents: managed rollout (IT token via Google Admin/Intune, enrolls by work email), new icon, OCR fix, no remote code.
- **Android 1.0.9 / versionCode 38** — approved/live **[user]**. No VpnService, no foreground service. Play Console: v38 must be on *every* track; declaration forms should no longer be requested.
- **Web** — `main` contains the overhauled landing (PR #3). PR #6 (open, `feature/launch-download-links`) adds Play buttons + attribution; web typecheck and production build pass. PR #6 contains no Android code, so the shipped v38 bundle matches the repo.

## 4. VPN policy — the rule going forward
- EraseAI is **not a VPN app**. No `VpnService`, no "Strict network gate", no network-shutdown claims — in app, web copy, plans, posts, decks or Play listing.
- "Egress firewall" in Enterprise docs means the *customer's* corporate network layer, not our Android app — allowed.
- `PLAY_FGS_DECLARATION.md` and `RELEASE_TESTING.md` keep one historical sentence each explaining why it was removed (intentional).
- Any new Android feature touching VpnService/foreground services/accessibility scope needs a Play-policy review first.

## 5. Branches / PRs (truth table)
| Ref | State | Action |
|---|---|---|
| `main` (7a2ab61) | released code | — |
| PR #6 `feature/launch-download-links` | open, 666511f | merge after review |
| `feature/launch-download-links-b5hke7` | this session's branch, +1 commit (256cdbe: launch posts) | not in PR #6 yet — fast-forward PR #6 to it, or open a PR |
| PR #1 `claude/bold-feynman-5rjicj` | draft, stale | **do not merge**; it rewrites the old hero. Cherry-pick only `docs/marketing/prospect-outreach.md` and the `ExtensionWelcomePage`; refresh stale 1.6.0 launch-post text there too |
| PRs #2–#5 | merged | done |

## 6. Known open items / risks
1. No Android build needed: the shipped v38 `.aab` (kept outside git) matches the repo. The one-line pref-key rename in `GuardStateStore.kt` was reverted; do not reintroduce Android code changes without a build and tests.
2. `landing-video` package fails typecheck (pre-existing, unrelated) so root `pnpm typecheck` is red.
3. Play referrer attribution unverified — needs a test install from a tagged link.
4. Website must be **deployed** after PR #6 merges (Replit publish / AWS copy).
5. Extension 1.5.0's review state was "pending" in `BRANCHES.md` (Oct 6); confirm current store state.

## 7. Path forward (the only plan, in order)
1. **Review & merge PR #6** (add 256cdbe first). Deploy web.
2. **Verify** Play UTM referrer with a test install; confirm Play Console shows v38 on all tracks and no VPN/FGS declaration pending.
3. ~~Cherry-pick `prospect-outreach.md` + `ExtensionWelcomePage` from PR #1~~ — **done** (PR #8, outreach wording corrected for Personal-only attachments). Close PR #1 without merging.
4. **Organic credibility (Days 1–10):** Show HN, Reddit (per sub rules), Medium/LinkedIn article share, X; one UTM link per channel (table in `extension-launch-posts.md`).
5. **B2B (weeks 2–4):** Singapore first (MAS/PDPC hook); LinkedIn outreach to named accounts, 20–30/week; approved offer = free 30-day pilot up to 10 people; managed rollout via Chrome policy is the enterprise path. Prospect lists: ~50 Asia, ~150+ US. Lead signal = work-email-domain sign-ups.
6. **B2C:** Google Search ads, Singapore geo, SGD 20–30/day, 2-week test, landing on `/ai-firewall`.
7. **Next build:** ~~public `/developer-api` page~~ — **built** (PR #9; documents ping/analyze/sanitize from the real code, linked from footer and related links, in sitemap and llms.txt); then next Android/extension updates only after Play-policy and CWS (no remote code) checks.

## 8. Standing rules
- Pricing and plan names unchanged. No network-gate/VPN claims. Attachments/Sanitize are Personal-only — never say free.
- Never upload a new extension package while one is pending review. Keep the no-remote-code test green.
- Branch for this session: `feature/launch-download-links-b5hke7`; no PR/merge/deploy without your say.
- On approval, I save this as `docs/handoff/CONTEXT.md` on that branch so every future session starts from it.

## Update log
- 2026-10-10: Check out on Personal / Pro / Teams-Family opens a looped picture-in-picture animation (`components/landing/FeaturePip.tsx`) with sign up / sign in below. Enterprise Check out still goes to Contact. The signed-out dashboards with sample numbers are gone from public view: `/personal`, `/developer`, `/dev`, `/business`, `/dataset-sanitizer`, `/enterprise` open the landing page on that plan. Rule: no sample or invented numbers anywhere public.
- 2026-10-10: Google Ads kit built in `marketing-assets/google-ads/` (plan, 3 videos from the live UI, 44 images, logos, English + Traditional Chinese copy, CSVs). Open blockers before launch: no Google tag or conversion tracking on the site; store links do not carry the ad's UTMs; pricing page still marks Chrome managed rollout "soon" although extension 1.6.0 is live. Search ads must use eraseai.ai as the final URL (display-URL rule); the Play app is promoted by an App campaign.

