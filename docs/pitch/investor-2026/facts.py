"""Single source of formatted numbers for the deck and the script.

Reads ../model/plan.json (the model) and ../model/sources.json (checked statistics) and writes facts.json.
The deck (build_deck.js) and the script (build_script.py) only print strings from facts.json; check_numbers.py
fails on any number in either file that is not in facts.json.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "..", "model")
FX = 1.30


def usd(v, digits=None):
    """US$ with k/M: 20390331 -> 'US$20.4M', 387314 -> 'US$387k', 769231 -> 'US$769k'."""
    a = abs(v)
    if a >= 1e9:
        s = f"{v / 1e9:.{1 if digits is None else digits}f}B"
    elif a >= 1e6:
        s = f"{v / 1e6:.{1 if digits is None else digits}f}M"
    elif a >= 1e3:
        s = f"{v / 1e3:.0f}k"
    else:
        s = f"{v:.0f}"
    return ("−" if v < 0 else "") + "US$" + s.replace("-", "")


def num(v):
    return f"{round(v):,}"


def pct(v):
    return f"{round(v * 100)}%"


def build():
    plan = json.load(open(os.path.join(MODEL, "plan.json")))
    srcp = os.path.join(MODEL, "sources.json")
    sources = json.load(open(srcp)) if os.path.exists(srcp) else []
    P, B, ipo, A = plan["plan"], plan["base"], plan["ipo"], plan["assumptions"]
    yrs = ["1", "2", "3", "4", "5"]
    f = {"years": {}, "base": {}, "rounds": [], "ipo": {}, "prices": {}, "assumptions": {}, "sources": {}}
    for y in yrs:
        py, by = P["years"][y], B["years"][y]
        L = py["arr_by_line_usd"]
        f["years"][y] = {
            "arr": usd(py["arr_usd"]), "revenue": usd(py["revenue_usd"]), "head": str(py["headcount"]),
            "opex": usd(py["opex_usd"]), "burn": usd(py["burn_usd"]), "funding": usd(py["funding_usd"]) if py["funding_usd"] else "–",
            "cash": usd(py["cash_usd"]),
            "lines": {k: usd(v) for k, v in L.items()},
            "lines_raw": {k: round(v) for k, v in L.items()},
            "arr_raw": round(py["arr_usd"]), "head_raw": py["headcount"],
        }
        f["base"][y] = {"arr": usd(by["arr_usd"]), "revenue": usd(by["revenue_usd"]), "head": str(by["headcount"]),
                        "burn": usd(by["burn_usd"]), "funding": usd(by["funding_usd"]) if by["funding_usd"] else "–",
                        "cash": usd(by["cash_usd"]), "arr_raw": round(by["arr_usd"]), "head_raw": by["headcount"]}
    y5 = P["years"]["5"]
    f["y5_share_core"] = pct(y5["arr_by_line_usd"]["core"] / y5["arr_usd"])
    f["y5_share_new"] = pct((y5["arr_usd"] - y5["arr_by_line_usd"]["core"] - y5["arr_by_line_usd"]["personal"]) / y5["arr_usd"])
    f["plan_vs_base_y5"] = f"{P['years']['5']['arr_usd'] / B['years']['5']['arr_usd']:.1f}x"
    f["breakeven_plan"] = str(P["breakeven_month"])
    f["breakeven_base"] = str(B["breakeven_month"])
    f["min_cash_plan"] = usd(P["min_cash_usd"])
    total = 0
    for r in P["rounds"]:
        total += r["amount_usd"]
        f["rounds"].append({
            "name": r["name"], "month": str(r["month"]),
            "amount": "about US$770k" if r["name"] == "Pre-seed" else usd(r["amount_usd"]),
            "pre": f"{usd(r['pre_low_usd'])} to {usd(r['pre_high_usd'])}",
            "method": r["method"], "founder": pct(r["founder_after"]),
            "investors": pct(r["investors_own_mid"]), "esop": pct(r["esop_topup"]) if r["esop_topup"] else "–",
        })
    f["raised_total"] = usd(total)
    f["ipo"] = {"y6": usd(ipo["years"]["6"]["arr_usd"]), "y7": usd(ipo["years"]["7"]["arr_usd"]),
                "pre": f"{usd(ipo['pre_ipo']['pre_low_usd'])} to {usd(ipo['pre_ipo']['pre_high_usd'])}",
                "method": ipo["pre_ipo"]["method"], "note": ipo["note"], "checklist": ipo["checklist"]}
    f["prices"] = {"personal": "US$5", "personal_year": "US$54", "pro": "US$19", "teams": "US$9", "teams_annual": "US$8",
                   "realised": f"US${7}"}
    f["assumptions"] = {
        "sector_price": f"US${A['sector_price']:.0f}", "sector_attach_y2": pct(A["sector_attach"]["2"]),
        "sector_attach_y5": pct(A["sector_attach"]["5"]), "rom_fee": f"US${A['rom_fee']:.2f}",
        "rom_y3": f"{A['rom_devices']['3'] / 1e6:.1f}M", "rom_y4": f"{A['rom_devices']['4'] / 1e6:.0f}M",
        "rom_y5": f"{A['rom_devices']['5'] / 1e6:.0f}M",
        "gw_y4_n": str(A["gateway"]["4"][0]), "gw_y4_p": usd(A["gateway"]["4"][1]),
        "gw_y5_n": str(A["gateway"]["5"][0]), "gw_y5_p": usd(A["gateway"]["5"][1]),
        "api_subs": str(A["api_subs_m60"]), "buffer": str(A["buffer_months"]),
        "mult_lo": str(A["forward_arr_multiple"][0]), "mult_hi": str(A["forward_arr_multiple"][1]),
        "fx": f"{A['fx']:.2f}", "core_mult": f"{A['core_multiplier']:.1f}",
        "tranche_close": usd(600_000 / FX), "tranche_m7": usd(400_000 / FX),
    }
    for s in sources:
        f["sources"][s["id"]] = s
    # Plain constants the text may use (months, years, plan sizes, product versions). Anything else must come from above.
    f["constants"] = ["1", "2", "3", "4", "5", "6", "7", "9", "10", "12", "14", "15", "17", "18", "20", "25", "30", "48",
                      "60", "100", "1.0", "1.30", "1.6.3", "2024", "2025", "2026", "2027", "2030", "2031", "2032", "2033",
                      "+65", "8243", "0739", "68", "02", "01", "049422", "202606980C", "16:9", "SOC 2", "27001"]
    json.dump(f, open(os.path.join(HERE, "facts.json"), "w"), indent=1, ensure_ascii=False)
    return f


if __name__ == "__main__":
    f = build()
    print("facts.json:", f["years"]["5"]["arr"], "plan y5 ARR;", f["base"]["5"]["arr"], "base;", len(f["sources"]), "sources")
