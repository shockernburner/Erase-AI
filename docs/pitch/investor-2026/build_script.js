// Builds docs/pitch/EraseAI_Investor_Script_2026.docx (speaking script + investor Q&A) from facts.json.
// Run: NODE_PATH=<global node_modules> node build_script.js
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, PageBreak, Footer, PageNumber } = require("docx");

const F = JSON.parse(fs.readFileSync(path.join(__dirname, "facts.json"), "utf8"));
const OUT = path.join(__dirname, "..", "EraseAI_Investor_Script_2026.docx");
const Y = (y) => F.years[y];
const B = (y) => F.base[y];
const A = F.assumptions;
const R = Object.fromEntries(F.rounds.map((r) => [r.name, r]));
const S = (id) => { const s = F.sources[id]; if (!s) throw new Error("missing source " + id); return s; };
const src = (id) => `${S(id).short}, ${S(id).year}`;

// Each slide: [title, seconds, point, [spoken paragraphs], figures note]
const slides = [
  ["Stop the leak at the Send button", 30, "Who you are and the one-line idea.",
    ["Good morning. I'm Firdous Mahmood, founder of EraseAI.",
      "We stop the leak at the Send button. EraseAI checks what people are about to send to ChatGPT, Claude or Gemini, on their device, before it goes. Over the next five years we take that check from the browser to whole sectors, to phones, and to organisations that switch it on for every device they manage."],
    "No figures."],
  ["The problem", 45, "Leaks are ordinary people being fast, not careless.",
    ["Think about a normal day. Someone pastes a client list into ChatGPT to summarise it before a meeting. A clinic assistant pastes a patient letter to fix the tone. Someone in finance pastes a payroll sheet to find one error.",
      "Nobody here is careless. They are fast, and the chat box accepts anything. Once it is sent, it cannot be taken back.",
      `This is not rare. One vendor study of a million prompts found that ${S("harmonic_2025_sensitive_prompts").deck_figure} of files sent to AI tools held sensitive content.`],
    `${S("harmonic_2025_sensitive_prompts").deck_figure}: ${src("harmonic_2025_sensitive_prompts")} (vendor study). Say "vendor study" if asked.`],
  ["Why now", 45, "AI use is already everywhere; the controls are behind.",
    [`${S("microsoft_wti_2024_ai_use").deck_figure} of knowledge workers already use generative AI at work. Most bring their own tools.`,
      `IBM's breach study found that ${S("ibm_2025_shadow_ai").deck_figure} organisations studied had a breach linked to shadow AI, meaning AI tools the company did not approve. And the average breach now costs ${S("ibm_2026_breach_cost_global").deck_figure}, a record.`,
      "People will use these tools whether or not there is a policy. So the control has to sit where the person is: at Send."],
    `${src("microsoft_wti_2024_ai_use")}; ${src("ibm_2025_shadow_ai")}; ${src("ibm_2026_breach_cost_global")}. The 1 in 5 figure is from the 2025 report; US$4.99M is from 2026.`],
  ["How it works", 50, "Check, hold, the person decides. Rules, not guesswork.",
    ["It works in three steps. Check: every message is checked on the device before it goes. On paid plans, attachments too: PDFs, Word, Excel, slides and screenshots, read in the browser.",
      "Hold: if it finds personal data, national ID numbers, card numbers, passwords or keys, it stops and shows what it found.",
      "Decide: the person can cancel, send anyway, or on a paid plan send a cleaned version where the sensitive values are swapped for labels.",
      "Two things matter here. There is no proxy: nothing sits between people and the AI. And the checks are rules with validators, like the card-number checksum. Rules can miss things and can flag harmless text. That is exactly why a person always has the last word."],
    "No figures."],
  ["What is live today", 40, "This is a real product, on four surfaces.",
    ["This is live today. A Chrome extension for ChatGPT, Claude, Gemini and Replit. An Android app with a send gate inside the AI apps people choose. A Teams dashboard with an audit log that records decisions but never the text anyone typed. And a Developer API.",
      "We have just added Singapore NRIC, FIN and +65 phone checks. That version is with the Chrome Web Store for review."],
    "Version 1.6.3. Check its store status on the day; if approved, say \"is live in the store\"."],
  ["Where we are, honestly", 45, "Early and pre-revenue, and saying so builds trust.",
    ["Let me be straight about where we are. We launched in October 2026. We have no paying customers yet. I am one founder, and I write the code.",
      "In December we start founder-led outreach to Singapore firms that handle client and staff data every day: accounting, HR and recruitment, clinics. Each gets a free 30-day pilot for up to 10 people.",
      "The early weeks taught us one thing clearly: a browser check on its own is not a company control. Companies need central policy, an audit trail and a way to roll it out. That is what this round builds.",
      "You will not see vanity numbers in this deck. Every figure is either a plan or a cited source."],
    "Do not quote store download figures, user counts or any pilot that has not started."],
  ["Why me", 50, "Seventeen years protecting information, and a personal reason.",
    ["I spent 17 years in security in the Air Force: physical, national and cyber. Then I became an aerospace engineer, where protecting sensitive information was the core of the job. Then I started a software company and wrote the code by hand.",
      "I watched people on teams paste company information into public AI tools. And one morning, as a father, I realised I had done the same with information about my own child.",
      "That is why EraseAI exists. I am solo today, and the plan names the opening hires: a detection engineer, an Android engineer, a platform engineer and a partnerships lead."],
    "Do not add details about the child or a rank."],
  ["Business model", 45, "Simple live prices today; three new lines priced in the plan.",
    [`Pricing is live on our website. Free for Chrome checks. Personal at ${F.prices.personal} a month or ${F.prices.personal_year} a year. Pro at ${F.prices.pro} a month with the API. Teams at ${F.prices.teams} per person per month, ${F.prices.teams_annual} on annual, for 3 to 10 people. Enterprise on request.`,
      `In the plan we assume ${F.prices.realised} per business seat after discounts, and we add three lines: sector packs at ${A.sector_price} per seat per month, phone software at ${A.rom_fee} per device per year, and gateway contracts of ${A.gw_y4_p} to ${A.gw_y5_p} a year. Those three are plan assumptions, not live prices.`],
    "Live prices: eraseai.ai/pricing. Plan prices: PlanAssumptions sheet."],
  ["Market", 40, "The budget exists, and so do the devices.",
    [`The money is already being spent. Grand View Research puts the data loss prevention market at ${S("dlp_market_grandview").deck_figure} by 2033. The average healthcare breach costs ${S("ibm_2025_breach_cost_healthcare").deck_figure}.`,
      `And ${S("idc_2025_smartphone_shipments").deck_figure} smartphones shipped last year. Our year-5 plan needs ${A.rom_y5} of them a year with the check built in.`],
    `${src("dlp_market_grandview")} (a third-party estimate; other firms define the market more broadly); ${src("ibm_2025_breach_cost_healthcare")}; ${src("idc_2025_smartphone_shipments")}, preliminary.`],
  ["Competition and position", 45, "We know the browser is crowded; we compete above it.",
    ["Other tools also check prompts at Send. On the Chrome Web Store you will find several, such as Prompt Seal, SafePaste and Caviard. They are useful for one person, but they are rarely a company control.",
      "At the other end, large security suites inspect traffic and files. They are strong for big IT teams but heavy for a firm of 10 to 200 people, and they sit in the middle of traffic.",
      "We do not claim to be alone. We compete on what sits above the check: company controls, sector packs, phones and organisation-wide deployment, with no proxy in the middle."],
    "Never say we are the leader or that nobody else does this."],
  ["Growth engine 1: sector packs", 45, "A hospital needs checks a bank does not.",
    ["Growth engine one is sector packs. A hospital needs to catch patient record numbers and diagnosis codes. A bank needs account numbers and client portfolio terms. A law firm needs matter numbers and privilege markings.",
      `Each pack is a set of rules and validators written with sector advisers. It is an add-on at ${A.sector_price} per seat per month. We plan for ${A.sector_attach_y2} of seats to take a pack in year 2, rising to ${A.sector_attach_y5} by year 5. That is ${Y("5").lines.sector} of ARR in year 5.`,
      "These packs are planned, not built. Healthcare and finance come in year 2."],
    "PlanAnnual: ARR sector packs, year 5. PlanAssumptions: attach rates."],
  ["Growth engine 2: the phone", 45, "Phone makers and carriers preload the check.",
    ["Our second engine is the phone itself. Phone makers and carriers preload the send-point check in their device software, starting with business phones.",
      "Why would they pay? Privacy sells phones, and business device programmes need a control they can show to customers.",
      `We price it at ${A.rom_fee} per device per year. The plan has a paid pilot of ${A.rom_y3} devices in year 3, ${A.rom_y4} in year 4 and ${A.rom_y5} in year 5. That is ${Y("5").lines.rom} of ARR in year 5.`,
      "None of this counts until a pilot is signed, and any Android change goes through a policy review beforehand."],
    "PlanAnnual: ARR phone software. PlanAssumptions: ROM devices and fee."],
  ["Growth engine 3: organisation-wide", 50, "The same check, switched on for every managed device. Not surveillance.",
    ["Our third engine takes the same check to scale. An organisation, a sector body or a carrier opts in. Its device management pushes the same on-device check to the phones and laptops it already manages. Each device checks at Send, and the person sees why a message is held.",
      "Let me be clear about what this is not. It is not a proxy: there is no traffic decryption and nothing in the middle. It is not monitoring: it acts on messages to AI tools, and people see every hold. And for this product, message text is not stored at all.",
      `The plan has ${A.gw_y4_n} contracts at ${A.gw_y4_p} in year 4 and ${A.gw_y5_n} at ${A.gw_y5_p} in year 5: ${Y("5").lines.gateway} of ARR.`],
    "If asked about storage today: the strict no-storage setting exists in code and is required for this product; it is not yet the default for signed-in use."],
  ["The five-year plan", 60, "A plan, with the base case beside it.",
    [`Here are the five years. The plan reaches ${Y("5").arr} of ARR at the end of year 5. Beside it is our base case, the original model with no new engines: ${B("5").arr}. So the plan is ${F.plan_vs_base_y5} the base case.`,
      `The team grows from ${Y("1").head} people in year 1 to ${Y("5").head} in year 5. The plan reaches operating break-even in month ${F.breakeven_plan}; the base case in month ${F.breakeven_base}.`,
      "Every number here is an assumption we intend to test, and every one of them is in the model you can open."],
    "PlanAnnual sheet (plan and base blocks). Break-even: the earliest month after year 2 with zero or negative burn."],
  ["Revenue mix", 40, "From one product to a portfolio.",
    [`In year 5 business seats bring ${Y("5").lines.core}, sector packs ${Y("5").lines.sector}, phone software ${Y("5").lines.rom} and the gateway ${Y("5").lines.gateway}.`,
      `So the new engines are ${F.y5_share_new} of year-5 ARR. If none of them worked, the base case still stands on its own.`],
    "PlanAnnual: ARR by line, year 5."],
  ["Team and hiring", 40, "Hiring follows milestones.",
    [`We go from one founder to ${Y("5").head} people by year 5. The pre-seed hires build the company control: detection, Android and platform engineering, a partnerships lead, customer success, security and compliance.`,
      "The seed adds sector detection, sales and marketing. Series A adds phone-maker integration, the gateway team, compliance counsel and a CFO.",
      "Each hire starts when the milestone before it is met, not before."],
    "Hiring and PlanAssumptions sheets list every role, start month and salary."],
  ["Funding path and IPO-ready track", 60, "Four rounds, each sized to need, valued by a stated method.",
    [`We plan four rounds. This pre-seed, ${R["Pre-seed"].amount}. A seed of ${R["Seed"].amount} around month ${R["Seed"].month}. A Series A of ${R["Series A"].amount} around month ${R["Series A"].month}. And a Series B of ${R["Series B"].amount} around month ${R["Series B"].month}.`,
      `Each round is sized so cash stays above ${A.buffer} months of operating cost. The valuations are estimates by method: for the later rounds, forward 12-month ARR times ${A.mult_lo} to ${A.mult_hi}. On the plan I keep ${R["Series B"].founder} after Series B.`,
      `After year 5 we build towards IPO readiness: three years of audited accounts, an independent board, SOC 2 and ISO 27001, and the growth and path to profit that growth boards expect. Extrapolated, that is ${F.ipo.y6} of ARR in year 6 and ${F.ipo.y7} in year 7. We do not plan a listing inside five years.`],
    "PlanRounds and IPOTrack sheets. Say \"estimate\" every time you say a valuation."],
  ["What could go wrong", 45, "We have thought about the risks and have answers.",
    ["Detection is rules and can miss things. So we publish a benchmark, a person decides at Send, and sector packs are built with advisers.",
      `Traction is early. So we start with pilots, and the base case alone breaks even in month ${F.breakeven_base}.`,
      "I am one founder. The opening hires are named and gated on milestones.",
      "Phone makers move slowly. So phone revenue counts from a signed, paid pilot.",
      "And an organisation-wide check could be seen as surveillance. So it is opt-in, on the device, with no decryption, no message text kept, and people see every hold."],
    "No new figures."],
  ["The ask", 50, "About US$770k buys a company-grade control in 14 months.",
    [`We are raising ${R["Pre-seed"].amount}, which is S$1.0M, in two tranches: ${A.tranche_close} at close and ${A.tranche_m7} when the month-7 milestones are met.`,
      "It buys 14 months to build a company-grade control: central policy, single sign-on, audit export, a company switch that stores no message text, managed rollout proven on Google Workspace and Intune, and a published detection benchmark with a penetration test.",
      `What you will see: 3 design partners signed by month 6, ${Y("1").arr} of ARR and a team of ${Y("1").head} by month 12, and the seed round ready.`],
    "Pre-seed priced at the ask: S$3.0M pre-money (about US$2.3M). Terms open."],
  ["Close", 20, "A clear, calm close and the contact.",
    ["We stop the leak at the Send button today, and the plan takes that check to sectors, phones and whole organisations. I would love to have you with us. Thank you. I am happy to take questions."],
    "Leave the contact slide up during questions."],
];

const qa = [
  ["You have no revenue. Why invest now?",
    "Because the product is live and the timing is now. People already use AI at work, and the controls are behind. This round turns a working product into a company control, with milestones you can check at month 6 and month 12. And the second tranche is tied to those milestones."],
  ["Won't OpenAI, Google or Microsoft build this in?",
    "They may add controls inside their own tools. Companies use several AI tools at once, and they want one control across all of them, on their devices, that they own. That is our position. If a provider adds checks, our audit trail and policy across tools still matter."],
  ["How good is the detection?",
    "It is rules with validators, so it is precise on structured data such as IDs, card numbers and keys, and weaker on free text. It can miss things and flag harmless text, which is why a person decides. Part of this round is a published benchmark, so you and buyers can check us."],
  ["There are other Chrome extensions doing this. What is different?",
    "Yes, several check prompts at Send. We compete on what a company needs above the check: central policy, the audit log, rollout, Android, sector packs and later phones and organisation-wide deployment. We do not claim to be alone."],
  ["Why would a phone maker or carrier license this?",
    "Privacy is a selling point, and business device programmes need a control they can show. It is a small per-device fee for a visible benefit. We count no revenue until a paid pilot is signed in year 3."],
  ["Isn't an organisation-wide firewall surveillance?",
    "It is designed not to be. It is opt-in by the organisation, it runs on the device, there is no decryption and nothing in the middle, it acts on messages to AI tools, people see every hold, and for this product no message text is stored."],
  ["What do you store today?",
    "Free Chrome checks run on the device and send nothing. For signed-in use, scan history keeps a short excerpt with sensitive values replaced by labels. A setting that stores no message text exists in code; making it a company switch is part of this round."],
  ["How did you get the valuation?",
    `The pre-seed is priced at the ask, S$3.0M pre-money, about US$2.3M, above cross-checks of ${R["Pre-seed"].pre}. Later rounds are estimates: forward 12-month ARR times ${A.mult_lo} to ${A.mult_hi}. They are a method, not a quote, and we expect the market to set them.`],
  ["What will you spend the money on?",
    "Mostly people: detection, Android and platform engineers, a partnerships lead and customer success. Then the security work buyers ask for: single sign-on, audit export, managed rollout, a penetration test and the benchmark."],
  ["You are one founder. What if something happens to you?",
    "That is a fair risk. The opening hires are named, the code and the model are documented, and hiring starts with the pre-seed. By month 12 the plan has a team of " + Y("1").head + "."],
  ["What if growth is half the plan?",
    `The base case beside the plan has no new engines and still reaches ${B("5").arr} of ARR and break-even in month ${F.breakeven_base}. Hiring is gated on milestones, so costs follow results.`],
  ["Why do you assume US$7 per seat when the price is US$9?",
    "To allow for annual and volume discounts. It keeps the plan honest. We assume no price rises."],
  ["Why is the Series B smaller than the Series A?",
    "Because by then phone software and the gateway start to pay. The model sizes each round to keep at least " + A.buffer + " months of costs in the bank. A larger growth round is a choice we can make at the time."],
  ["What is the exit?",
    "Two paths. A strategic buyer among the security platforms, which buy companies that own a control point. Or the IPO-ready track from year 6, if growth holds. We do not plan a listing inside five years."],
  ["Why should we believe you can sell to companies?",
    "Because I have been the person who has to protect information at work for most of my career, and because the outreach is starting now with a free pilot. You will see the design partners by month 6."],
];

// ---------------------------------------------------------------------------------------------- document
const P = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: [new TextRun({ text, ...(o.run || {}) })] });
const label = (l, text) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: l + " ", bold: true }), new TextRun(text)] });
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const total = slides.reduce((a, s) => a + s[1], 0);
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFC8D2" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (text, w, head) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders,
  shading: head ? { type: ShadingType.CLEAR, fill: "DDEFF5", color: "auto" } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({ children: [new TextRun({ text, bold: !!head, size: 20 })] })] });
const cols = [700, 6000, 1300, 1026];

const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("EraseAI investor presentation: speaking script")] }),
  P(`For presenting in person with EraseAI_Investor_Deck_2026.pptx. About ${Math.round(total / 60)} minutes for the 20 slides, then questions. Speak slowly; each slide has one point to land. Every figure comes from the model (docs/pitch/EraseAI_5yr_plan_model.xlsx, Plan sheets) or a cited source.`),
  P("Three rules on the day: say \"plan\" or \"estimate\" with every projection and valuation; never quote user, download or customer numbers; if you do not know, say so and offer to follow up."),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Running order")] }),
  new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: cols, rows: [
    new TableRow({ tableHeader: true, children: [cell("Slide", cols[0], true), cell("Title", cols[1], true), cell("Time", cols[2], true), cell("Clock", cols[3], true)] }),
    ...(() => { let t = 0; return slides.map((s, i) => { t += s[1]; return new TableRow({ children: [cell(String(i + 1), cols[0]), cell(s[0], cols[1]), cell(mmss(s[1]), cols[2]), cell(mmss(t), cols[3])] }); }); })(),
  ] }),
];
slides.forEach((s, i) => {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: i === 0, children: [new TextRun(`Slide ${i + 1}. ${s[0]} (${mmss(s[1])})`)] }));
  children.push(label("Point to land:", s[2]));
  s[3].forEach((t) => children.push(new Paragraph({ numbering: { reference: "say", level: 0 }, spacing: { after: 100 }, children: [new TextRun(t)] })));
  children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Figures: ", bold: true, size: 18, color: "5B6B80" }), new TextRun({ text: s[4], size: 18, color: "5B6B80" })] }));
});
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Appendix: investor questions and honest answers")] }));
qa.forEach((q, i) => {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`${i + 1}. ${q[0]}`)] }));
  children.push(P(q[1]));
});
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Sources")] }));
for (const id of Object.keys(F.sources).filter((k) => F.sources[k].deck_figure)) {
  const s = F.sources[id];
  children.push(new Paragraph({ numbering: { reference: "src", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: `${s.claim} ${s.short}, ${s.year}. ${s.url} (checked ${s.checked}).`, size: 18 })] }));
}

const doc = new Document({
  creator: "Vantward Solutions Pte. Ltd.", title: "EraseAI investor speaking script 2026",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: "Arial", size: 40, bold: true, color: "0B4F63" }, paragraph: { spacing: { before: 0, after: 240 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 28, bold: true, color: "0B4F63" }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 23, bold: true }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "say", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] },
    { reference: "src", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "EraseAI speaking script  ·  page ", size: 16, color: "8A96A3" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A96A3" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("wrote", OUT, "total", mmss(total)); });
