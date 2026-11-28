# Investor Deck Plan Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A US$ plan case beside the base case in the Excel model, an editable .pptx investor deck and a .docx speaking script, all reading the same numbers.

**Architecture:** `docs/pitch/model/plan_model.py` reproduces the workbook's monthly logic in Python (tested against the workbook), adds the plan-case engines and round sizing, writes the new sheets into the workbook and a `plan.json`. `build_deck.py` and `build_script.py` read `plan.json` + `sources.json`. A checker verifies every number in the .pptx/.docx exists in those files.

**Tech Stack:** Python 3 (openpyxl, python-pptx, python-docx, pytest-free `unittest`), LibreOffice (recalculation and PNG previews).

**Spec:** `docs/superpowers/specs/2026-11-28-investor-deck-plan-case-design.md`

## Global Constraints

- All deck/script money in US$ (FX 1 US$ = 1.30 S$); pre-seed ask S$1.0M shown as "about US$770k".
- Forbidden in deck/script: "active pilots", customers or user counts, Chrome install counts, "AI detection", "VPN", "no retention", "first", "only", "$99", "7-day trial" (for Chrome), any IPO within 5 years, the PhD.
- Gateway = on-device check deployed at scale by an organisation or carrier; no decryption; no message text kept.
- Live prices: Free; Personal US$5/month (US$54/year); Pro US$19/month; Teams US$9 per person (US$8 annual), 3–10 people; Enterprise on request.
- Brand: dark background #05070a-ish, cyan #22D3EE-ish accent, Inter; shield logo `marketing-assets/youtube/dot/build/logo-shield.png`.

## Review Focus

- A model input change (e.g. ROM devices) must flow to deck and script on regeneration, not leave stale text — Task 4 checker.
- Round sizing must never let cash go negative in any month — Task 1 test.
- Plan vs base columns must use the same definitions (ARR = 12 × month-60 revenue, Personal included) — Task 1 test.
- Valuation ranges must state method and "estimate" on the slide — Task 3 checker string test.
- Every external statistic must have publisher, year and URL in `sources.json` — Task 2/3 checker.

---

### Task 1: Model (base fix, plan case, rounds, IPO track)

**Files:** Create `docs/pitch/model/plan_model.py`, `docs/pitch/model/test_plan_model.py`; modify `docs/pitch/EraseAI_5yr_plan_model.xlsx` (Assumptions label/reference fix; new sheets `PlanAssumptions`, `PlanAnnual`, `PlanRounds`, `IPOTrack`); output `docs/pitch/model/plan.json`.

**Interfaces:** Produces `plan.json` with keys `base.years[1..5]` and `plan.years[1..5]` (`revenue_usd`, `arr_usd`, `arr_by_line_usd{core,personal,sector,rom,gateway,api}`, `headcount`, `opex_usd`, `burn_usd`, `funding_usd`, `cash_usd`), `plan.rounds[]` (`name, month, amount_usd, pre_low_usd, pre_high_usd, method, founder_after`), `plan.min_cash_usd`, `ipo.years[6,7]`, `ipo.checklist[]`, `assumptions{...}`.

- [ ] Test: `test_replica_matches_workbook` — with the workbook's own (buggy) references the replica reproduces Annual year-5 ARR S$9,473,123 (±0.1%) and lowest cash S$278,328 (±0.5%).
- [ ] Test: `test_fixed_references` — after the fix, contingency = 8%, legal & accounting = S$2,500/month (new blue input, recorded as a ruling), pen test = S$20,000/year from month 12.
- [ ] Test: `test_plan_engines` — year-5 sector revenue = seats × 35% × US$3 × 12 (±1%); ROM = 8,000,000 × US$0.60; gateway = 6 × US$500k; API = 400 × US$19 × 12.
- [ ] Test: `test_rounds_keep_cash_positive` — min monthly cash ≥ 0 and ≥ 9 months of that month's opex right after each round.
- [ ] Test: `test_base_and_plan_like_for_like` — base column equals the fixed workbook Annual ÷ 1.30.
- [ ] Implement `replicate(inputs, fixed: bool) -> list[dict]` (60 months), `plan_case(inputs, plan_inputs) -> dict`, `size_rounds(months, fixed_first_usd=769231, months_at=(1,15,30,48), buffer_months=9) -> list[dict]`, `ipo_track(plan) -> dict`, `write_workbook(path, ...)`, `main()` (writes workbook + plan.json).
- [ ] Recalculate the workbook with LibreOffice headless and confirm the fixed base sheet's Annual matches the replica (±0.5%).
- [ ] Commit.

### Task 2: Verified sources

**Files:** Create `docs/pitch/model/sources.json` (`id, claim, figure, publisher, year, url, checked`).

- [ ] Research (subagent, web) 6–10 statistics: AI security / data-loss-prevention market size, IBM 2025 breach cost (global, healthcare, financial), enterprise generative-AI adoption, global smartphone shipments 2025, shadow-AI breach share. Only items with a page that states the figure.
- [ ] Commit.

### Task 3: Deck (.pptx)

**Files:** Create `docs/pitch/investor-2026/build_deck.py`; output `docs/pitch/EraseAI_Investor_Deck_2026.pptx`.

- [ ] Load the `anthropic-skills:pptx` skill first and follow it.
- [ ] 20 slides per the spec order; numbers formatted from `plan.json`, statistics from `sources.json` (each with a footnote "publisher, year").
- [ ] Render to PNG with LibreOffice; inspect every slide (no overflow, readable at 16:9).
- [ ] Commit.

### Task 4: Script (.docx) and checker

**Files:** Create `docs/pitch/investor-2026/build_script.py`, `docs/pitch/investor-2026/check_numbers.py`; output `docs/pitch/EraseAI_Investor_Script_2026.docx`.

- [ ] Load the `anthropic-skills:docx` skill first and follow it.
- [ ] Per slide: spoken text, the one point, time; appendix with 15 Q&A.
- [ ] `check_numbers.py`: extract every number and forbidden phrase from both files; fail on any number not derivable from `plan.json`/`sources.json`/the live price list, and on any forbidden phrase. Run: expected "0 problems".
- [ ] Commit, push, final review.
