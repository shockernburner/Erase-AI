#!/usr/bin/env python3
"""All Google Ads text in one place. Validates every limit, then writes the CSVs
(for Google Ads Editor / manual paste) and copy/AD_COPY.md.

    python3 marketing-assets/google-ads/build/build_copy.py

Limits (Google Ads): RSA headline 30, description 90, path 15; sitelink text 25,
description 35; callout 25. Chinese/Japanese/Korean characters count as 2.
Claims here must match the product: keep them in sync with docs/handoff/CONTEXT.md.
"""
import csv
import sys
import unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "copy"
OUT.mkdir(exist_ok=True)
SITE = "https://eraseai.ai"


def width(s: str) -> int:
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in s)


problems = []


def check(label: str, s: str, limit: int):
    if width(s) > limit:
        problems.append(f"{label}: {width(s)} > {limit}: {s}")
    return s


def utm(campaign: str, content: str = "") -> str:
    q = f"utm_source=google&utm_medium=cpc&utm_campaign={campaign}&utm_content={{adgroupid}}"
    return q if not content else q + f"&utm_term={content}"


# ---------------------------------------------------------------- English
EN_HEADLINES_COMMON = [
    "Use AI. Keep Your Data.",
    "Free Chrome Extension",
    "Checks Every Message First",
    "Catches Keys, Passwords & PII",
    "Works With ChatGPT & Claude",
    "Gemini Protection Too",
    "On-Device Checks, No Account",
    "Android App on Google Play",
    "Protect Every AI Chat",
    "EraseAI Firewall",
    "Try It In 30 Seconds",
    "Plans For Teams & Families",
]
EN_DESCRIPTIONS_COMMON = [
    "Stops API keys, passwords and personal data before they reach ChatGPT, Claude or Gemini.",
    "Free on-device checks, no account needed. Add to Chrome in under a minute.",
    "Personal adds one-click redaction, file scanning, history and the Android app.",
    "For teams: invite people, see what was caught by person, one invoice. Start with a pilot.",
]

EN_GROUPS = {
    "chatgpt-data-leak": dict(
        url="/ai-firewall",
        path=("chatgpt", "data-leak"),
        headlines=[
            "Stop Secrets Reaching ChatGPT",
            "Stop Pasting Data Into AI",
            "ChatGPT Data Leak Protection",
            "Prevent ChatGPT Data Leaks",
            "Check Prompts Before Send",
        ],
        descriptions=["Catches API keys, card numbers and personal data in your prompt before you hit Send."],
        keywords=[
            ("chatgpt data leak", "phrase"), ("prevent chatgpt data leak", "phrase"),
            ("stop employees pasting data into chatgpt", "phrase"), ("sensitive data in chatgpt", "phrase"),
            ("chatgpt confidential information", "phrase"), ("chatgpt privacy for business", "phrase"),
            ("protect data from chatgpt", "phrase"), ("[chatgpt data leak prevention]", "exact"),
        ],
    ),
    "ai-dlp": dict(
        url="/ai-firewall",
        path=("ai-dlp", "shadow-ai"),
        headlines=[
            "AI Data Loss Prevention",
            "Shadow AI Protection",
            "DLP For ChatGPT & Claude",
            "Control What Staff Send To AI",
            "Pilot It With Your Team",
        ],
        descriptions=["Staff use ChatGPT at work. EraseAI checks each message before it leaves the browser."],
        keywords=[
            ("ai data loss prevention", "phrase"), ("[ai dlp]", "exact"), ("dlp for chatgpt", "phrase"),
            ("shadow ai", "phrase"), ("shadow ai prevention", "phrase"), ("generative ai data security", "phrase"),
            ("llm data leakage prevention", "phrase"), ("genai dlp", "phrase"), ("[ai data loss prevention]", "exact"),
        ],
    ),
    "api-keys-secrets": dict(
        url="/api-key-protection-ai",
        path=("api-keys", "ai-prompts"),
        headlines=[
            "Stop Pasting API Keys Into AI",
            "Catch Secrets In Prompts",
            "Redact Secrets Before Send",
            "API Key Leak Protection",
            "Keys, Tokens, Passwords",
        ],
        descriptions=["Catches AWS, OpenAI, GitHub and Stripe keys, tokens and private keys before they are sent."],
        keywords=[
            ("api key leaked chatgpt", "phrase"), ("stop pasting api keys", "phrase"), ("detect secrets in prompts", "phrase"),
            ("redact secrets from prompts", "phrase"), ("prompt secret scanner", "phrase"), ("api key in chatgpt prompt", "phrase"),
        ],
    ),
    "ai-firewall": dict(
        url="/ai-firewall",
        path=("ai-firewall", "chrome"),
        headlines=[
            "AI Firewall For Your Browser",
            "ChatGPT Security Extension",
            "AI Prompt Security",
            "Browser Firewall For AI Chats",
            "Chrome Extension, Free",
        ],
        descriptions=["A firewall for AI chats. It checks the message and shows what it found. You choose."],
        keywords=[
            ("ai firewall", "phrase"), ("[ai firewall extension]", "exact"), ("chatgpt security extension", "phrase"),
            ("ai prompt security", "phrase"), ("ai prompt firewall", "phrase"), ("browser extension ai privacy", "phrase"),
            ("claude data privacy", "phrase"), ("gemini data privacy", "phrase"),
        ],
    ),
    "developer-api": dict(
        url="/developer-api",
        path=("developer", "api"),
        headlines=[
            "Prompt Security API",
            "PII & Secret Detection API",
            "Check Prompts In Your App",
            "Keys, Webhooks, JSON",
            "Add EraseAI To Your Stack",
        ],
        descriptions=["Send text, get back the keys and personal data it contains, or the text with them masked."],
        keywords=[
            ("prompt security api", "phrase"), ("pii detection api", "phrase"), ("secret detection api", "phrase"),
            ("pii redaction api", "phrase"), ("llm input filtering api", "phrase"), ("prompt pii redaction", "phrase"),
        ],
    ),
}

NEGATIVES_EN = [
    "jobs", "job", "career", "careers", "salary", "internship", "course", "courses", "tutorial", "training", "certification",
    "pdf", "ppt", "template", "definition", "meaning", "wikipedia", "login", "sign in", "download chatgpt", "chatgpt app",
    "chatgpt free", "chatgpt plus", "openai api key", "how to get api key", "api key generator", "jailbreak", "bypass",
    "hack", "crack", "cheat", "essay", "homework", "stock", "stocks", "news", "github", "open source",
]

# ------------------------------------------------------------- Chinese (HK)
ZH_HEADLINES_COMMON = [
    "使用 AI，同時保護資料",
    "免費 Chrome 擴充功能",
    "發送前先檢查每則訊息",
    "偵測金鑰、密碼及個人資料",
    "支援 ChatGPT 及 Claude",
    "亦支援 Gemini",
    "裝置端檢查，毋須註冊",
    "Android 版已上架 Google Play",
    "保護每一次 AI 對話",
    "EraseAI 防火牆",
    "30 秒即可試用",
    "適用於團隊及家庭",
]
ZH_DESCRIPTIONS_COMMON = [
    "於傳送前偵測 API 金鑰、密碼及個人資料，保障你在 ChatGPT、Claude 及 Gemini 的對話。",
    "免費於裝置端檢查，毋須註冊帳戶。不用一分鐘即可加到 Chrome。",
    "Personal 方案加入一鍵遮蓋、檔案掃描、記錄及 Android 應用程式。",
    "為團隊而設：邀請成員、按人查看攔截記錄、統一一張發票。可先試行。",
]
ZH_GROUPS = {
    "chatgpt-洩漏": dict(
        url="/ai-firewall",
        path=("chatgpt", "資料外洩"),
        headlines=["防止資料外洩到 ChatGPT", "停止把機密貼入 AI", "ChatGPT 資料外洩防護", "發送前先檢查提示詞", "保護 ChatGPT 私隱"],
        descriptions=["在你按下傳送前，偵測提示詞中的 API 金鑰、信用卡號碼及個人資料。"],
        keywords=[
            ("chatgpt 資料外洩", "phrase"), ("防止 chatgpt 洩露資料", "phrase"), ("員工使用 chatgpt 風險", "phrase"),
            ("chatgpt 私隱", "phrase"), ("chatgpt 機密資料", "phrase"), ("chatgpt 資安", "phrase"),
        ],
    ),
    "ai-資料防洩漏": dict(
        url="/ai-firewall",
        path=("ai-dlp", "企業"),
        headlines=["AI 資料防洩漏 (DLP)", "影子 AI 防護", "企業 AI 資安", "管理員工傳送給 AI 的內容", "與團隊一同試行"],
        descriptions=["員工在工作中使用 ChatGPT。EraseAI 在訊息離開瀏覽器前先作檢查。"],
        keywords=[
            ("ai 資料防洩漏", "phrase"), ("ai dlp", "phrase"), ("影子 ai", "phrase"), ("企業 ai 資安", "phrase"),
            ("生成式 ai 資料安全", "phrase"), ("ai 防火牆", "phrase"), ("ai 數據外洩", "phrase"),
        ],
    ),
}
NEGATIVES_ZH = ["招聘", "職位", "薪酬", "課程", "教學", "下載", "登入", "免費帳號", "破解", "越獄", "功課", "論文", "股票", "新聞", "維基百科"]

# -------------------------------------------------------------- Extensions
SITELINKS_EN = [
    ("Add to Chrome", "Free extension", "Checks every message", "/ai-firewall"),
    ("Android App", "Protection on your phone", "Try free for 7 days", "/"),
    ("Developer API", "Keys, webhooks, JSON", "Check prompts in your app", "/developer-api"),
    ("AI Security Guides", "Shadow AI, DLP, policy", "Plain-language guides", "/learn"),
    ("Plans & Pricing", "Free, Personal, Teams", "See what each plan adds", "/pricing"),
    ("Contact Us", "Talk to the team", "Set up a team pilot", "/contact"),
]
SITELINKS_ZH = [
    ("加入 Chrome", "免費擴充功能", "傳送前先檢查訊息", "/ai-firewall"),
    ("Android 應用程式", "手機上的保護", "免費試用 7 日", "/"),
    ("開發者 API", "金鑰、Webhook、JSON", "在你的應用程式內檢查", "/developer-api"),
    ("AI 資安指南", "影子 AI、DLP、政策", "淺白易明的指南", "/learn"),
    ("方案及價格", "免費、Personal、團隊", "查看各方案內容", "/pricing"),
    ("聯絡我們", "與團隊聯絡", "安排團隊試行", "/contact"),
]
CALLOUTS_EN = ["Free Chrome Extension", "No Account Needed", "Android App", "Checks Before You Send", "Singapore Company", "Team Pilots Available"]
CALLOUTS_ZH = ["免費 Chrome 擴充功能", "毋須註冊帳戶", "Android 應用程式", "傳送前先檢查", "新加坡公司", "提供團隊試行"]
SNIPPET_EN = ("Types", ["Chrome extension", "Android app", "Developer API"])
SNIPPET_ZH = ("類型", ["Chrome 擴充功能", "Android 應用程式", "開發者 API"])

# --------------------------------------------------------------- App + Demand Gen
APP_HEADLINES = ["Protect Your AI Chats", "Stop Leaks Before You Send", "Safer AI On Android", "EraseAI Firewall", "Use AI. Keep Your Data."]
APP_DESCRIPTIONS = [
    "Checks what you're about to send in AI apps. Try free for 7 days.",
    "Keeps API keys, passwords and personal data out of your AI chats.",
    "Works alongside the free EraseAI Chrome extension.",
    "Check before you send. You choose what happens next.",
    "Private by design: checks run on your device.",
]
APP_HEADLINES_ZH = ["保護你的 AI 對話", "傳送前先攔截外洩", "Android 上更安心用 AI", "EraseAI 防火牆", "使用 AI，同時保護資料"]
APP_DESCRIPTIONS_ZH = [
    "檢查你在 AI 應用程式中準備傳送的內容。免費試用 7 日。",
    "避免 API 金鑰、密碼及個人資料流入 AI 對話。",
    "可配合免費的 EraseAI Chrome 擴充功能使用。",
    "傳送前先檢查，由你決定下一步。",
    "裝置端檢查，保障私隱。",
]
DG_HEADLINES = ["Use AI. Keep Your Data.", "Stop Secrets Reaching ChatGPT", "Your AI Chats, Checked First", "Free Chrome Extension + Android", "Check Prompts In Your Own App"]
DG_LONG = ["Checks messages for secrets and personal data before they reach ChatGPT, Claude or Gemini."]
DG_DESCRIPTIONS = [
    "Free on-device checks in Chrome. Android app on Google Play.",
    "Catches API keys, card numbers and personal data before you press Send.",
    "Plans for individuals, teams and families. Start free.",
    "Developers: an API with keys, webhooks and JSON responses.",
    "Made by Vantward Solutions, Singapore.",
]
DG_HEADLINES_ZH = ["使用 AI，同時保護資料", "防止機密資料外洩到 ChatGPT", "AI 對話，先檢查再傳送", "免費 Chrome 擴充功能及 Android", "在你的應用程式內檢查提示詞"]
DG_LONG_ZH = ["EraseAI 在訊息傳送到 ChatGPT、Claude 或 Gemini 之前，先檢查有否金鑰、密碼及個人資料。"]
DG_DESCRIPTIONS_ZH = [
    "於 Chrome 免費在裝置端檢查。Android 應用程式已上架 Google Play。",
    "於你按下傳送前，偵測 API 金鑰、信用卡號碼及個人資料。",
    "設有個人、團隊及家庭方案，可免費開始。",
    "開發者適用：提供金鑰、Webhook 及 JSON 回應的 API。",
    "由新加坡 Vantward Solutions 開發。",
]


# ----------------------------------------------------------------- validate + write
def rsa_rows(campaign, groups, common_h, common_d, lang):
    rows = []
    for name, g in groups.items():
        h = [check(f"{campaign}/{name} headline", x, 30) for x in g["headlines"] + common_h][:15]
        d = [check(f"{campaign}/{name} description", x, 90) for x in g["descriptions"] + common_d][:4]
        p1, p2 = (check(f"{campaign}/{name} path", x, 30) for x in g["path"])  # 15 chars: CJK counts as 2, so limit is 30 width
        if width(g["path"][0]) > 15 or width(g["path"][1]) > 15:
            problems.append(f"{campaign}/{name} path > 15: {g['path']}")
        row = {"Campaign": campaign, "Ad group": name, "Ad type": "Responsive search ad", "Language": lang}
        for i in range(15):
            row[f"Headline {i + 1}"] = h[i] if i < len(h) else ""
        for i in range(4):
            row[f"Description {i + 1}"] = d[i] if i < len(d) else ""
        row.update({"Path 1": g["path"][0], "Path 2": g["path"][1], "Final URL": f"{SITE}{g['url']}?{utm(campaign)}"})
        rows.append(row)
    return rows


def write_csv(name, rows):
    with open(OUT / name, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


C_EN = "SG-HK | Search | EN | Extension+Leak"
C_ZH = "HK | Search | ZH-HK | Extension+Leak"
ads_en = rsa_rows(C_EN, EN_GROUPS, EN_HEADLINES_COMMON, EN_DESCRIPTIONS_COMMON, "English")
ads_zh = rsa_rows(C_ZH, ZH_GROUPS, ZH_HEADLINES_COMMON, ZH_DESCRIPTIONS_COMMON, "Chinese (Traditional)")
write_csv("search_ads_en.csv", ads_en)
write_csv("search_ads_zh-HK.csv", ads_zh)

kw_rows = []
for camp, groups in ((C_EN, EN_GROUPS), (C_ZH, ZH_GROUPS)):
    for name, g in groups.items():
        for kw, mt in g["keywords"]:
            kw_clean = kw.strip("[]")
            kw_rows.append({"Campaign": camp, "Ad group": name, "Keyword": kw_clean, "Match type": mt, "Final URL": f"{SITE}{g['url']}?{utm(camp)}"})
write_csv("keywords.csv", kw_rows)
write_csv("negative_keywords.csv", [{"Campaign": C_EN, "Keyword": k, "Match type": "phrase"} for k in NEGATIVES_EN] + [{"Campaign": C_ZH, "Keyword": k, "Match type": "phrase"} for k in NEGATIVES_ZH])

sl_rows = []
for lang, rows in (("EN", SITELINKS_EN), ("ZH-HK", SITELINKS_ZH)):
    for t, d1, d2, path in rows:
        check("sitelink", t, 25), check("sitelink d1", d1, 35), check("sitelink d2", d2, 35)
        sl_rows.append({"Language": lang, "Sitelink text": t, "Description 1": d1, "Description 2": d2, "Final URL": f"{SITE}{path}?utm_source=google&utm_medium=cpc&utm_campaign=sitelink"})
write_csv("sitelinks.csv", sl_rows)
write_csv("callouts.csv", [{"Language": "EN", "Callout": check("callout", c, 25)} for c in CALLOUTS_EN] + [{"Language": "ZH-HK", "Callout": check("callout", c, 25)} for c in CALLOUTS_ZH])

for hs, label, lim in ((APP_HEADLINES, "app headline", 30), (APP_HEADLINES_ZH, "app headline zh", 30), (DG_HEADLINES, "dg headline", 40), (DG_HEADLINES_ZH, "dg headline zh", 40), (DG_LONG, "dg long", 90), (DG_LONG_ZH, "dg long zh", 90)):
    for x in hs:
        check(label, x, lim)
for ds, label in ((APP_DESCRIPTIONS, "app desc"), (APP_DESCRIPTIONS_ZH, "app desc zh"), (DG_DESCRIPTIONS, "dg desc"), (DG_DESCRIPTIONS_ZH, "dg desc zh")):
    for x in ds:
        check(label, x, 90)
for x in EN_HEADLINES_COMMON + ZH_HEADLINES_COMMON:
    check("common headline", x, 30)

if problems:
    print("LIMIT PROBLEMS:")
    print("\n".join(problems))
    sys.exit(1)


def md_list(items, limit):
    return "\n".join(f"- {x}  ·  _{width(x)}/{limit}_" for x in items)


md = ["# Google Ads copy: every text, validated\n",
      "Generated by `build/build_copy.py`. The number after each line is its length against Google's limit (Chinese characters count as 2). Edit the script, rerun it, and these files regenerate.\n",
      "Claims allowed in ads: free Chrome extension; on-device checks with no account; checks prompts for keys, passwords, card numbers and personal data on ChatGPT, Claude, Gemini; Android app with a 7-day trial; Personal adds one-click redaction, file scanning, history; team pilots; Singapore company. **Not allowed:** accuracy or detection-rate numbers, \"best\"/\"#1\"/\"guaranteed\", \"blocks everything\", \"managed rollout\" until the pricing page stops marking it \"soon\", or any network-blocking or VPN wording.\n"]
for title, camp, groups, ch, cd, lang in (("English (Singapore + Hong Kong)", C_EN, EN_GROUPS, EN_HEADLINES_COMMON, EN_DESCRIPTIONS_COMMON, "en"), ("Traditional Chinese (Hong Kong)", C_ZH, ZH_GROUPS, ZH_HEADLINES_COMMON, ZH_DESCRIPTIONS_COMMON, "zh")):
    md.append(f"## Search: {title}\n\nCampaign: `{camp}`\n")
    md.append("### Shared headlines (added to every ad group)\n" + md_list(ch, 30) + "\n")
    md.append("### Shared descriptions\n" + md_list(cd, 90) + "\n")
    for name, g in groups.items():
        md.append(f"### Ad group `{name}`  ·  landing `{SITE}{g['url']}`  ·  path /{g['path'][0]}/{g['path'][1]}\n")
        md.append("Own headlines (put first):\n" + md_list(g["headlines"], 30) + "\n")
        md.append("Own description:\n" + md_list(g["descriptions"], 90) + "\n")
        md.append("Keywords: " + ", ".join(f"`{k.strip('[]')}` ({m})" for k, m in g["keywords"]) + "\n")
    md.append("Negative keywords (campaign level, phrase): " + ", ".join(NEGATIVES_EN if lang == "en" else NEGATIVES_ZH) + "\n")
md.append("## Sitelinks, callouts, snippet\n")
for lang, rows, co, sn in (("English", SITELINKS_EN, CALLOUTS_EN, SNIPPET_EN), ("繁體中文 (HK)", SITELINKS_ZH, CALLOUTS_ZH, SNIPPET_ZH)):
    md.append(f"**{lang}**\n")
    md.append("\n".join(f"- {t} · {d1} · {d2} → `{SITE}{p}`" for t, d1, d2, p in rows) + "\n")
    md.append("Callouts: " + " · ".join(co) + "\n")
    md.append(f"Structured snippet, header **{sn[0]}**: " + ", ".join(sn[1]) + "\n")
md.append("## App campaign (Google Play, Android installs)\n\nApp ID: `com.eraseai.firewall`\n")
md.append("English headlines\n" + md_list(APP_HEADLINES, 30) + "\n\nEnglish descriptions\n" + md_list(APP_DESCRIPTIONS, 90) + "\n")
md.append("繁體中文 headlines\n" + md_list(APP_HEADLINES_ZH, 30) + "\n\n繁體中文 descriptions\n" + md_list(APP_DESCRIPTIONS_ZH, 90) + "\n")
md.append("## Demand Gen (YouTube + Discover + Gmail)\n\nBusiness name: `EraseAI` · Final URL `https://eraseai.ai/ai-firewall` · CTA: Learn more\n")
md.append("English headlines (40)\n" + md_list(DG_HEADLINES, 40) + "\n\nLong headline (90)\n" + md_list(DG_LONG, 90) + "\n\nDescriptions (90)\n" + md_list(DG_DESCRIPTIONS, 90) + "\n")
md.append("繁體中文 headlines (40)\n" + md_list(DG_HEADLINES_ZH, 40) + "\n\nLong headline (90)\n" + md_list(DG_LONG_ZH, 90) + "\n\nDescriptions (90)\n" + md_list(DG_DESCRIPTIONS_ZH, 90) + "\n")
(OUT / "AD_COPY.md").write_text("\n".join(md), encoding="utf-8")
print("ok:", len(ads_en) + len(ads_zh), "RSAs,", len(kw_rows), "keywords, no limit problems")
