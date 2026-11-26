# SGInnovate pitch: plan, numbers and notes (working document, 2026-11-22)

Owner decisions in this session: target is **SGInnovate only**; the business is **B2B** (Android is not the lead strength, see CLAUDE.md section 2); sole founder who needs a team; pursuing a PhD at NUS **alongside** the company, not instead of it; deck and email in a plain founder voice; lead with an **outgoing firewall at the Send button**.
The model is `EraseAI_5yr_plan_model.xlsx` in this folder (live formulas; blue cells are assumptions; scenario switch at Assumptions!B10).

## 1. Where we really are (facts from the owner's screenshots, 2026-11-22)

- Play Console: released Oct 10 2026, **8 installs**, 6 device acquisitions in the last 28 days, no revenue, no buyers.
- GA4 (Jan 1 to Nov 22): **21 users**, 24 sessions, 12 from paid search; 0 purchases, $0 revenue; 1 begin-checkout (probably the owner).
- Chrome Web Store: 645 installs, 237 impressions, 88 listing views. **Do not cite the install count**: installs exceed impressions about 3x, 82% from Romania, 88% OS "Other", no uninstalls from that cohort. Cause unknown.
- 0 paying customers, solo founder. The email and deck say "live, just launched, pre-revenue".

## 2. What SGInnovate says it wants (from sginnovate.com, read 2026-11-22; their words)

- "Strategic investor, singular in our focus on helping startups translate research into emerging tech solutions."
- "Scalable companies with proven technology and market traction." Stage: "early-stage Deep Tech startups". Cheque size and a formal criteria list: **not published**.
- They combine investment with corporate engagement and development support (access to corporate partners, "follow-on funding").
- Gen AI, Cybersecurity and Quantum team: Kellie Chan (Assistant Director), Asher Lin (Assistant Manager).
- Cyber portfolio: pQCee (post-quantum), Right-Hand Cybersecurity ("monitor, measure and mitigate employee induced cyber risks in real-time"), MicroSec (IoT), Kinkayo (dark-web exposure). No AI-safety or AI-governance company found. Their blog has no article on AI security or data leakage. A workshop "How do you build securely with AI?" is listed for Nov 24 2026.
- Two honest gaps against what they say: (a) "proven technology and market traction": we have little traction; (b) "Deep Tech": today's detection is rules-based, so the deep-tech case rests on the research programme in the plan (benchmarks, detection research, national-scale governance pilots), not on a claim about today's product.

## 3. The hook, and what is true today

Owner wording: an outgoing firewall at the Send button, no proxy, no retention.
- **Outgoing firewall at the Send button**: true (Chrome extension and Android send gate).
- **No proxy**: true. EraseAI does not sit between the user and the AI provider. (Say "no proxy", not "no network".)
- **No retention**: true for the free Chrome path (on-device checks, nothing sent). For signed-in use the storage was fixed in code on 2026-11-22 (tests in `tests/store-excerpt.test.mjs`): scan history now keeps only an excerpt of up to 200 characters in which personal data, keys, tokens, passwords, database addresses and Singapore/Hong Kong phone and national ID numbers are replaced by whole labels, and flags and suggestions no longer keep the matched values. Before the fix, Android and personal scans stored up to 500 raw characters plus the matched values (`routes/mobile.ts`, `personal.ts`), and the Developer API stored an excerpt that masked secrets but not personal data.
  - Set `SCAN_TEXT_RETENTION=none` on the server to store **no message text at all** (history rows then say "[message not stored]"). A per-account or per-company switch (a column and a settings screen) is the next step and part of the pre-seed deliverables.
  - **Not true until deployed and cleaned**: the fix only protects new scans. Run `artifacts/api-server/scripts/redact-stored-scans.mjs` (dry run first, backup before `--apply`) to rewrite old rows. Until then, say "checks run on the device, nothing in the middle", not "no retention".
  - The excerpt is still message text (names and free text that no rule detects can remain). "No retention" in the strict sense means the `SCAN_TEXT_RETENTION=none` setting.
  - Public pages and the store listing were reworded to match (Developer API page, extension welcome page, STORE_LISTING.md, launch posts). The privacy policy page, the Play Data Safety form and the Chrome Privacy tab are the owner's to re-check.

Candidate first sentences (the Sequoia business-plan page asks for the company in "a single declarative sentence" and warns against listing features):
1. "EraseAI is an outgoing firewall at the Send button: it checks what staff are about to send to ChatGPT, Claude or Gemini, on the device, with no proxy in the middle." (true today)
2. Same, ending "...and, from this round, with nothing stored." (true once a no-retention mode ships)
3. "We stop the leak at the one place no network tool can see: the Send button." (punchy; "no network tool can see" is a strong claim, so do not use unless hedged)

## 4. Numbers (base case, S$; every input is an assumption)

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| Year-end ARR | 40k | 295k | 1.37M | 4.14M | 9.47M |
| Accounts / seats | 23 / 353 | 91 / 2,617 | 232 / 12,293 | 438 / 37,296 | 664 / 85,585 |
| Headcount | 7 | 13 | 20 | 27 | 32 |
| Operating cost | 0.55M | 1.57M | 2.79M | 4.40M | 6.03M |
| Net burn | 0.54M | 1.40M | 1.94M | 1.58M | (0.97M) |
| Funding in year | 1.0M | 3.0M | 5.0M | 0 | 0 |
| Year-end cash | 0.46M | 2.06M | 5.12M | 3.54M | 4.51M |

Lowest cash: S$278k in month 14, one month before the seed closes. Break-even is near month 50.
Downside (new accounts at 40% of plan): ARR S$3.9M at month 60, and the plan does not survive without cutting hiring, so hiring is gated on milestones. Upside (150%): S$14.1M.
Price: realised US$7 per seat per month against the US$9 list price (annual and volume discounts). No price change is assumed.

## 5. Rounds and valuation (assumptions, not market quotes)

| Round | When | Amount | Pre-money | Post | New investors own |
|---|---|---|---|---|---|
| Pre-seed | month 1 | S$1.0M (S$600k at close, S$400k on milestones by month 7) | S$3.0M (ask) | S$4.0M | 25% |
| Seed | month 15 | S$3.0M | S$10.6M | S$13.6M | 22% (+10% option pool) |
| Series A | month 30 | S$5.0M | S$15.0M | S$20.0M | 25% |

Founder ownership after the three rounds: about 39.5% (base case).
Pre-seed valuation cross-checks (post-money): VC method on the base-case exit about S$2.5M; probability-weighted about S$2.2M; qualitative scorecard S$2.2M. Together these point to about **S$1.5M to S$2.5M pre-money**; the S$3.0M ask is an anchor above them. Singapore pre-seed comparables could not be sourced here: ask SGInnovate and other founders before you settle.
At S$3.0M pre-money the pre-seed investor returns about 6.2x in the base case (2.5x downside, 9.3x upside) at a 5x ARR exit; investors usually look for about 10x in the success case, so expect pressure on price or on the cheque size.
If the price comes in lower, the fallback is S$750k with a leaner team (hiring order in the Hiring sheet), plus SGInnovate's talent programmes (they advertise up to 70% stipend co-funding for partner-hosted trainees; eligibility unverified).

## 6. What each round delivers

See the Milestones sheet. In one line each: **Pre-seed**: enterprise-ready Send-point firewall (admin console, SSO/SCIM, audit export, proven managed rollout, a no-retention mode, Singapore and Hong Kong identifiers, a published detection benchmark, pen test); target 3 design partners by month 6, 15 paying accounts by month 12. **Seed**: regional B2B growth through partners, second detection engineer, SOC 2 / ISO readiness; target S$300k ARR by month 24. **Series A**: regional sales, OEM and carrier pilots and national-level governance pilots as options, a bring-your-own-key AI workspace only if customers ask for it.
Phone-maker ROM integration, a bring-your-own-key AI workspace and government work are **not in the base-case revenue**.

## 7. Founder, PhD and work pass

The plan keeps the company running while a PhD (NUS, applying next week) proceeds in parallel and is framed as a research arm for detection. How a PhD student pass and company work fit together is a question for MOM, the university and a lawyer: please confirm before the pitch states anything about it. The email does not mention the PhD; the deck's long-term slide mentions the research direction only.

## 8. Besides the email

1. Attend or follow SGInnovate's Nov 24 workshop "How do you build securely with AI?" (check the date and registration on their site).
2. After emailing investments@sginnovate.com (the address from their reply), send Kellie Chan one short LinkedIn note without a pitch.
3. Ask for a short call to learn their cheque range before the deck is final.
4. Fix the retention gap in Section 3 and align the privacy documents before any "no retention" claim.
5. Ask Chrome Web Store support about the install pattern; do not quote the number.
6. Sign design partners (even unpaid) and ask for permission to name them: this is the traction gap.
7. Publish the detection benchmark early: it is the evidence for "research into technology".
8. The LinkedIn partner article is a second traction channel (system integrators).
9. Use only facts you can prove: no user counts, no ratings, no "first" or "only".

## 9. Limits of the pitch-wording research

The helper could not read the Y Combinator library (page too large) and found no cold-email source on First Round or Sequoia. What it did find: Sequoia's "company purpose in one declarative sentence", Sequoia's deck order (purpose, problem, solution, why now, market, competition, business model, team, financials, vision) and First Round's "don't bury the lede", "avoid sounding too sales-y" and "prepare a short and a long version". No real-world cold-email examples were found, so the email follows those principles and your voice, not a copied template.
