#!/usr/bin/env python3
"""Generate investor cheat sheet and speaker-notes PDFs for EraseAI."""

from fpdf import FPDF
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent


def ascii_safe(text: str) -> str:
    """fpdf core fonts are latin-1 only."""
    return (
        text.replace("\u2014", " - ")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u00b7", " - ")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )


class CheatSheetPDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-8)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(120, 120, 120)
        self.cell(0, 4, "EraseAI - Vantward Solutions - Confidential - eraseai.ai", align="C")


def build_cheat_sheet() -> Path:
    pdf = CheatSheetPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_margins(12, 10, 12)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(10, 30, 50)
    pdf.cell(0, 8, "EraseAI Investor Cheat Sheet", ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 5, ascii_safe("$2.5M seed - Firdous Mahmood - director@vantward.com - Singapore"), ln=True)
    pdf.ln(2)

    sections = [
        (
            "ONE-LINER",
            "Prompt-layer AI firewall: inspect, score, and act before Send. Browser + Android + API.",
        ),
        (
            "VISION",
            "Control plane for AI interactions. Govern use; don't ban ChatGPT. "
            "Wedge -> Team policy ($99/mo) -> Enterprise audit (SSO/SIEM).",
        ),
        (
            "PROBLEM",
            "Secrets/PII pasted into ChatGPT, Claude, Gemini daily. Legacy DLP misses the prompt layer. "
            "Once sent = logged, retained, irreversible.",
        ),
        (
            "TRACTION (be honest)",
            "Pre-revenue · active pilots · Chrome extension + Android (Play internal) · Stripe + Play billing live.",
        ),
        (
            "THE ASK",
            "$2.5M seed @ $12M pre (~17% dilution), or SAFE $12-15M cap. Lead $1-1.5M + angels.",
        ),
        (
            "USE OF FUNDS",
            "40% eng ($1.0M) Team console, detection, SSO hooks | "
            "35% GTM ($875K) pilot->paid | 15% ops/compliance ($375K) | 10% reserve ($250K). ~22 mo runway.",
        ),
        (
            "18-MO MILESTONES",
            "Paying Team logos · $500K-$1M ARR (or 50+ Team accounts) · 3 Enterprise design partners.",
        ),
        (
            "MARKET",
            "AI cybersecurity ~$94B by 2030 (24% CAGR, GVR). Beachhead: mid-size SaaS, agencies, tech teams.",
        ),
        (
            "VS INCUMBENTS",
            "Network DLP/CASB see traffic, not prompts. We're prompt-native, attachment-deep, multi-LLM, on-device.",
        ),
        (
            "WHY ME (not 'solo')",
            "Saw the leak -> built store-ready wedge (extension + Android + API + billing) without burning seed. "
            "26 yrs ops leadership (BAF Squadron Leader, aviation CEO) + AI governance training. "
            "Round hires GTM + enterprise eng. Solo proved the layer; team converts pilots.",
        ),
        (
            "HARD Qs",
            "OpenAI builds this? Neutral cross-LLM layer buyers need. "
            "Defensibility? Policy graph + audit + on-device depth. "
            "Revenue? Pre-revenue; round = conversion.",
        ),
        (
            "DEMO",
            "Paste AWS key or customer record into ChatGPT with extension on. Show Sanitize / Block / Send Anyway.",
        ),
        (
            "ENTERPRISE (WiFi / central server)",
            "Endpoint inspects prompt (primary). Corp firewall blocks AI bypass (backstop). "
            "Policy server on THEIR servers. WiFi alone cannot read HTTPS chat.",
        ),
        (
            "LIVE vs ENTERPRISE",
            "Today: extension + Android + cloud. Enterprise: MDM push, on-prem policy, SSO/SIEM, egress rules.",
        ),
        (
            "ENTERPRISE HOW TO (4 phases)",
            "1 Policy server on customer infra 2 Endpoint via Chrome Enterprise/MDM "
            "3 Network egress/DNS backstop 4 Pilot then roll out. Full guide in deliverables/.",
        ),
        (
            "CLOSE",
            "Stop the leak before Send. Sell the control plane after. Pause 2 beats -> Q&A.",
        ),
    ]

    for title, body in sections:
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(6, 120, 140)
        pdf.cell(0, 4, title, ln=True)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 3.6, ascii_safe(body))
        pdf.ln(1)

    path = OUT / "EraseAI_Investor_Cheat_Sheet.pdf"
    pdf.output(str(path))
    return path


class SpeakerNotesPDF(FPDF):
    def footer(self):
        self.set_y(-10)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 5, f"EraseAI speaker notes - page {self.page_no()}", align="C")


def add_slide(pdf: SpeakerNotesPDF, num: int, title: str, say: str, notes: str, timing: str):
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(6, 120, 140)
    pdf.cell(0, 6, ascii_safe(f"SLIDE {num} - {timing}"), ln=True)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(10, 30, 50)
    pdf.multi_cell(0, 8, ascii_safe(title))
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 5, "SAY:", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5, ascii_safe(say))
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 5, "NOTES / TRANSITION:", ln=True)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(70, 70, 70)
    pdf.multi_cell(0, 4.5, ascii_safe(notes))


def build_speaker_notes() -> Path:
    pdf = SpeakerNotesPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(18, 15, 18)

    slides = [
        (
            1,
            "Title — AI firewall for the prompt layer",
            "~45 sec",
            "I'm Firdous Mahmood, founder of EraseAI at Vantward Solutions in Singapore. "
            "We sit at the moment of Send — before data reaches ChatGPT, Claude, or Gemini. "
            "Browser extension, Android app, developer API. This is a two-point-five-million-dollar seed "
            "to turn a live wedge into Team revenue.",
            "Don't rush. Make eye contact. Deck slide 1/12. "
            "If they know cyber: lead with 'prompt layer DLP.' If generalist: lead with 'shadow AI leak.'",
        ),
        (
            2,
            "Problem + Why Now",
            "~90 sec",
            "Every day, employees paste source code, customer records, and API keys into public AI tools. "
            "Shadow AI happens inside the browser — IT never sees the prompt. Legacy DLP was built for email "
            "attachments, not conversational AI. Once it's sent, it can be logged or used for training — "
            "disclosure is irreversible. Three forces make this urgent now: GenAI adoption, tightening regulation, "
            "and breach costs averaging nearly five million dollars.",
            "Deck slides 2-3. Cite Cyberhaven qualitatively if asked ('meaningful share confidential'). "
            "Don't fear-monger — stay factual. Transition: 'That's the gap we close.'",
        ),
        (
            3,
            "Solution — Prompt-layer firewall",
            "~75 sec",
            "EraseAI is a prompt-layer firewall. Browser extension intercepts prompts and attachments before Send. "
            "Android gives the same gate on mobile AI apps. We flag PII, secrets, credentials, and high-risk content "
            "on-device — then the user sanitizes, cancels, or sends with audit. Individual install is the wedge; "
            "Team policy and Enterprise audit are where we monetize.",
            "Deck slide 4. Emphasize: wedge = firewall. Dataset sanitizer and API are flanks, not the seed thesis. "
            "Offer live demo after slide 5 if room is engaged.",
        ),
        (
            4,
            "How It Works",
            "~60 sec",
            "Flow is simple: intercept at Send, inspect text files and archives including OCR, classify risk, "
            "deliver a Safe, Caution, or Danger verdict, then act — rewrite, block, or allow with logging. "
            "All of this happens before the model sees the data. No network proxy required; works across "
            "ChatGPT, Claude, and Gemini from one control point.",
            "Deck slide 5. Walk through visually on slide — don't read bullet labels. "
            "Demo cue: 'I can show an AWS key block live in thirty seconds.'",
        ),
        (
            5,
            "Differentiation",
            "~60 sec",
            "We're built for the layer legacy DLP misses. Prompt-native — at Send in browser and on Android, "
            "not only on the network. Attachment-deep — text, files, OCR, archives. Multi-LLM — one policy "
            "for shadow AI across vendors. Land-and-expand — user installs first; Team and Enterprise follow. "
            "We govern use; we don't only block ChatGPT.",
            "Deck slide 6. If they mention Purview or Zscaler: 'Great products — wrong layer. "
            "We're complementary until we prove Team ARR.'",
        ),
        (
            6,
            "Market",
            "~45 sec",
            "Large market, sharp beachhead. AI in cybersecurity grows from twenty-five to ninety-four billion "
            "by 2030. Our beachhead is mid-size SaaS, agencies, and tech teams — high ChatGPT use, security "
            "waking up, no appetite to ban the tool. We sell the AI-prompt slice of a nine-billion-dollar DLP market.",
            "Deck slide 7. Do NOT say 'every company.' Beachhead first, then finance, legal, healthcare. "
            "Grand View Research on CAGR if challenged.",
        ),
        (
            7,
            "Business Model",
            "~60 sec",
            "Land free, monetize Team, expand Enterprise. Seven-day trial at zero dollars for wedge adoption. "
            "Five-dollar Personal is acquisition. Ninety-nine-dollar Team — ten seats, shared policy, admin — "
            "is primary revenue. Enterprise is custom: SSO, audit, SIEM, VPC. Nineteen-dollar API for embed. "
            "Pricing is live on eraseai.ai with Stripe and Google Play.",
            "Deck slide 8. Highlight Team as the SKU this round optimizes. Personal is top-of-funnel, not the business.",
        ),
        (
            8,
            "Unit Economics + ROI",
            "~45 sec",
            "Illustrative economics: one prevented breach — IBM averages four point eight eight million — "
            "funds years of Team seats at ninety-nine dollars a month. This is security budget, not consumer spend. "
            "Motion is land with Personal or API, expand to Team, upsell Enterprise. "
            "I'll say clearly: these are projections; we're pre-revenue today.",
            "Deck slide 9. Must verbalize 'illustrative, pre-revenue' — builds trust. "
            "Don't imply guaranteed ROI.",
        ),
        (
            9,
            "Traction + Why Me",
            "~90 sec",
            "Traction: shipping the wedge, converting to seats. Live browser firewall, Android on Play internal "
            "testing, billing wired, active pilots — pre-revenue. Next twelve months: Team admin, shared policies, "
            "audit export, convert pilots to paid logos. "
            "Why me: I saw employees paste secrets into AI tools and built the product to prove the category — "
            "not a mockup, a store-ready system. Twenty-six years in operational leadership including Squadron Leader "
            "in the Bangladesh Air Force and CEO in aviation — security with real consequences. "
            "I'm studying AI governance because buyers will be legal and compliance, not just engineering. "
            "This round hires GTM and enterprise engineering because converting twenty pilots needs a team.",
            "Deck slide 10. Honest on pre-revenue. 'Why me' = problem ownership + shipped wedge + domain fit — "
            "NOT 'I work alone.' Acknowledge solo doesn't scale; say what funding fixes.",
        ),
        (
            10,
            "Enterprise deployment",
            "~75 sec",
            "Enterprise WiFi cannot read encrypted prompts - we are endpoint-first. "
            "Layer one: extension on managed devices inspects at Send. Layer two: egress firewall "
            "blocks direct AI access unless governed - catches bypass on corp WiFi. Layer three: "
            "policy server on customer servers - rules, audit, SSO. Live today: extension, Android, cloud. "
            "Enterprise: MDM, on-prem policy, network rules, SIEM. Pilots start with browsers; "
            "seed builds console and design partners.",
            "Deck slide 11/13. Live vs Enterprise table on slide. "
            "Full HOW TO: deliverables/EraseAI_Enterprise_Deployment_Guide.md",
        ),
        (
            11,
            "The Ask + Close",
            "~60 sec",
            "We're raising two point five million dollars seed. Use of funds: Team and Enterprise console, "
            "detection hardening, GTM to convert pilots into paid seats. Milestones: paying Team logos, "
            "early ARR, Enterprise design partners with SSO and audit needs. "
            "We're at twelve million pre-money — roughly seventeen percent dilution — seeking a lead at one to "
            "one and a half million. EraseAI: stop the leak before Send. Sell the control plane after. "
            "I'd welcome your feedback and twenty minutes for a live demo. Thank you.",
            "Deck slides 11-12. Pause two beats before Q&A. Have cap table answer ready if asked. "
            "Send follow-up email within twenty-four hours with deck + video link.",
        ),
    ]

    pdf.set_font("Helvetica", "B", 20)
    pdf.add_page()
    pdf.cell(0, 10, "EraseAI - 10-Slide Speaker Notes", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        ascii_safe(
            "Maps to 12-slide deck (slides 2+3 and 11+12 combined). "
            "Target: 8-10 min + demo + Q&A. Pace ~145 wpm."
        ),
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(
        0,
        5,
        ascii_safe("Tip: Play landing video silently during slides 4-5, or run live demo after slide 4."),
    )

    for num, title, timing, say, notes in slides:
        add_slide(pdf, num, title, say, notes, timing)

    path = OUT / "EraseAI_Speaker_Notes_10_Slides.pdf"
    pdf.output(str(path))
    return path


if __name__ == "__main__":
    cheat = build_cheat_sheet()
    notes = build_speaker_notes()
    print(f"Wrote {cheat}")
    print(f"Wrote {notes}")
