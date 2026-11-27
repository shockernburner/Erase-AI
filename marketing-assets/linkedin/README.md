# LinkedIn: Vantward company page polish and the EraseAI ad campaign (2026-11-27)

Two jobs, in this order: polish the Vantward page (the ad runs from it, so people who click the company name land
there), then run the campaign. All claims stay inside `docs/marketing/product-brief-and-qa.md`.

Note: the owner's polished personal profile lives on branch `claude/linkedin-ai-security-jobs-ba87ff`, which could not
be found from this session (not on any reachable repo). Check that the tone below matches it before publishing.

## Files

| File | Use |
|---|---|
| `vantward-banner-1128x191.png` | Company page cover image (the left 300 px stay quiet because the logo sits there) |
| `eraseai-pilot-ad-1200x627.png` | Phase 2 single-image ad (landscape) |
| `eraseai-pilot-ad-1080x1080.png` | Phase 2 single-image ad (square, usually better in the mobile feed) |
| Dot film and Short | Phase 1 video ads (kept locally, not in Git: `dot-film-1920x1080.mp4`, `dot-short-1080x1920.mp4`), captions `../youtube/dot/files/*.srt`, thumbnail `../youtube/dot/files/thumb-1-eyes.png` |
| `build/` | `creatives.html` + `render.mjs` (`node render.mjs ..` re-renders the PNGs) |

## 1. Vantward company page (Admin view > Edit page)

| Field | Value |
|---|---|
| Name | Vantward Solutions Pte Ltd (keep) |
| Tagline (max 120) | `Singapore software studio. Makers of EraseAI Firewall, which checks what leaves before you press Send.` (102) |
| Website | `https://vantward.com` |
| Custom button | **Learn more** → `https://eraseai.ai/?utm_source=linkedin&utm_medium=company_page&utm_campaign=vantward` |
| Industry | **Computer and Network Security** (was "Technology, Information and Internet"; it tells buyers what you do) |
| Company size | 2–10 (keep; it is true) |
| Company type | Privately held |
| Founded | 2026 |
| Location | 68 Circular Road #02-01, Singapore 049422 (primary) |
| Cover image | `vantward-banner-1128x191.png` |
| Logo | keep the Vantward "V" (the page is Vantward; EraseAI shows in the cover and posts) |

**Specialties** (Edit page > Overview > Specialties; up to 20):
personal data protection, PDPA, data loss prevention, AI data governance, shadow AI, staff awareness, Chrome extension,
Android apps, software development, product design, Singapore startups.

**Overview / About** (max 2,000 characters):

```
Vantward Solutions is a software studio in Singapore. We build the calm parts of a loud day.

Our main product is EraseAI Firewall. In Chrome, it checks what a person is about to send to ChatGPT, Claude or Gemini and holds the message if it finds personal data, NRIC/FIN numbers, phone numbers, card numbers, passwords or keys. The person then decides: cancel, send a cleaned version, or send anyway. For a team, the owner sees what was caught, by person, without seeing what anyone wrote.

There is also an Android app for AI apps on phones. Checks are pattern rules with validators, not guesswork, so we are honest that they can miss things and sometimes flag harmless text.

Who it is for: firms of 10 to 50 people that handle client and staff data every day, such as accounting, corporate secretarial, HR and recruitment, clinics and small law firms. Free 30-day pilot for one team of up to 10 people.

We also make Rubikation (a live 1v1 cube arena), CookHub (zero-commission home cooking) and Hushclaw (a co-op game from Vantward Games).

Founder: Firdous Mahmood, 17 years in security, then aerospace engineering, then building software by hand.

Vantward Solutions Pte. Ltd. · Reg. No. 202606980C · director@vantward.com
```

**Also do before the ad starts**
1. **Products tab:** Admin view > Products > Add product > "EraseAI Firewall" (LinkedIn may need to approve it; skip if the
   option is not offered). Link the product page to `https://eraseai.ai`.
2. **Your profile Experience:** make sure your current role is linked to the Vantward company page (the logo shows, not a
   grey square). That puts you under "People" on the page.
3. **Three page posts in the week before launch**, so ad clickers see a living page:
   - Mon: the Dot film (native upload with captions; text from `../youtube/dot/README.md`, LinkedIn post section,
     rewritten in "we" form for the page).
   - Wed: "Before you press Send: three things to check" (names and NRICs, contact lists, passwords in pasted logs).
   - Fri: one honest line about the Singapore NRIC/phone checks shipping in 1.6.3, with the pilot offer.
4. **Featured:** pin the Dot post to the top of the page.
5. **Invite to follow:** use the monthly invite credits on people you know in Singapore business.

## 2. Ad campaign

Account: Vantward Solutions Pte Ltd, **USD** (keep: it matches Google Ads and cannot be changed later). Offer applied:
spend $250, get $250 in ad credits. **Read the offer's terms** (View terms and conditions on the setup screen) for the
spending deadline before you launch; the plan below spends $250 inside about 5 weeks of active days.

Campaign group: `EraseAI | SG | Dec26–Jan27`. Turn **off** LinkedIn Audience Network and **off** Audience Expansion in
both campaigns (keeps spend on real decision makers on LinkedIn itself).

### Audience (both phases; save it as `SG SME decision makers`)

- Location: **Singapore** (Phase 1 may add Hong Kong).
- Company size: **11–50** and **51–200**.
- Industries: Accounting; Legal Services; Hospitals and Health Care; Medical Practices; Staffing and Recruiting;
  Financial Services; Human Resources Services.
- Either of:
  - Job seniority **Owner, Partner, CXO, VP, Director**, or
  - Job titles: Data Protection Officer, Chief Information Security Officer, Head of Information Security, IT Manager,
    Head of IT, Practice Manager, Operations Director, Head of HR.
- Exclude: employees of Vantward Solutions.
- Check the forecast panel: aim for an audience of tens of thousands; if it is under about 20,000, add Hong Kong or the
  seniority "Manager".

### Phase 1: Dot (video views) · Tue 8 Dec to Mon 21 Dec 2026 · about $150

- Objective: **Video views**. Bid: Maximum delivery. Budget: **$10.70/day**, 14 days.
- Ads (LinkedIn tests them against each other):
  1. Dot film 1:28, landscape, captions uploaded, thumbnail `thumb-1-eyes.png`.
  2. Dot Short 0:47, vertical, captions uploaded.
- Intro text (137 characters, all visible before "see more"):
  `This is Dot. Every little dot of you: your name, your birthday, your number. Then you press Send. A 90-second film. No product, no pitch.`
- Headline: `Dot | A short film about what leaves when you press Send`
- Call to action: **Learn more** → `https://eraseai.ai/?utm_source=linkedin&utm_medium=paid&utm_campaign=dot_video`
- Same day: post the Dot film organically from your own profile (post text in `../youtube/dot/README.md`).
- Watch: view rate (views ÷ impressions), 50% and 75% completion, cost per view. After 5 days, pause the weaker ad.

Pause everything **22 Dec to 4 Jan**: decision makers are away and costs per result rise.

### Phase 2: free pilot (lead generation) · Tue 5 Jan to Fri 22 Jan 2027 · about $100

- Audience: **people who watched at least 50% of Dot** (Matched audiences > Video viewers). LinkedIn needs at least
  300 people in a matched audience to run; if Phase 1 did not reach that, use the saved `SG SME decision makers`
  audience instead.
- Objective: **Lead generation** with a LinkedIn Lead Gen Form. Bid: Maximum delivery. Budget: **$10/day**, about 10 days of
  spend spread over the window (stop at $100).
- Ads: `eraseai-pilot-ad-1080x1080.png` and `eraseai-pilot-ad-1200x627.png`.
- Intro text:
  ```
  Most firms we speak to have staff using ChatGPT or Gemini to draft letters and summarise files. The risk is rarely deliberate: a client's NRIC or a payroll list pasted in to "tidy this up".

  EraseAI checks each message at Send in ChatGPT, Claude and Gemini and holds it if it finds NRIC/FIN numbers, phone numbers, emails, card numbers or passwords. The sender decides.
  ```
- Headline: `Free 30-day pilot for up to 10 people`
- Call to action: **Request demo**.
- Lead Gen Form:
  - Fields: first name, last name, work email, company name, job title, company size (all pre-filled by LinkedIn).
  - One custom question: "Which AI tools does your team use?" (ChatGPT / Gemini / Claude / Copilot / Not sure).
  - Privacy policy: `https://eraseai.ai/privacy`.
  - Thank-you message: "Thanks. I'll email you within one working day to set up the pilot. – Firdous", with link
    `https://eraseai.ai/start`.
- **Answer every lead within one working day.** Leads go cold fast; download them daily from Campaign Manager
  (Lead gen forms > Download) or connect them to your email.

### Gates before each launch

| Gate | Phase 1 (8 Dec) | Phase 2 (5 Jan) |
|---|---|---|
| Vantward page polished and 3 posts up | required | required |
| Dot published on YouTube | recommended (comments and shares land there) | — |
| Extension **1.6.3 approved** on the Chrome Web Store (NRIC check in the store version) | not needed (no product in Dot) | **required** (the ad promises NRIC detection; until then, pilots must use the website download) |
| Pilot organisation ready in `/admin/orgs` | — | required |
| The 34 outreach emails sent (1–3 Dec) and replies handled | helps (the same names may see the film) | — |

### Why this order

Dot earns attention without asking for anything (people trust a film more than an ad), and the people who watch half of
it are the warmest possible audience for the pilot offer three weeks later. Running the pilot ad cold, before Dot,
would cost more per lead and use the "first impression" on a sales message. The December break sits between the two
phases, so January opens with a direct offer to people who already know Dot.

### What to measure, and when to stop

- Phase 1: cost per video view and completion rate. Stop early if, after $60, fewer than 25% of viewers reach 50%.
- Phase 2: cost per lead and, more importantly, leads that start a pilot. Target: 2 pilots from the $100.
- Check daily for the first 3 days, then twice a week. Do not change targeting during the first 5 days of a phase.

## Review of the owner's two ad images and the current page (2026-11-27)

Ads ("You firewalled the network. Your prompts walk straight out."), 2000x2000 and 1493x2000:
- **Fix before use: "14% of organizations were breached through shadow AI (IBM 2025)".** IBM's 2025 report says 13% of
  organisations reported breaches of AI models or applications, and about one in five (20%) studied organisations had a
  breach linked to shadow AI. 14% does not appear. Use: "1 in 5 organisations studied had a breach linked to shadow AI.
  Source: IBM Cost of a Data Breach Report 2025." and confirm the wording on IBM's page before publishing.
- "No language model in the loop": true (the checks and the paid rewrite are rules in code; note the pricing page calls
  the rewrite "AI rewriting", which should be reworded separately).
- "API key" in the mock-up: the project rule is to lead with personal data, not keys; for Singapore swap it to "NRIC".
- CTA "Talk to us: enterprise" fits companies of 200+ people, not the 11–200 audience in this plan. Either target 201+
  with it as a separate, later campaign, or change the button to the pilot.
- The 1493x2000 version is 3:4; LinkedIn's vertical image format is 4:5, so it may be cropped. Pad to 1600x2000.
- eraseai.ai/contact exists (HTTP 200).

Page (screenshots):
- **Description and tagline** claim four verticals, including EV infrastructure, smart mobility and digital
  transformation consulting, and "machine unlearning". Nothing in this repo supports those; the owner decides whether
  they are real services. If not, replace with the EraseAI-led About above.
- **Phone** is +852 (Hong Kong); everywhere else the public number is +65 8243 0739. Use one.
- **Year founded 2024**, while the registration number 202606980C indicates incorporation in 2026. Confirm.
- **Duplicate location** (the same address twice): delete the second row.
- **Custom testimonial (Premium):** the grey "Jeff Carter, CEO at Flexis" text is LinkedIn's placeholder. Only add a
  real, permitted quote; leave it off until a pilot customer agrees.
- **Credibility highlights (Premium):** real ones available today: "Verified trader publisher on the Chrome Web Store",
  "Launched on Product Hunt" (if the launch happened), "Registered in Singapore, UEN 202606980C".
- **Custom button:** during the campaign switch to "Learn more" → eraseai.ai (UTM above) and turn on "Increase custom
  button visibility" so it shows on posts.
