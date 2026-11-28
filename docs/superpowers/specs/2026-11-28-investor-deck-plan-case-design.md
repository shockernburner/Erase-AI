# Investor deck: plan case, 5 years, path to IPO (design)

Owner decisions (2026-11-28): plan case **B** (new growth engines inside the headline numbers) shown **beside the existing
base case**; everything in **US$**; deck is **general** (no investor, no country focus); build approach **A** (the Excel
model is the single source; the deck and script read their numbers from it); deck delivered as **.pptx** (opens in
Keynote; owner exports PDF); script as **.docx** for presenting in person. Act as CMO: persuasive, professional, zero
factual mistakes.

## Intent

Raise money before revenue by selling a credible, ambitious company: EraseAI grows from a Send-point firewall in the
browser and on Android into (1) sector-specific detection, (2) a firewall built into phone software (ROM), and (3) an
opt-in gateway firewall for whole organisations and carriers, with a hiring plan, staged rounds and an IPO-ready track.
Investors fund pre-revenue companies when the story, the team plan and the numbers hang together and the founder is
visibly honest about where they are today. That honesty is a selling point, not a weakness.

## Goals

- `docs/pitch/EraseAI_5yr_plan_model.xlsx` extended (not replaced) with a US$ **plan case** next to the existing base case.
- `docs/pitch/EraseAI_Investor_Deck_2026.pptx`: about 18 slides, same dark visual language as the pre-seed deck.
- `docs/pitch/EraseAI_Investor_Script_2026.docx`: per-slide talk track (about 12–15 minutes), timing, and an investor
  Q&A appendix with honest answers.
- Every figure in the deck and script traceable to a model cell or a cited source.

## Non-goals

No investor- or country-specific pages; no change to product prices or plan names; no new product code; no logos of
customers or partners we do not have.

## Anti-goals (a failure even if it looks good)

- Any false claim about today: "active pilots", "customers", user counts, the Chrome install count, "AI detection",
  "VPN", "no retention" (until the redaction script has been run), "first"/"only".
- The errors in the older "Investor Deck EN": Team "$99/mo for 10 seats" (actual US$9 per person), "7-day trial" on
  Chrome (Chrome is free), IBM 2024 breach cost (use IBM 2025, US$4.44M, if any breach figure is used).
- Stating projections as facts; valuations without "estimate" and method; an IPO claim inside five years.
- A gateway that reads as mass surveillance.

## Facts the deck may state (verified 2026-11-28)

- Live: Chrome extension (ChatGPT, Claude, Gemini, Replit; free on-device checks; paid attachment scanning and Sanitize &
  Send), Android app (send gate, Safe files), Teams dashboard with audit log, Developer API; NRIC/FIN and +65 detection
  shipped (server and website build 1.6.3; store review pending).
- Prices (live on eraseai.ai): Free; Personal US$5/month (US$54/year); Pro US$19/month; Teams US$9 per person per
  month (US$8 annual), 3–10 people; Enterprise on request.
- Traction: pre-revenue, 0 paying customers, launched Oct 2026, a founder-led outreach programme starting Dec 2026.
- Founder story: owner-approved wording in CLAUDE.md section 1 (no added details about the child, no invented rank).

## The model

Keep every existing sheet and the S$ base case untouched. Add:

1. **`PlanAssumptions`** (blue inputs, US$; FX 1 US$ = 1.30 S$ as in the existing model):
   - Core B2B seats: the existing model's **upside** account curve (scenario multiplier 1.5) at the realised
     US$7/seat/month.
   - **Sector packs** (healthcare, finance, legal, HR/education, public sector): add-on US$3/seat/month; healthcare and
     finance from year 2, legal and public from year 3; attach rate 10% of B2B seats in year 2 rising to 35% in year 5.
   - **Phone software (ROM / OEM) licensing**: per-device annual fee US$0.60; first OEM or carrier pilot in year 3
     (0.5M devices), 2M in year 4, 8M in year 5.
   - **Gateway firewall** (opt-in, organisation or carrier, no message text kept): annual contracts from year 4; 2
     contracts at US$400k in year 4, 6 at US$500k in year 5.
   - Developer API: Pro subscriptions growing to 400 by year 5 at US$19/month.
   - Hiring: base-case roles plus engines teams (OEM integration, gateway, sector detection, compliance, sales),
     reaching about 85 people by year 5; same salary and load assumptions converted to US$.
   - Costs: existing cost structure scaled by headcount; cloud and payment 6% of revenue; gateway hosting 8% of gateway
     revenue.
2. **`PlanAnnual`**: per year, revenue by line (core seats, sector packs, ROM, gateway, API), ARR at year end, headcount,
   operating cost, burn, funding, year-end cash; base case beside it converted to US$.
3. **`PlanRounds`**: pre-seed, seed, Series A, Series B (about month 48), pre-IPO (year 6); amount, timing, pre-money
   as a range from ARR multiples (stated), ownership after each round, founder stake.
4. **`IPOTrack`**: years 6–7 extrapolated from year-5 growth (labelled as extrapolation), and the readiness checklist:
   three years of audited accounts, an independent board, a governance and controls programme (SOC 2 / ISO 27001), and a
   revenue and profitability profile typical of growth-board listings (stated generally, not for one exchange).

Expected order of magnitude (to be computed, not asserted): plan-case year-5 ARR around US$20M (core about US$11M,
sector packs about US$1.6M, ROM about US$4.8M, gateway about US$3M), against the base case's about US$7.3M (S$9.5M).
The deck uses whatever the model computes.

## The deck (about 18 slides; one idea each)

1. Title: "Stop the leak at the Send button." 2. Problem. 3. Why now (sourced statistics only). 4. Product today
(live surfaces, honest). 5. How it works (check, hold, the person decides; rules-based, can miss things). 6. Where we
are (pre-revenue, launched, outreach starting; no vanity numbers). 7. Founder. 8. Business model and live prices.
9. Market (sourced, with year and publisher). 10. Competition and positioning (hedged; no "first/only").
11. Engine 1: sector detection packs. 12. Engine 2: phone software. 13. Engine 3: gateway firewall (opt-in, no
text kept). 14. Five-year plan: plan case vs base case table. 15. Revenue mix by year (chart). 16. Team and hiring
plan. 17. Rounds, valuation ranges and ownership; IPO-ready track. 18. Risks and how we handle them. 19. The ask and
what it buys (milestones). 20. Contact.

The ask (pre-seed) is the model's pre-seed amount converted to US$ unless the owner sets another figure.

## The script (.docx)

Per slide: what to say (spoken English, short sentences), the one point to land, time, and the slide's figures with
their source cell. Appendix: 15 likely investor questions with honest answers (traction, why now, competition,
detection quality, why phones would license it, surveillance concerns about the gateway, valuation, use of funds,
founder bandwidth, exit).

## Constraints

- Brand: dark background, cyan accent, Inter; EraseAI shield logo (`marketing-assets/youtube/dot/build/logo-shield.png`)
  and lockup from the current deck.
- Market and statistics: each from a named publisher and year, fetched and checked during the build; anything not
  verifiable is left out.
- Files in `docs/pitch/`; build scripts committed so the deck and script can be regenerated after a model change.

## Approaches considered

- **A (chosen): model first, deck and script generated from it.** One source of truth; the owner can change an
  assumption and regenerate.
- B: a claude.ai slides artifact. Shareable and editable, but numbers copied by hand.
- C: hand-made PowerPoint. Editable, but copy risk and a different look.

## Decisions after the builder check (2026-11-28)

- **Pre-seed ask:** S$1.0M, shown as about US$770k (owner, 1a). Later rounds are sized by the model so that cash never
  falls below 9 months of operating cost (builder's call); amounts and dates come from the model.
- **Gateway firewall:** still at the Send button, deployed at scale: the same on-device check pushed by an organisation's
  device management or a carrier to the devices it manages. No traffic decryption, nothing in the middle; "no proxy"
  holds (owner, 2a). Pitched as keeping no message text, which requires the strict no-storage setting
  (`SCAN_TEXT_RETENTION=none`) for that product. Gateway hosting cost: 8% of gateway revenue (no traffic handling).
- **PhD:** not mentioned anywhere; "solo founder" answered by the named first hires and milestone-gated hiring (owner, 3).
- **Personal subscriptions:** included in both plan and base columns (builder's call), so the comparison is like for like;
  the plan case uses the existing model's upside account curve and its Personal line as-is (no double counting).

## Left to the builder

Slide layouts within the brand, chart style, exact wording (within the facts above), which market sources to use (must be
verifiable), the tool used to write .pptx and .docx, and the Q&A selection.
