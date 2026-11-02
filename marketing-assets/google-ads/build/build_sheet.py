#!/usr/bin/env python3
"""Writes copy/BUILD_SHEET.md: paste-ready text for building the campaigns in the Google Ads web builder.
Run after build_copy.py:  python3 marketing-assets/google-ads/build/build_sheet.py"""
import contextlib, importlib.util, io
from pathlib import Path

here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("bc", here / "build_copy.py")
bc = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(bc)


def kwline(k, m):
    k = k.strip("[]")
    return f"[{k}]" if m == "exact" else f'"{k}"'


out = [
    "# Google Ads build sheet: paste-ready\n",
    "Everything below is copied from `build_copy.py`, so it already fits Google's limits. Work through **Campaign 1** first (English, Singapore + Hong Kong), then **Campaign 2** (Traditional Chinese, Hong Kong).\n",
    "Each ad group's Final URL already carries its tracking tags. **Do not** also set a tracking template or final URL suffix at campaign level.\n",
    "**Paste lists without the leading `- `.** Callouts below are plain lines; if a bullet dash comes along it shows up in the live ad.\n",
]


def campaign(n, name, groups, ch, cd, sl, co, sn, neg):
    out.append(f"\n---\n\n# Campaign {n}: `{name}`\n")
    out.append("## Sitelinks (campaign level)\n")
    for t, d1, d2, p in sl:
        out.append(f"- **{t}** | {d1} | {d2}\n  - URL: `{bc.SITE}{p}?utm_source=google&utm_medium=cpc&utm_campaign=sitelink`")
    out.append("\n## Callouts (one per box, no dash)\n```\n" + "\n".join(co) + "\n```")
    out.append(f"\n## Structured snippet\nHeader **{sn[0]}**, values (one per box):\n```\n" + "\n".join(sn[1]) + "\n```")
    out.append('\n## Negative keywords (campaign level, phrase match)\nPaste, one per line, with the quotes:\n```\n' + "\n".join(f'"{k}"' for k in neg) + "\n```")
    for i, (g, v) in enumerate(groups.items(), 1):
        h = (v["headlines"] + ch)[:15]
        d = (v["descriptions"] + cd)[:4]
        url = f"{bc.SITE}{v['url']}?{bc.utm(name)}"
        out.append(f"\n## Ad group {i}: `{g}`\n")
        out.append("**Keywords** (one per line; the quotes and brackets set the match type):\n```\n" + "\n".join(kwline(k, m) for k, m in v["keywords"]) + "\n```")
        out.append(f"**Final URL** (copy the whole line):\n```\n{url}\n```\n**Display path:** `{v['path'][0]}` / `{v['path'][1]}`\n")
        out.append("**Headlines** (15, one per box):\n```\n" + "\n".join(h) + "\n```")
        out.append("**Descriptions** (4):\n```\n" + "\n".join(d) + "\n```")


campaign(1, bc.C_EN, bc.EN_GROUPS, bc.EN_HEADLINES_COMMON, bc.EN_DESCRIPTIONS_COMMON, bc.SITELINKS_EN, bc.CALLOUTS_EN, bc.SNIPPET_EN, bc.NEGATIVES_EN)
campaign(2, bc.C_ZH, bc.ZH_GROUPS, bc.ZH_HEADLINES_COMMON, bc.ZH_DESCRIPTIONS_COMMON, bc.SITELINKS_ZH, bc.CALLOUTS_ZH, bc.SNIPPET_ZH, bc.NEGATIVES_ZH)
(here.parent / "copy" / "BUILD_SHEET.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("BUILD_SHEET.md written")
