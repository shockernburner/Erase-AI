#!/usr/bin/env python3
"""Generate the EraseAI investor target list (CSV + formatted XLSX).

Contact data was gathered from public sources in June 2026. Most top
cybersecurity VCs accept pitches via a web form rather than a public inbox.
The "Email" column is marked:
  - VERIFIED : address was found published on the firm's own site
  - PATTERN  : a likely general inbox (verify before sending)
  - FORM     : no public email; use the submission form on the firm's site
Email deliverability cannot be verified here -- run any address through a
verifier (NeverBounce / ZeroBounce) before sending.
"""
import csv
import xlsxwriter

COLUMNS = [
    "Firm", "Website", "HQ / Geography", "Stage Focus", "Fit (1-5)",
    "Why Fit (cybersecurity / AI / data-governance)", "Why Now / Trigger",
    "Key Partner(s)", "Contact Method", "Email", "Email Status",
]

# Fit 5 = pure-play AI-security / data-protection seed specialist; 3 = broad fit.
ROWS = [
    # --- Tier 1: pure-play cyber / AI-security / data-protection specialists ---
    ["YL Ventures", "ylventures.com", "San Francisco / Tel Aviv", "Seed (cyber specialist)", 5,
     "Israel-US cyber seed specialist; backed MIND (AI-native DLP), Grip Security, Orca", 
     "Actively seeding AI-native data-security companies in 2024-25",
     "Yoav Leitersdorf; John Brennan", "Submission form on site", "info@ylventures.com", "PATTERN"],
    ["Cyberstarts", "cyberstarts.com", "Tel Aviv / Palo Alto", "Seed (cyber specialist)", 5,
     "Top cyber-only seed fund; portfolio includes Wiz, Island, Gem",
     "Thesis is exactly cyber at seed; runs founder-led sales network",
     "Gili Raanan", "Submission form on site", "info@cyberstarts.com", "PATTERN"],
    ["Ballistic Ventures", "ballisticventures.com", "San Francisco", "Seed / Series A (cyber exclusive)", 5,
     "Invests exclusively in cybersecurity startups",
     "Dedicated early-stage cyber fund deploying actively in 2025",
     "Ted Schlein; Roger Thornton", "Submission form on site", "info@ballisticventures.com", "PATTERN"],
    ["Ten Eleven Ventures", "1011vc.com", "Menlo Park / London", "Seed to Growth (cyber exclusive)", 5,
     "Cybersecurity-only specialist investing worldwide",
     "Global cyber mandate spanning early and growth",
     "Mark Hatfield; Alex Doll", "Form + press@1011vc.com (press only)", "press@1011vc.com", "VERIFIED (press)"],
    ["Forgepoint Capital", "forgepointcap.com", "San Mateo, CA", "Seed / Series A (cyber + data)", 5,
     "One of the largest dedicated cybersecurity & data-protection funds",
     "Heavy data-security and AI-trust thesis",
     "Don Dixon; Alberto Yepez", "Submission form on site", "info@forgepointcap.com", "PATTERN"],
    ["Glilot Capital Partners", "glilotcapital.com", "Tel Aviv", "Seed / early (cyber + AI)", 5,
     "Cyber/AI seed specialist; backed Jazz (AI-powered DLP)",
     "Recent AI-DLP seed deals signal active data-security thesis",
     "Kobi Samboursky; Arik Kleinstein", "Submission form on site", "info@glilotcapital.com", "PATTERN"],
    ["Entree Capital", "entree.vc", "Tel Aviv / London", "Seed (cyber + AI)", 5,
     "Led Lasso Security (LLM cybersecurity / data exposure) seed",
     "Just led an LLM-security seed -- active in the exact category",
     "Avi Eyal", "Submission form on site", "info@entree.vc", "PATTERN"],
    ["Team8", "team8.vc", "Tel Aviv / New York", "Company-building / Seed (cyber + data + AI)", 5,
     "Cyber & data foundry; deep enterprise-security buyer network",
     "Builds and funds data-security and AI-governance companies",
     "Nadav Zafrir; Liran Grinberg", "Submission form on site", "info@team8.vc", "PATTERN"],
    ["NightDragon", "nightdragon.com", "Sausalito, CA", "Growth + select early (cyber / AI security)", 4,
     "Cyber, safety, security & privacy specialist led by ex-McAfee CEO",
     "Strong strategic and go-to-market network in enterprise security",
     "Dave DeWalt", "info@nightdragon.com", "info@nightdragon.com", "VERIFIED"],
    ["Scout Ventures", "scout.vc", "Austin / New York", "Seed to late (frontier / dual-use cyber)", 4,
     "Frontier & dual-use deep tech incl. cybersecurity",
     "Government + commercial security relevance for regulated buyers",
     "Brad Harrison", "Form + ir@scout.vc", "ir@scout.vc", "VERIFIED (IR)"],
    ["Silent Ventures", "silentventures.com", "United States", "Seed (cyber / defense)", 4,
     "Seed-stage cybersecurity and national-security focus",
     "Cited as a go-to seed cyber firm for founders",
     "", "Submission form on site", "info@silentventures.com", "PATTERN"],
    ["Lytical Ventures", "lyticalventures.com", "New York", "Seed / early (cyber + AI)", 3,
     "Dedicated cyber, AI and data-analytics fund",
     "Enterprise-cyber thesis with corporate LP network",
     "", "Submission form on site", "info@lyticalventures.com", "PATTERN"],
    ["Benhamou Global Ventures", "benhamouglobalventures.com", "Palo Alto, CA", "Series A (enterprise / security)", 3,
     "Enterprise 4.0 incl. security and data infrastructure",
     "Enterprise buyer network for B2B security",
     "Eric Benhamou", "Submission form on site", "info@benhamouglobalventures.com", "PATTERN"],

    # --- Tier 2: AI / data-infra generalists with a security thesis ---
    ["Amplify Partners", "amplifypartners.com", "Menlo Park, CA", "Seed / Series A (AI, infra, security)", 4,
     "Technical seed fund backing AI infra and security tools",
     "Developer- and infra-led AI thesis fits a firewall product",
     "Mike Dauber; Sunil Dhaliwal", "Submission form on site", "info@amplifypartners.com", "PATTERN"],
    ["Air Street Capital", "airstreet.com", "London", "Pre-seed / Seed (AI-first)", 4,
     "AI-first fund (publishes State of AI Report)",
     "Deep AI thesis; relevant to LLM-data-governance angle",
     "Nathan Benaich", "Submission form on site", "info@airstreet.com", "PATTERN"],
    ["Index Ventures", "indexventures.com", "San Francisco / London", "Seed to Growth (AI / data)", 4,
     "Led Ryft (AI data access & authorization) seed",
     "Recent AI-data-access deal shows category appetite",
     "", "Submission form on site", "info@indexventures.com", "PATTERN"],
    ["Andreessen Horowitz (a16z)", "a16z.com", "Menlo Park, CA", "Seed to Growth (AI + security)", 3,
     "Dedicated AI and enterprise-security practices",
     "Large AI + American Dynamism / security theses",
     "", "Submission form on site", "pitch@a16z.com", "PATTERN"],
    ["Lightspeed Venture Partners", "lsvp.com", "Menlo Park, CA", "Seed to Growth (security / AI)", 3,
     "Active cybersecurity and AI investor",
     "Multiple recent cyber and AI-infra rounds",
     "", "Submission form on site", "info@lsvp.com", "PATTERN"],
    ["Greylock", "greylock.com", "San Francisco / Menlo Park", "Seed / Series A (enterprise / security)", 3,
     "Enterprise & security franchise (Palo Alto Networks, Sumo Logic)",
     "Security-heavy enterprise track record",
     "", "Submission form on site", "info@greylock.com", "PATTERN"],
    ["Bessemer Venture Partners", "bvp.com", "San Francisco / New York", "Seed to Growth (cloud / security)", 3,
     "Cloud and cybersecurity roadmap investor",
     "Publishes cyber theses; active across stages",
     "", "Submission form on site", "info@bvp.com", "PATTERN"],
    ["Accel", "accel.com", "Palo Alto / London", "Seed to Growth (B2B / security)", 3,
     "Global B2B and security investor",
     "Backs security and data-infra across US/EU",
     "", "Submission form on site", "info@accel.com", "PATTERN"],
    ["Khosla Ventures", "khoslaventures.com", "Menlo Park, CA", "Seed (deep tech / AI)", 3,
     "Deep-tech and AI seed investor",
     "Early AI-infrastructure appetite",
     "", "Submission form on site", "info@khoslaventures.com", "PATTERN"],
    ["Intel Capital", "intelcapital.com", "Santa Clara, CA", "Early (deep tech / security)", 3,
     "Strategic deep-tech and security investor",
     "Silicon + security strategic value",
     "", "Submission form on site", "intel.capital@intel.com", "PATTERN"],
    ["Insight Partners", "insightpartners.com", "New York", "Series A+ (cyber scaleups)", 3,
     "Large cyber scaleup portfolio (ScaleUp program)",
     "Best as a follow-on / later target after seed",
     "", "Submission form on site", "info@insightpartners.com", "PATTERN"],
    ["Samsung Next", "samsungnext.com", "Mountain View / global", "Seed to A (AI / security strategic)", 3,
     "Strategic investor; co-invested in Lasso Security",
     "Recent LLM-security co-investment",
     "", "Submission form on site", "info@samsungnext.com", "PATTERN"],

    # --- Tier 2: Europe / UK ---
    ["Crane Venture Partners", "crane.vc", "London", "Pre-seed / Seed (deep tech / data / security)", 4,
     "Backs early enterprise, data and security software",
     "Pre-seed/seed mandate fits EraseAI's stage",
     "Scott Sage; Krishna Visvanathan", "Submission form on site", "info@crane.vc", "PATTERN"],
    ["Notion Capital", "notion.vc", "London", "Seed / Series A (B2B SaaS / security)", 4,
     "B2B SaaS and cybersecurity specialist in Europe",
     "Security-SaaS thesis with European GTM support",
     "", "Submission form on site", "info@notion.vc", "PATTERN"],
    ["33N Ventures", "33n.vc", "Madrid / London", "Seed / Series A (cyber specialist)", 4,
     "European cybersecurity & infrastructure-software specialist",
     "Cyber-only mandate active across Europe",
     "Carlos Alberto Silva; Carlos Moreira da Silva", "Submission form on site", "info@33n.vc", "PATTERN"],
    ["Dawn Capital", "dawncapital.com", "London", "Series A / B (B2B data / security)", 3,
     "Leading European B2B software fund (incl. security/data)",
     "Strong for the A round after seed traction",
     "", "Submission form on site", "info@dawncapital.com", "PATTERN"],
    ["Seedcamp", "seedcamp.com", "London", "Pre-seed / Seed (European)", 3,
     "Europe's seed fund; broad B2B/devtools coverage",
     "Pre-seed/seed entry point into European network",
     "", "Submission form on site", "info@seedcamp.com", "PATTERN"],
    ["LocalGlobe (Phoenix Court)", "localglobe.vc", "London", "Pre-seed / Seed", 3,
     "High-volume London seed fund",
     "Active UK seed deployment",
     "", "Submission form on site", "info@localglobe.vc", "PATTERN"],
    ["Earlybird Venture Capital", "earlybird.com", "Berlin", "Seed / Series A (deep tech / security)", 3,
     "European deep-tech and security investor",
     "DACH-region enterprise reach",
     "", "Submission form on site", "info@earlybird.com", "PATTERN"],
    ["Project A Ventures", "project-a.com", "Berlin", "Seed (B2B / software)", 3,
     "Operational seed VC for B2B software",
     "Hands-on GTM support at seed",
     "", "Submission form on site", "info@project-a.com", "PATTERN"],

    # --- Tier 2/3: SEA / Singapore / Asia (EraseAI's home region) ---
    ["Wavemaker Partners", "wavemaker.vc", "Singapore / Los Angeles", "Seed (B2B / deep tech, SEA)", 4,
     "Leading SEA B2B/enterprise seed fund",
     "Home-region investor; dedicated SEA pitch inbox",
     "Paul Santos", "pitchsea@wavemaker.vc", "pitchsea@wavemaker.vc", "VERIFIED"],
    ["Cocoon Capital", "cocooncap.com", "Singapore", "Seed (enterprise / deep tech, SEA)", 4,
     "Enterprise and deep-tech seed specialist in SEA",
     "Home-region enterprise-seed fit",
     "Michael Blakey; Will Klippgen", "Submission form on site", "hello@cocooncap.com", "PATTERN"],
    ["Singtel Innov8", "innov8.singtel.com", "Singapore", "Pre-seed to Series B (cyber / AI corporate VC)", 4,
     "Singtel's corporate VC; cyber and AI mandate",
     "Strategic telco/security distribution in Asia",
     "", "Submission form on site", "innov8@singtel.com", "PATTERN"],
    ["Qualgro", "qualgro.com", "Singapore", "Series A (B2B SaaS / AI, SEA)", 3,
     "B2B SaaS and AI/data investor across SEA",
     "Regional SaaS scaling support",
     "", "Submission form on site", "info@qualgro.com", "PATTERN"],
    ["Vertex Ventures SEA & India", "vertexventures.sg", "Singapore", "Early (enterprise / deep tech)", 3,
     "Temasek-backed early-stage enterprise investor",
     "Strong Asia enterprise network",
     "", "Submission form on site", "info@vertexventures.sg", "PATTERN"],
    ["Antler", "antler.co", "Singapore / global", "Pre-seed (global)", 3,
     "Global pre-seed platform with Singapore HQ",
     "Pre-seed entry; global founder network",
     "", "Submission form on site", "info@antler.co", "PATTERN"],
    ["Jungle Ventures", "jungle-ventures.com", "Singapore", "Series A (SEA software)", 2,
     "SEA software growth investor",
     "Better fit for later rounds",
     "", "Submission form on site", "info@jungle-ventures.com", "PATTERN"],
    ["Insignia Ventures Partners", "insignia.vc", "Singapore", "Early (SEA tech)", 2,
     "Early-stage SEA technology investor",
     "Regional reach; broader (not security-specific) thesis",
     "", "Submission form on site", "info@insignia.vc", "PATTERN"],

    # --- Tier 3: developer/infra seed (firewall = developer-adjacent) ---
    ["Heavybit", "heavybit.com", "San Francisco", "Seed (developer tools / infra)", 3,
     "Developer-first infrastructure and security tooling fund",
     "Dev-tool GTM fit for the browser-extension distribution",
     "", "Submission form on site", "info@heavybit.com", "PATTERN"],
    ["Maverick Ventures", "maverickventures.com", "San Francisco", "Early (AI / security / health)", 3,
     "Backs AI and security startups",
     "AI-security appetite at early stage",
     "", "Submission form on site", "info@maverickventures.com", "PATTERN"],
    ["Battery Ventures", "battery.com", "Boston / San Francisco", "Seed to Growth (infra / security)", 3,
     "Infrastructure and security software investor",
     "Multi-stage infra/security coverage",
     "", "Submission form on site", "info@battery.com", "PATTERN"],
]


def write_csv(path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(COLUMNS)
        w.writerows(ROWS)


def write_xlsx(path):
    wb = xlsxwriter.Workbook(path)
    ws = wb.add_worksheet("Investor Targets")

    title_fmt = wb.add_format({"bold": True, "font_size": 16, "font_color": "#06b6d4"})
    sub_fmt = wb.add_format({"font_size": 10, "font_color": "#475569", "italic": True, "text_wrap": True, "valign": "top"})
    hdr_fmt = wb.add_format({"bold": True, "bg_color": "#0a0e1a", "font_color": "#FFFFFF",
                             "border": 1, "border_color": "#1e293b", "align": "left",
                             "valign": "top", "text_wrap": True})
    cell_fmt = wb.add_format({"border": 1, "border_color": "#e2e8f0", "valign": "top", "text_wrap": True})
    fit_fmt = wb.add_format({"border": 1, "border_color": "#e2e8f0", "valign": "top", "align": "center", "bold": True})

    ws.merge_range(0, 0, 0, len(COLUMNS) - 1, "EraseAI - Investor Target List", title_fmt)
    ws.merge_range(1, 0, 1, len(COLUMNS) - 1,
                   "Global venture investors in cybersecurity / AI security / data governance, weighted to "
                   "pre-seed & seed. Email status: VERIFIED = published on firm site; PATTERN = likely general "
                   "inbox, verify before sending; FORM = use the firm's submission form. Verify deliverability "
                   "(NeverBounce/ZeroBounce) before any send. Sources: public web, June 2026.", sub_fmt)
    ws.set_row(1, 46)

    hdr_row = 3
    for c, name in enumerate(COLUMNS):
        ws.write(hdr_row, c, name, hdr_fmt)

    for r, row in enumerate(ROWS, start=hdr_row + 1):
        for c, val in enumerate(row):
            if c == 4:
                ws.write(r, c, val, fit_fmt)
            else:
                ws.write(r, c, val, cell_fmt)

    widths = [24, 22, 24, 30, 8, 46, 34, 26, 30, 30, 16]
    for c, wdt in enumerate(widths):
        ws.set_column(c, c, wdt)

    ws.freeze_panes(hdr_row + 1, 0)
    ws.autofilter(hdr_row, 0, hdr_row + len(ROWS), len(COLUMNS) - 1)
    wb.close()


if __name__ == "__main__":
    write_csv("deliverables/EraseAI_Investor_List.csv")
    write_xlsx("deliverables/EraseAI_Investor_List.xlsx")
    print(f"Wrote {len(ROWS)} investor firms to CSV + XLSX")
