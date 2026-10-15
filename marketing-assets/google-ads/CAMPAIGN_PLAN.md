# EraseAI Google Ads: campaign plan (Singapore + Hong Kong)

What we promote: **https://eraseai.ai** (main destination), the **Chrome Web Store** extension, and the **Google Play** app (`com.eraseai.firewall`).
Everything in this folder is ready to upload. Anything marked **verify** depends on Google Ads screens that change; check it in the account before you rely on it.

---

## 0. Before launch

| # | Item | Status |
|---|---|---|
| 1 | **Google tag on the site** (GA4 property `EraseAI Website`, ID `G-K82G1MZ7SE`) with a consent banner. Events: `sign_up`, `begin_checkout`, `purchase` (once per Stripe session, with plan and amount), `generate_lead` (contact form), `click_chrome_store`, `click_google_play`. | **Built** in this PR. Starts after you deploy. |
| 2 | **Ad campaign carried to the store links**: a visit from an ad keeps its `utm_*` tags, and the Chrome Web Store and Google Play links reuse them (the button's own name goes in `utm_content`), so store dashboards credit the install to the campaign. Organic visits keep the old tags. | **Built** in this PR. |
| 3 | **Privacy policy** names Google Analytics and Ads measurement and the consent choice (it used to say we use no advertising cookies). | **Done** in this PR. |
| 4 | In Analytics: mark `sign_up`, `begin_checkout`, `purchase`, `generate_lead`, `click_chrome_store`, `click_google_play` as **key events** (Admin, Data display, Events) once they appear, about a day after deploy. | You |
| 5 | **Link Analytics to Google Ads** (Admin, Product links, Google Ads links); turn on auto-tagging in Google Ads; import the key events as conversions (Goals, Conversions, New conversion action, Import, Google Analytics 4). Make `click_chrome_store` and `sign_up` the primary conversions, `click_google_play` and `begin_checkout` secondary. | You |
| 6 | **Fix the pricing page's "managed rollout: soon" label** (Teams/Family, Chrome). Extension 1.6.0 is live and supports it. Ad copy avoids the claim until this is settled. | You decide; I can change it |
| 7 | **YouTube channel** to host the three videos (Google Ads video assets are YouTube links). | You |
| 8 | **Ads account basics:** billing, currency, and advertiser verification if your account shows it. | You |

How the consent works: the tag loads on every page but starts with all storage denied (Google Consent Mode). **Accept** grants analytics and ad-measurement storage; ad personalisation stays denied because we run no remarketing. **Decline**, or a Global Privacy Control / Do Not Track signal, keeps everything denied. Google still receives cookieless pings, so some visits are modelled rather than counted. Expect GA4 numbers to be lower than real traffic.

Limits of what Google can measure: a Chrome extension install happens on the Chrome Web Store, outside your site, so Google Ads cannot count installs itself. Count **clicks to the store** as the conversion and compare with installs in the Chrome Web Store dashboard (by `utm_source`, now `google` for ad visits). The store property in Analytics (`hckhbadbp...`) is separate from the website property.

Test it yourself after deploy: open `https://eraseai.ai/ai-firewall?utm_source=google&utm_medium=cpc&utm_campaign=test`, accept the banner, hover the "Chrome Extension" link and confirm its address ends with `utm_source=google&utm_medium=cpc&utm_campaign=test`; then in Analytics, Reports, Realtime, you should see yourself and, after clicking it, the `click_chrome_store` event. `node marketing-assets/google-ads/build/verify_tracking.mjs` runs the same checks against a local build.

---

## 1. Structure

| Campaign | Type | Where / language | Devices | Budget | Landing |
|---|---|---|---|---|---|
| **SG-HK \| Search \| EN \| Extension+Leak** | Search | Singapore + Hong Kong, English | **Computers only** (see below) | S$20 / day | `/ai-firewall`, `/api-key-protection-ai`, `/developer-api` |
| **HK \| Search \| ZH-HK \| Extension+Leak** | Search | Hong Kong, Chinese (Traditional) | Computers only | S$8 / day (about HK$48) | `/ai-firewall` |
| **SG-HK \| Demand Gen \| Video** (phase 2) | Demand Gen | Singapore + Hong Kong, English | All | S$15 / day | `/ai-firewall` |
| **SG-HK \| App \| Android installs** (phase 3) | App campaign | Singapore + Hong Kong, English + Chinese (Traditional) | Android (automatic) | S$15 / day | Google Play listing |

Why computers only for the extension campaigns: Chrome on phones and tablets cannot install extensions. Their clicks would pay for visitors who cannot install. Set **Mobile phones and Tablets to -100%** on both Search campaigns (Insights and reports, When and where ads showed, Devices, Bid adj. column). Phones are reached by the App campaign instead.

Singapore and Hong Kong are both UTC+8, so one schedule serves both.

**Campaign settings (Search)**
- Locations: Singapore, Hong Kong. Option **Presence** (people in the location), not "presence or interest".
- Languages: English (EN campaign); Chinese (Traditional) and English off for the ZH-HK campaign.
- Networks: Search only. Turn **off** Search Partners and the Display Network for the first 14 days.
- Schedule: Monday to Friday, 08:00 to 20:00 (the buyers are at work). Add Saturday and Sunday only for the developer ad group after week 2.
- Bidding: start with **Maximise clicks** and a **max CPC cap of S$3.00**. After at least 15 conversions in 30 days, switch to **Maximise conversions**, later to a target CPA.
- Keywords start as phrase and exact match only. No broad match until you have conversions.
- Ad rotation: optimise. Pin nothing except, if needed, "EraseAI Firewall" to position 3.
- Tracking tags: leave the campaign-level tracking template and final URL suffix **empty**. Each ad's Final URL (in the CSVs and `copy/BUILD_SHEET.md`) already carries `utm_source`, `utm_medium`, `utm_campaign` and `utm_content`; adding a suffix would repeat them.

---

## 2. Who we are targeting

**Search (intent, the main spend).** People typing the problem. Ad groups and keywords are in `copy/keywords.csv`:
1. ChatGPT data leak: staff or individuals worried about pasting confidential data.
2. AI DLP / shadow AI: security and IT leads at companies (the Singapore fintech and Hong Kong banks and insurers on the prospect list search these terms).
3. API keys and secrets in prompts: developers.
4. AI firewall / prompt security: the product category.
5. Developer API: builders looking to filter inputs in their own apps (Pro / Teams plans).

**Audience layers (Observation only on Search, so they report but do not narrow).** In-market: Business software, Security software. Affinity: Technology enthusiasts. Add the Hong Kong and Singapore finance and insurance in-market segments if offered. **Verify** names; Google renames them.

**Demand Gen (phase 2).** Custom segments, so the video reaches people who have not searched yet:
- People who searched for the keywords above (paste the list from `keywords.csv`).
- People who visit these sites (verify each accepts): `nightfall.ai`, `cyberhaven.com`, `harmonic.security`, `lakera.ai`, `netskope.com`, `owasp.org` (LLM top 10 pages). Used only as audience signals; never named in ads.
- Apps and sites about enterprise AI governance and shadow AI.
Start Demand Gen with **video only** (3 sizes) plus the images, optimised for clicks, until the tag has data.

**App campaign (phase 3).** Google chooses people from the assets. Start it only when the Play listing has screenshots, a description and some reviews. Goal: installs. Add the in-app action later if you track one.

**Do not use** Customer Match with the prospect CSVs: about 200 contacts is far below what Google needs to serve to a list. Use LinkedIn Matched Audiences for named accounts (the outreach plan).

**Negative keywords:** `copy/negative_keywords.csv` (jobs, courses, login, OpenAI API key, jailbreak, and so on). Review the Search Terms report on day 3, day 7, then weekly, and add every irrelevant term.

---

## 3. Budget and timeline (about 28 days)

| When | What | Spend / day |
|---|---|---|
| Week 1-2 | Two Search campaigns only. Learn which keywords and ads get store clicks and sign-ups. | S$28 |
| Day 8 | Add Demand Gen with video if Search CTR is at least 3% and the site converts. | +S$15 |
| Week 3 | Add the App campaign if the Play listing is ready. | +S$15 |
| Day 14 | First review (below). | |
| Day 28 | Decide what to scale. | |

Test budget over 14 days of Search only: about S$390. The earlier agreed range was S$20-30 a day for the first test.

**Day 7 and day 14 rules**
- Keyword with S$15 spend and no store click: pause.
- CTR under 2% on a group after 300 impressions: rewrite its headlines.
- Search term irrelevant: add as a negative.
- Ad strength below "Good": add headlines from `AD_COPY.md`.
- Sign-up rate from a landing page under 1%: change the page before adding budget.
Do not raise budgets by more than 30% at a time.

**Targets to expect (starting points, not promises):** CTR 3% or more on exact and phrase security terms; cost per store click to be learned in week 1. Security keywords can be expensive, which is why the CPC cap and the small budget matter.

---

## 4. Assets and where each goes

| Asset | File(s) | Use |
|---|---|---|
| Videos (silent, 17.5 s, H.264) | `videos/eraseai-ad-landscape-1920x1080-17s.mp4`, `-square-1080x1080-`, `-portrait-1080x1920-` | Upload to YouTube (unlisted), then add the links to Demand Gen (all three) and the App campaign (all three). |
| Video posters | `videos/*-poster.jpg` | YouTube thumbnails. |
| Responsive images | `images/responsive/` (1200x628, 1200x1200, 960x1200, 1080x1920; four concepts) | Demand Gen, App campaign, Display. |
| Classic banners | `images/display-banners/` (300x250, 336x280, 728x90, 300x600, 160x600, 320x100, 970x250) | Display campaigns or placements, if you run any. |
| Logos | `images/logos/` (1200x1200 and 1200x300) | Demand Gen and App brand assets. |
| Text | `copy/AD_COPY.md` and the CSVs | Search ads, sitelinks, callouts, App and Demand Gen text, English and Traditional Chinese. |
| YouTube text | `copy/YOUTUBE.md` | Titles, descriptions, tags. |

**What the video shows** (all real, nothing invented; frames come from the live site):

| Time | Scene | On-screen words |
|---|---|---|
| 0.0-3.2 s | Data flowing through AI to the public | "Your data → AI → the world" |
| 3.2-5.8 s | The brand line | "Erase AI? We are not against AI." then "Erase your leaks before AI" |
| 5.8-8.8 s | EraseAI logo | "The eraser at your Send button." |
| 8.8-14.6 s | Plans, then the preview window plays: type a message with a key, EraseAI stops it, one click masks it | "Checked before you send" and the captions |
| 14.6-17.5 s | End card | "Use AI. Keep your data." · eraseai.ai · Chrome Web Store (free) · Google Play |

The only "sample" text anywhere is **AWS's published example key** (`AKIAIOSFODNN7EXAMPLE`), a documentation key that has never worked, used to show the product catching a key. No usage figures, counts, prices or customer data appear in the videos or images. The news-clip and IBM-statistics frames of the home page are deliberately left out so the ads make no third-party claims.

Silent by design: autoplay video is muted anyway. Optional voice-over, if you want one for YouTube (17 seconds): "Your data goes to AI. And from there, further than you think. EraseAI sits at your Send button. It checks the message, stops the key, and lets you send safely. Use AI. Keep your data. EraseAI dot AI."

---

## 5. Policy and compliance checklist

- **Claims:** only those in `AD_COPY.md` ("claims allowed" list). No accuracy figures, "best", "#1", "guaranteed", "100%", compliance promises (do not say "PDPA compliant"), or network-blocking or VPN wording.
- **Third-party names:** ChatGPT, Claude and Gemini are used descriptively in text only. No logos of those companies in any image. If Google flags a name under its trademark policy, file the standard referential-use appeal.
- **Images:** no button-like graphics or fake UI that looks clickable as a call to action (images show real UI as a picture; the call to action is not drawn). Text covers well under 20% of area on the main sizes.
- **Display URL:** a Search ad's final URL must be on the same domain as its display URL, so Search ads go to `eraseai.ai`, and the Chrome and Play buttons live on the landing pages. The App campaign points to Google Play directly.
- **Privacy:** the tag needs a consent notice; update the privacy policy to name the Google tag and conversion tracking before launch.
- **Landing page truth:** `/ai-firewall`, `/api-key-protection-ai` and `/developer-api` are the pages ads send people to. Each already carries the Add to Chrome and Android links.

---

## 6. Launch checklist (in order)

1. Items 1-5 in section 0 (the tag first).
2. Upload the three videos to YouTube as **unlisted** using `copy/YOUTUBE.md`.
3. Create **SG-HK | Search | EN**: import `search_ads_en.csv`, `keywords.csv` (rows for that campaign), `negative_keywords.csv`, `sitelinks.csv`, `callouts.csv`; add the structured snippet from `AD_COPY.md`. Set locations, language, devices (mobile -100%), schedule, bidding as in section 1.
4. Create **HK | Search | ZH-HK** the same way with the zh-HK rows.
5. Check ad strength and the policy status; fix any disapproval before launch.
6. Day 3: Search Terms report, add negatives.
7. Day 8: add Demand Gen (videos + images + logos + text).
8. Week 3: App campaign with the app ID, the text, the images and the videos.
9. Day 14 and day 28 reviews.

CSV note: the files are shaped for Google Ads Editor's import (Campaign, Ad group, Headline 1-15, Description 1-4, Path 1-2, Final URL). If Editor's import wants different column names, use the files as a paste-ready reference; every row is validated against Google's character limits by `build/build_copy.py`.

---

## 7. Rebuilding anything

Everything is generated, so it can be refreshed when the site or copy changes:

```
pnpm --filter @workspace/eraseai run build        # PORT=3000 BASE_PATH=/
node marketing-assets/google-ads/build/render_videos.mjs   # videos
node marketing-assets/google-ads/build/make_images.mjs     # images (use SKIP_STILLS=1 to reuse the UI stills)
node marketing-assets/google-ads/build/make_logos.mjs      # logos
python3 marketing-assets/google-ads/build/build_copy.py    # all text and CSVs, with limit checks
```
