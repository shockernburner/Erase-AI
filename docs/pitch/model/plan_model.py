"""EraseAI 5-year model: base case (reproduced from the workbook) and the US$ plan case.

Run:  python3 plan_model.py        -> writes plan.json and the Plan* sheets into the workbook.
Every plan input lives in PLAN below (mirrored on the PlanAssumptions sheet); change it and re-run.
"""
import datetime
import json
import math
import os

import openpyxl
from openpyxl.styles import Font, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
WORKBOOK = os.path.join(HERE, "..", "EraseAI_5yr_plan_model.xlsx")
OUT_JSON = os.path.join(HERE, "plan.json")
LEGAL_PER_MONTH_SGD = 2500  # missing input in the workbook; added as a blue assumption (ruling 2026-11-28)

# ---------------------------------------------------------------- plan inputs (US$ unless stated)
PLAN = {
    "fx": 1.30,
    "core_multiplier": 1.5,                       # the workbook's upside account curve
    "sector_price": 3.0,                          # US$ per seat per month, add-on
    "sector_attach": {1: 0.0, 2: 0.10, 3: 0.18, 4: 0.26, 5: 0.35},
    "rom_fee": 0.60,                              # US$ per device per year
    "rom_devices": {1: 0, 2: 0, 3: 500_000, 4: 2_000_000, 5: 8_000_000},
    "gateway": {1: (0, 0), 2: (0, 0), 3: (0, 0), 4: (2, 400_000), 5: (6, 500_000)},
    "gateway_hosting": 0.08,                      # share of gateway revenue
    "api_subs_m60": 400, "api_price": 19.0,   # grows as (month/60)^2: slow start, 400 at month 60
    "marketing_multiplier": {1: 1, 2: 1, 3: 2, 4: 2, 5: 2},
    # extra roles for the engines: (role, start month, S$ base salary per month)
    "extra_roles": (
        [("Sector detection engineer", m, 10000) for m in (14, 18, 22, 26, 32, 40)]
        + [("OEM / mobile integration engineer", m, 11000) for m in (24, 26, 28, 36, 40, 44)]
        + [("Gateway / platform engineer", m, 10500) for m in (30, 34, 38, 42, 46, 50)]
        + [("Compliance and privacy counsel", m, 12000) for m in (24, 36, 48)]
        + [("OEM, carrier and partner sales", m, 11000) for m in (20, 26, 32, 38, 44, 48, 52, 56)]
        + [("Customer success", m, 7500) for m in (20, 28, 36, 44, 50, 56)]
        + [("Solutions architect", m, 10500) for m in (34, 42, 50, 58)]
        + [("Marketing", m, 7000) for m in (24, 36, 46, 54)]
        + [("Finance, HR and operations", m, 8000) for m in (26, 38, 50, 58)] + [("CFO", 40, 18000)]
        + [("Product and design", m, 11000) for m in (28, 36, 44, 52)]
    ),
    "round_months": (1, 15, 30, 48),
    "round_names": ("Pre-seed", "Seed", "Series A", "Series B"),
    "preseed_usd": 1_000_000 / 1.30,              # S$1.0M ask
    "preseed_pre_usd": (1_500_000 / 1.30, 3_000_000 / 1.30),  # cross-checks .. ask anchor (S$)
    "forward_arr_multiple": (8, 12),              # pre-money = forward 12-month ARR x 8..12 (estimate)
    "esop_topup": {"Seed": 0.10, "Series A": 0.05, "Series B": 0.05},
    "buffer_months": 9,
    "round_step": 500_000,
}


# ---------------------------------------------------------------- read the workbook inputs
def read_inputs(path):
    wb = openpyxl.load_workbook(path, data_only=False)
    a = wb["Assumptions"]
    v = lambda c: a[c].value  # noqa: E731
    hires = []
    for r in wb["Hiring"].iter_rows(min_row=2, max_row=33, values_only=True):
        if r[0]:
            hires.append((r[0], r[1], r[2]))
    rounds = []
    for r in wb["Rounds"].iter_rows(min_row=5, max_row=7, values_only=True):
        rounds.append((r[0], r[2], r[3]))
    return {
        "fx": v("B2"), "price": v("B3"), "personal_price": v("B4"), "logo_churn": v("B5"),
        "expansion": v("B6"), "personal_churn": v("B7"), "load": v("B8"), "inflation": v("B9"),
        "multiplier": v("B10"), "cloud": v("B11"), "contingency": v("B12"), "start": v("B13"),
        # Original layout: B14 repeated the start date as text and legal was missing. Fixed layout: B14 = legal.
        "legal": v("B14") if isinstance(v("B14"), (int, float)) else None,
        "pentest_year": v("B15"), "tools": v("B16"), "desk": v("B17"),
        "new_accounts": [a.cell(r, 5).value for r in range(2, 12)],
        "seats_per_new": [a.cell(r, 8).value for r in range(2, 7)],
        "personal_adds": [a.cell(r, 9).value for r in range(2, 7)],
        "marketing": [a.cell(r, 10).value for r in range(2, 7)],
        "infra": [a.cell(r, 11).value for r in range(2, 7)],
        "audits": {a["E15"].value: a["F15"].value, a["E16"].value: a["F16"].value},
        "hires": hires, "rounds": rounds,
    }


def _excel_serial(value):
    d = datetime.date.fromisoformat(str(value)[:10])
    return (d - datetime.date(1899, 12, 30)).days


def cost_terms(inp, fixed):
    """The workbook's cost references. fixed=False reproduces the saved (shifted) references."""
    if fixed:
        return {"cloud": inp["cloud"], "contingency": inp["contingency"],
                "legal_per_month": inp["legal"] if inp["legal"] is not None else LEGAL_PER_MONTH_SGD,
                "pentest_per_month": inp["pentest_year"] / 12}
    # As originally saved: contingency read the cloud cell (6%), legal read the contingency cell (0.08),
    # pen test read the start date (as text) / 12.
    return {"cloud": inp["cloud"], "contingency": inp["cloud"], "legal_per_month": inp["contingency"],
            "pentest_per_month": _excel_serial(inp["start"]) / 12}


# ---------------------------------------------------------------- monthly engine (S$, like the workbook)
def replicate(inp, fixed, multiplier=None, hires=None, marketing_mult=None, rounds=None, extra_rev=None,
              extra_cost=None):
    t = cost_terms(inp, fixed)
    mult = inp["multiplier"] if multiplier is None else multiplier
    hires = inp["hires"] if hires is None else hires
    rounds = {m: amt for _, m, amt in inp["rounds"]} if rounds is None else rounds
    months, acc, seats, pers, cash = [], 0.0, 0.0, 0.0, 0.0
    for m in range(1, 61):
        y, h = (m - 1) // 12 + 1, (m - 1) // 6 + 1
        new = inp["new_accounts"][h - 1] * mult
        acc = acc * (1 - inp["logo_churn"]) + new
        seats = seats * (1 - inp["logo_churn"] + inp["expansion"]) + new * inp["seats_per_new"][y - 1]
        b2b = seats * inp["price"] * inp["fx"]
        pers = pers * (1 - inp["personal_churn"]) + inp["personal_adds"][y - 1]
        p_mrr = pers * inp["personal_price"] * inp["fx"]
        ex = extra_rev(m, y, seats) if extra_rev else {}
        revenue = b2b + p_mrr + sum(ex.values())
        heads = [x for x in hires if x[1] <= m]
        head = len(heads)
        people = sum(x[2] for x in heads) * inp["load"] * (1 + inp["inflation"]) ** (y - 1)
        mk = inp["marketing"][y - 1] * (marketing_mult[y] if marketing_mult else 1)
        other = (revenue * t["cloud"] + inp["infra"][y - 1] + head * (inp["tools"] + inp["desk"]) + mk / 12
                 + t["legal_per_month"] + inp["audits"].get(m, 0) + (t["pentest_per_month"] if m >= 12 else 0))
        if extra_cost:
            other += extra_cost(m, y, ex)
        opex = (people + other) * (1 + t["contingency"])
        burn = opex - revenue
        funding = rounds.get(m, 0)
        cash = cash + funding - burn
        months.append({"m": m, "y": y, "accounts": acc, "seats": seats, "b2b": b2b, "personal": p_mrr,
                       "extra": ex, "revenue": revenue, "head": head, "opex": opex, "burn": burn,
                       "funding": funding, "cash": cash, "arr": revenue * 12})
    return months


def _years(months, fx):
    out = {}
    for y in range(1, 6):
        ms = [m for m in months if m["y"] == y]
        last = ms[-1]
        lines = {"core": last["b2b"] * 12 / fx, "personal": last["personal"] * 12 / fx}
        for k, val in last["extra"].items():
            lines[k] = val * 12 / fx
        out[y] = {"revenue_usd": sum(m["revenue"] for m in ms) / fx, "arr_usd": last["arr"] / fx,
                  "arr_by_line_usd": lines, "seats": last["seats"], "accounts": last["accounts"],
                  "headcount": last["head"], "opex_usd": sum(m["opex"] for m in ms) / fx,
                  "burn_usd": sum(m["burn"] for m in ms) / fx, "funding_usd": sum(m["funding"] for m in ms) / fx,
                  "cash_usd": last["cash"] / fx}
    return out


def base_case(inp):
    months = replicate(inp, fixed=True)
    return {"months": months, "years": _years(months, inp["fx"]),
            "min_cash_usd": min(m["cash"] for m in months) / inp["fx"],
            "breakeven_month": next((m["m"] for m in months if m["burn"] <= 0), None)}


# ---------------------------------------------------------------- plan case
def plan_case(inp, P):
    fx = P["fx"]

    def extra_rev(m, y, seats):  # S$ per month
        n, price = P["gateway"][y]
        return {"sector": seats * P["sector_attach"][y] * P["sector_price"] * fx,
                "rom": P["rom_devices"][y] * P["rom_fee"] / 12 * fx,
                "gateway": n * price / 12 * fx,
                "api": P["api_subs_m60"] * (m / 60) ** 2 * P["api_price"] * fx}

    def extra_cost(m, y, ex):
        return ex.get("gateway", 0) * P["gateway_hosting"]

    hires = list(inp["hires"]) + list(P["extra_roles"])

    def run(rounds_sgd):
        return replicate(inp, fixed=True, multiplier=P["core_multiplier"], hires=hires,
                         marketing_mult=P["marketing_multiplier"], rounds=rounds_sgd,
                         extra_rev=extra_rev, extra_cost=extra_cost)

    # size rounds one at a time: each covers its window with >= buffer months of opex right after it
    rm = P["round_months"]
    rounds_sgd = {rm[0]: P["preseed_usd"] * fx}
    for i in range(1, len(rm)):
        start = rm[i]
        end = rm[i + 1] - 1 if i + 1 < len(rm) else 60
        months = run(rounds_sgd)
        before = months[start - 2]["cash"]
        need_buffer = P["buffer_months"] * months[start - 1]["opex"] - (before - months[start - 1]["burn"])
        cum, worst = 0.0, 0.0
        for k in range(start - 1, end):
            cum += months[k]["burn"]
            worst = max(worst, cum)
        need_window = worst - before + 3 * months[end - 1]["opex"]
        amount_usd = max(need_buffer, need_window, 0) / fx
        amount_usd = math.ceil(amount_usd / P["round_step"]) * P["round_step"]
        rounds_sgd[start] = amount_usd * fx
    months = run(rounds_sgd)
    years = _years(months, fx)

    # valuations and ownership
    rounds, founder = [], 1.0
    for i, (name, m) in enumerate(zip(P["round_names"], rm)):
        amount = rounds_sgd[m] / fx
        if i == 0:
            lo, hi = P["preseed_pre_usd"]
            method = "Pre-revenue: cross-checks (VC method, scorecard) to the ask anchor"
        else:
            fwd = months[min(m + 11, 59)]["arr"] / fx
            lo, hi = fwd * P["forward_arr_multiple"][0], fwd * P["forward_arr_multiple"][1]
            method = "Forward 12-month ARR x 8 to 12 (estimate)"
        used = hi if i == 0 else (lo + hi) / 2  # pre-seed priced at the ask anchor; later rounds at the mid-point
        investors = amount / (used + amount)
        esop = P["esop_topup"].get(name, 0)
        founder = founder * (1 - investors) * (1 - esop)
        rounds.append({"name": name, "month": m, "amount_usd": amount, "pre_low_usd": lo, "pre_high_usd": hi,
                       "method": method, "investors_own_mid": investors, "esop_topup": esop,
                       "founder_after": founder, "modelled": True})
    return {"months": months, "years": years, "rounds": rounds,
            "min_cash_usd": min(x["cash"] for x in months) / fx,
            "breakeven_month": next((x["m"] for x in months if x["m"] > 24 and x["burn"] <= 0), None)}


def ipo_track(plan):
    a4, a5 = plan["years"][4]["arr_usd"], plan["years"][5]["arr_usd"]
    g5 = a5 / a4 - 1
    g6, g7 = g5 * 0.6, g5 * 0.6 * 0.6
    a6, a7 = a5 * (1 + g6), a5 * (1 + g6) * (1 + g7)
    return {
        "years": {6: {"arr_usd": a6, "growth": g6}, 7: {"arr_usd": a7, "growth": g7}},
        "note": "Extrapolation: growth slows to 60% of the previous year's rate each year. Not modelled bottom-up.",
        "pre_ipo": {"year": 6, "pre_low_usd": a6 * 6, "pre_high_usd": a6 * 10,
                    "method": "Year-6 ARR x 6 to 10 (illustrative estimate)"},
        "checklist": [
            "Three years of audited financial statements",
            "An independent board with audit and risk committees",
            "SOC 2 Type II and ISO 27001 certification, and tested internal controls",
            "Recurring revenue, growth and a path to profit at the scale growth-board technology listings expect",
            "Listing advisers appointed, and the reporting and governance of a public company in place",
        ],
    }


# ---------------------------------------------------------------- outputs
BLUE = Font(color="0000FF")
HEAD = Font(bold=True)
FILL = PatternFill("solid", fgColor="DDEBF7")


def write_workbook(path, inp, base, plan, ipo):
    wb = openpyxl.load_workbook(path)
    a = wb["Assumptions"]
    # Fix the shifted labels/references (ruling 2026-11-28): put each value in the row its label names.
    a["A11"], a["B11"] = "Cloud and payment costs, % of revenue", inp["cloud"]
    a["A12"], a["B12"] = "Contingency on operating costs", inp["contingency"]
    a["A13"], a["B13"] = "Calendar start (month 1)", inp["start"]
    a["A14"], a["B14"] = "Legal and accounting, S$ per month", cost_terms(inp, True)["legal_per_month"]
    a["B14"].font = BLUE
    a["A18"] = ("Fixed 2026-11-28: the labels in rows 12-14 were one row off from the formulas. Contingency now 8% "
                "(was reading 6%), legal and accounting S$2,500/month (was 0.08), pen test S$20,000/year (was the "
                "date text divided by 12).")
    ms = wb["Monthly"]
    for r in range(2, 62):
        ms[f"O{r}"] = (f"=L{r}*Assumptions!$B$11+INDEX(Assumptions!$K$2:$K$6,C{r})+M{r}*(Assumptions!$B$16+"
                       f"Assumptions!$B$17)+INDEX(Assumptions!$J$2:$J$6,C{r})/12+Assumptions!$B$14+"
                       f"SUMIF(Assumptions!$E$15:$E$16,A{r},Assumptions!$F$15:$F$16)+IF(A{r}>=12,"
                       f"Assumptions!$B$15/12,0)")
        ms[f"P{r}"] = f"=(N{r}+O{r})*(1+Assumptions!$B$12)"
    for name in ("PlanAssumptions", "PlanAnnual", "PlanRounds", "IPOTrack"):
        if name in wb.sheetnames:
            del wb[name]
    # PlanAssumptions
    s = wb.create_sheet("PlanAssumptions")
    s.append(["Plan case inputs (US$). Change PLAN in docs/pitch/model/plan_model.py and run it to refresh the Plan sheets."])
    rows = [("USD to SGD", PLAN["fx"]), ("Core account curve multiplier (workbook upside)", PLAN["core_multiplier"]),
            ("Sector pack price, US$ per seat per month", PLAN["sector_price"]),
            ("ROM / OEM fee, US$ per device per year", PLAN["rom_fee"]),
            ("Gateway hosting, share of gateway revenue", PLAN["gateway_hosting"]),
            ("Developer API subscriptions by month 60", PLAN["api_subs_m60"]),
            ("Developer API price, US$ per month", PLAN["api_price"]),
            ("Cash buffer after each round, months of opex", PLAN["buffer_months"]),
            ("Forward ARR multiple for round pricing, low", PLAN["forward_arr_multiple"][0]),
            ("Forward ARR multiple for round pricing, high", PLAN["forward_arr_multiple"][1])]
    for k, val in rows:
        s.append([k, val]); s.cell(s.max_row, 2).font = BLUE
    s.append([]); s.append(["Year", "Sector attach rate", "ROM devices", "Gateway contracts", "US$ per contract", "Marketing x base"])
    for y in range(1, 6):
        n, p = PLAN["gateway"][y]
        s.append([y, PLAN["sector_attach"][y], PLAN["rom_devices"][y], n, p, PLAN["marketing_multiplier"][y]])
    s.append([]); s.append(["Extra roles for the engines", "Start month", "Base salary S$ / month"])
    for r in PLAN["extra_roles"]:
        s.append(list(r))
    # PlanAnnual
    s = wb.create_sheet("PlanAnnual")
    s.append(["US$", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"])
    def row(label, case, key, sub=None):
        vals = [(case["years"][y][key][sub] if sub else case["years"][y][key]) for y in range(1, 6)]
        s.append([label] + [round(v) for v in vals])
    s.append(["PLAN CASE"])
    for lab, sub in (("ARR: core B2B seats", "core"), ("ARR: Personal", "personal"), ("ARR: sector packs", "sector"),
                     ("ARR: phone software (ROM)", "rom"), ("ARR: gateway", "gateway"), ("ARR: Developer API", "api")):
        row(lab, plan, "arr_by_line_usd", sub)
    for lab, key in (("Year-end ARR", "arr_usd"), ("Revenue in year", "revenue_usd"), ("Headcount (year end)", "headcount"),
                     ("Operating cost", "opex_usd"), ("Net burn", "burn_usd"), ("Funding in year", "funding_usd"),
                     ("Year-end cash", "cash_usd")):
        row(lab, plan, key)
    s.append([]); s.append(["BASE CASE (workbook, fixed, in US$)"])
    for lab, key in (("Year-end ARR", "arr_usd"), ("Revenue in year", "revenue_usd"), ("Headcount (year end)", "headcount"),
                     ("Operating cost", "opex_usd"), ("Net burn", "burn_usd"), ("Funding in year", "funding_usd"),
                     ("Year-end cash", "cash_usd")):
        row(lab, base, key)
    s.append([]); s.append(["Lowest cash, plan", round(plan["min_cash_usd"])]); s.append(["Lowest cash, base", round(base["min_cash_usd"])])
    s.append(["Break-even month, plan", plan["breakeven_month"]]); s.append(["Break-even month, base", base["breakeven_month"]])
    # PlanRounds
    s = wb.create_sheet("PlanRounds")
    s.append(["Round", "Month", "Amount US$", "Pre-money low US$", "Pre-money high US$", "Method",
              "New investors own (mid)", "ESOP top-up", "Founder after"])
    for r in plan["rounds"]:
        s.append([r["name"], r["month"], round(r["amount_usd"]), round(r["pre_low_usd"]), round(r["pre_high_usd"]),
                  r["method"], round(r["investors_own_mid"], 4), r["esop_topup"], round(r["founder_after"], 4)])
    p = ipo["pre_ipo"]
    s.append(["Pre-IPO (illustrative, not modelled)", "Year 6", "", round(p["pre_low_usd"]), round(p["pre_high_usd"]), p["method"]])
    s.append(["Valuations are estimates from the stated method, not market quotes."])
    # IPOTrack
    s = wb.create_sheet("IPOTrack")
    s.append(["Year", "ARR US$ (extrapolated)", "Growth"])
    for y in (6, 7):
        s.append([y, round(ipo["years"][y]["arr_usd"]), round(ipo["years"][y]["growth"], 3)])
    s.append([ipo["note"]]); s.append([]); s.append(["IPO-ready checklist (years 6-7)"])
    for c in ipo["checklist"]:
        s.append([c])
    for ws in (wb["PlanAnnual"], wb["PlanRounds"]):
        for c in ws[1]:
            c.font = HEAD; c.fill = FILL
    wb.calculation.fullCalcOnLoad = True  # openpyxl keeps no cached values; recalc on open
    wb.save(path)


def _clean(obj):
    if isinstance(obj, dict):
        return {str(k): _clean(v) for k, v in obj.items() if k != "months"}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, float):
        return round(obj, 2)
    return obj


def main():
    inp = read_inputs(WORKBOOK)
    base, plan = base_case(inp), plan_case(inp, PLAN)
    ipo = ipo_track(plan)
    saved = replicate(inp, fixed=False)
    out = {"generated": datetime.date.today().isoformat(), "fx": PLAN["fx"], "base": base, "plan": plan, "ipo": ipo,
           "assumptions": {k: v for k, v in PLAN.items() if k != "extra_roles"},
           "before_fix": {"arr_y5_usd": saved[59]["arr"] / PLAN["fx"],
                          "min_cash_usd": min(m["cash"] for m in saved) / PLAN["fx"],
                          "opex_by_year_usd": {y: sum(m["opex"] for m in saved if m["y"] == y) / PLAN["fx"] for y in range(1, 6)}}}
    with open(OUT_JSON, "w") as f:
        json.dump(_clean(out), f, indent=1, default=str)
    write_workbook(WORKBOOK, inp, base, plan, ipo)
    print("wrote", OUT_JSON, "and the Plan sheets")


if __name__ == "__main__":
    main()
