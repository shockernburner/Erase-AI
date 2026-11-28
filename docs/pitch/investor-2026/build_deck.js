// Builds docs/pitch/EraseAI_Investor_Deck_2026.pptx from facts.json (run facts.py first).
// Every number on a slide comes from facts.json; check_numbers.py enforces it.
// Run: NODE_PATH=<dir with pptxgenjs> node build_deck.js
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

const HERE = __dirname;
const F = JSON.parse(fs.readFileSync(path.join(HERE, "facts.json"), "utf8"));
const OUT = path.join(HERE, "..", "EraseAI_Investor_Deck_2026.pptx");
const LOCKUP = path.join(HERE, "..", "deck", "lockup.png");
const SHIELD = path.join(HERE, "..", "..", "..", "marketing-assets", "youtube", "dot", "build", "logo-shield.png");

const K = { bg: "070A13", card: "0B111E", line: "1E2B3D", fg: "F8FAFC", body: "DBE4EE", mu: "94A3B8", dim: "5B6B80",
  cyan: "0DCCF2", cyan2: "3DE0FF", amber: "F5B544", green: "34D399", violet: "A78BFA", rose: "F472B6" };
const FONT = "Arial";
const W = 13.333, M = 0.6;

function S(id) {
  const s = F.sources[id];
  if (!s) throw new Error("missing source " + id + " in sources.json");
  return s;
}
const cite = (...ids) => "Sources: " + ids.map((i) => `${S(i).short}, ${S(i).year}`).join("; ") + ".";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Vantward Solutions Pte. Ltd.";
pres.company = "Vantward Solutions Pte. Ltd.";
pres.title = "EraseAI investor presentation 2026";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

pres.defineSlideMaster({
  title: "COVER",
  background: { color: K.bg },
  objects: [],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: K.bg },
  margin: [0.5, M, 0.6, M],
  objects: [
    { image: { path: SHIELD, x: W - M - 0.26, y: 0.42, w: 0.26, h: 0.305 } },
    { text: { text: "EraseAI  ·  Vantward Solutions Pte. Ltd.", options: { x: M, y: 7.0, w: 6, h: 0.3, fontFace: FONT, fontSize: 10, color: K.dim, margin: 0 } } },
    { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.42, w: 10, h: 0.32, fontFace: FONT, fontSize: 12, bold: true, color: K.cyan, charSpacing: 2, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.82, w: W - 2 * M, h: 1.0, fontFace: FONT, fontSize: 30, bold: true, color: K.fg, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: W - M - 0.6, y: 7.0, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: K.dim, align: "right" },
});

let n = 0;
function content(kicker, title, notes) {
  const s = pres.addSlide({ masterName: "CONTENT" });
  s.addText(kicker.toUpperCase(), { placeholder: "kicker" });
  s.addText(title, { placeholder: "title" });
  if (notes) s.addNotes(notes);
  n++;
  return s;
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill || K.card }, line: { color: K.line, width: 1 } });
}
function txt(s, text, o) {
  s.addText(text, Object.assign({ isTextBox: true, fontFace: FONT, fontSize: 15, color: K.body, margin: 0, valign: "top" }, o));
}
function note(s, text, y) {
  txt(s, text, { x: M, y: y || 6.35, w: W - 2 * M, h: 0.5, fontSize: 11, color: K.mu });
}
function cardBlock(s, x, y, w, h, head, body, headColor, bodySize) {
  card(s, x, y, w, h);
  txt(s, head, { x: x + 0.3, y: y + 0.28, w: w - 0.6, h: 0.45, fontSize: 18, bold: true, color: headColor || K.cyan2 });
  txt(s, body, { x: x + 0.3, y: y + 0.8, w: w - 0.6, h: h - 1.0, fontSize: bodySize || 14 });
}
function bullets(s, items, o) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1 } })),
    Object.assign({ isTextBox: true, fontFace: FONT, fontSize: 16, color: K.body, paraSpaceAfter: 10, margin: 0, valign: "top" }, o));
}
function stat(s, x, y, w, big, label, color) {
  txt(s, big, { x, y, w, h: 0.95, fontSize: 48, bold: true, color: color || K.cyan });
  txt(s, label, { x, y: y + 1.0, w, h: 1.1, fontSize: 15, color: K.body });
}
const yrs = ["1", "2", "3", "4", "5"];
const Y = (y) => F.years[y];
const A = F.assumptions;

// 1 Cover --------------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addImage({ path: LOCKUP, x: M, y: 0.7, w: 2.9, h: 1.0875 });
  txt(s, "INVESTOR PRESENTATION  ·  2026", { x: M, y: 2.35, w: 10, h: 0.35, fontSize: 13, bold: true, color: K.cyan, charSpacing: 2 });
  txt(s, "Stop the leak at the Send button", { x: M, y: 2.8, w: 11.5, h: 1.2, fontSize: 48, bold: true, color: K.fg });
  txt(s, "EraseAI Firewall checks what people are about to send to ChatGPT, Claude or Gemini, on the device by default, with no proxy in the middle. Over five years we take that check from the browser to whole sectors, to phones, and to organisations and carriers that switch it on for every device they manage.",
    { x: M, y: 4.15, w: 10.8, h: 1.4, fontSize: 18, color: K.mu });
  txt(s, "Vantward Solutions Pte. Ltd.  ·  Singapore  ·  eraseai.ai", { x: M, y: 6.7, w: 8, h: 0.3, fontSize: 11, color: K.dim });
  s.addNotes("Title. Introduce yourself and the one line: we stop the leak at the Send button.");
}

// 2 Problem -------------------------------------------------------------------
{
  const s = content("The problem", "Work happens in AI chats. The leak takes one keystroke");
  const cards = [
    ["A client list", "Pasted in “just to summarise” before a meeting."],
    ["A patient letter", "Pasted in to fix the tone, names and dates included."],
    ["A payroll sheet", "Pasted in to find one error, with every salary and ID in it."],
  ];
  cards.forEach((c, i) => cardBlock(s, M + i * 4.1, 2.15, 3.85, 1.9, c[0], c[1], K.fg, 15));
  txt(s, "Nobody is careless. They are fast, and the chat box accepts anything. Once it is sent, it cannot be taken back.",
    { x: M, y: 4.35, w: 7.2, h: 1.2, fontSize: 18, color: K.body });
  const p = S("harmonic_2025_sensitive_prompts");
  stat(s, 8.5, 4.2, 4.2, p.deck_figure, p.deck_label, K.amber);
  note(s, cite("harmonic_2025_sensitive_prompts"));
}

// 3 Why now ------------------------------------------------------------------
{
  const s = content("Why now", "AI use is everywhere. The controls have not caught up");
  const ids = ["microsoft_wti_2024_ai_use", "ibm_2025_shadow_ai", "ibm_2026_breach_cost_global"];
  ids.forEach((id, i) => {
    const x = M + i * 4.1;
    card(s, x, 2.15, 3.85, 2.75);
    stat(s, x + 0.3, 2.45, 3.3, S(id).deck_figure, S(id).deck_label, i === 1 ? K.amber : K.cyan);
  });
  txt(s, "People reach for AI tools whether or not the company has rules for them. The control has to sit where the person is: at Send.", { x: M, y: 5.25, w: W - 2 * M, h: 0.6, fontSize: 16 });
  note(s, cite(...ids), 6.15);
}

// 4 How it works -------------------------------------------------------------
{
  const s = content("The product", "An outgoing firewall at the Send button");
  const steps = [
    ["1  Check", "Every message, on the device by default, before it goes. On paid plans, attached files too: PDF, Word, Excel, slides and screenshots are read in the browser."],
    ["2  Hold", "If it finds personal data, national ID numbers, card numbers, passwords or keys, it stops and shows what it found and where."],
    ["3  The person decides", "Cancel or Send Anyway. On paid plans, Sanitize & Send swaps the sensitive values for labels, or downloads a clean copy of the file."],
  ];
  steps.forEach((c, i) => cardBlock(s, M + i * 4.1, 2.15, 3.85, 3.0, c[0], c[1], K.cyan2, 15));
  txt(s, [
    { text: "No proxy: ", options: { bold: true, color: K.fg } },
    { text: "nothing sits between people and the AI.   ", options: {} },
    { text: "Rules, not guesswork: ", options: { bold: true, color: K.fg } },
    { text: "patterns plus validators such as the card-number checksum. It can miss things and flag harmless text, which is why a person always has the last word.", options: {} },
  ], { x: M, y: 5.45, w: W - 2 * M, h: 0.9, fontSize: 15 });
}

// 5 Live today ---------------------------------------------------------------
{
  const s = content("What is live today", "Four surfaces, one decision record");
  const cards = [
    ["Chrome extension", "ChatGPT, Claude, Gemini and Replit. Free checks run on the device. Paid plans read attachments in the browser and offer a clean copy."],
    ["Android app", "A send gate inside the AI apps the person chooses, plus EraseAI Safe files and a dataset sanitizer."],
    ["Teams dashboard", "Invite people and see an audit log of decisions (level, action, category), never the text anyone typed."],
    ["Developer API", "Scan the text going into and out of your own AI application. Keys, request logs and webhooks."],
  ];
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    cardBlock(s, M + col * 6.13, 2.1 + row * 2.0, 5.95, 1.8, c[0], c[1], K.cyan2, 14);
  });
  note(s, "Singapore NRIC/FIN and +65 phone checks shipped in version 1.6.3 (Chrome Web Store review pending at the time of writing). Managed rollout through Chrome policy is built; its live deployment is a pre-seed milestone.", 6.2);
}

// 6 Where we are -------------------------------------------------------------
{
  const s = content("Where we are, honestly", "Early. Live. Pre-revenue");
  card(s, M, 2.1, 5.6, 3.9);
  txt(s, "Today", { x: M + 0.3, y: 2.35, w: 5, h: 0.4, fontSize: 18, bold: true, color: K.cyan2 });
  bullets(s, ["Live on Chrome and Android since October 2026.", "Just launched. No paying customers yet.", "One founder, writing the code.",
    "Founder-led outreach to Singapore firms (accounting, HR and recruitment, clinics) from December 2026, each offered a free 30-day pilot for up to 10 people."],
  { x: M + 0.3, y: 2.9, w: 5.0, h: 3.0, fontSize: 15 });
  txt(s, "What the early weeks taught us", { x: 6.8, y: 2.35, w: 5.9, h: 0.4, fontSize: 18, bold: true, color: K.fg });
  bullets(s, ["A browser check on its own is not a company control. Companies need central policy, an audit trail and a way to roll it out.",
    "So the plan adds those, then sector checks, then phones, then organisation-wide deployment.",
    "We will not quote numbers we cannot prove. Every figure in this deck is a plan or a cited source."],
  { x: 6.8, y: 2.9, w: 5.9, h: 3.2, fontSize: 15 });
}

// 7 Founder ------------------------------------------------------------------
{
  const s = content("Why me", "17 years in security, then I caught myself making the mistake");
  bullets(s, ["Air Force: physical, national and cyber security. Then an aerospace engineer, where protecting sensitive information was the core of the job.",
    "Then I started a software company and wrote the code by hand.",
    "I watched people on teams paste company information into public AI tools. One morning, as a father, I realised I had done the same with information about my own child.",
    "Solo today. The plan names the opening hires: a detection engineer, an Android engineer, a platform engineer and a partnerships lead."],
  { x: M, y: 2.15, w: 8.2, h: 4.2, fontSize: 17, paraSpaceAfter: 14 });
  card(s, 9.2, 2.15, 3.53, 3.9);
  s.addImage({ path: SHIELD, x: 10.38, y: 2.55, w: 1.18, h: 1.385 });
  txt(s, "Built by hand, tested in public, honest about limits.", { x: 9.45, y: 4.3, w: 3.05, h: 1.4, fontSize: 15, color: K.mu, align: "center" });
}

// 8 Business model and prices ----------------------------------------------
{
  const s = content("Business model", "Live prices today, three new lines in the plan");
  const tiers = [
    ["Free", "US$0", "Chrome checks on the device, no account, no limit."],
    ["Personal", `${F.prices.personal}/month`, `or ${F.prices.personal_year}/year. Sanitize & Send, attachments, clean copies, Android.`],
    ["Pro", `${F.prices.pro}/month`, "Personal plus the Developer API, webhooks and request logs."],
    ["Teams", `${F.prices.teams}/person`, `per month (${F.prices.teams_annual} on annual), 3 to 10 people, admin dashboard.`],
    ["Enterprise", "On request", "Sales-led: central policy, rollout, invoice."],
  ];
  const w = 2.3, g = 0.13;
  tiers.forEach((t, i) => {
    const x = M + i * (w + g);
    card(s, x, 2.1, w, 2.55);
    txt(s, t[0], { x: x + 0.2, y: 2.28, w: w - 0.4, h: 0.35, fontSize: 14, bold: true, color: K.mu });
    txt(s, t[1], { x: x + 0.2, y: 2.65, w: w - 0.4, h: 0.5, fontSize: 21, bold: true, color: K.cyan });
    txt(s, t[2], { x: x + 0.2, y: 3.25, w: w - 0.4, h: 1.35, fontSize: 12.5 });
  });
  txt(s, "Priced in the plan (assumptions, not live prices)", { x: M, y: 4.95, w: 8, h: 0.35, fontSize: 15, bold: true, color: K.fg });
  const lines = [
    ["Sector packs", `${A.sector_price} per seat per month, on top of the seat`],
    ["Phone software", `${A.rom_fee} per device per year, paid by the phone maker or carrier`],
    ["Gateway", `annual contracts of ${A.gw_y4_p} to ${A.gw_y5_p}`],
  ];
  lines.forEach((l, i) => {
    const x = M + i * 4.1;
    txt(s, [{ text: l[0] + ": ", options: { bold: true, color: K.cyan2 } }, { text: l[1], options: {} }], { x, y: 5.4, w: 3.85, h: 0.8, fontSize: 14 });
  });
  note(s, `The plan assumes ${F.prices.realised} per seat per month realised on business seats, after annual and volume discounts. No change to live prices is assumed.`, 6.4);
}

// 9 Market -------------------------------------------------------------------
{
  const s = content("Market", "A security budget that already exists, and billions of devices");
  const ids = ["dlp_market_grandview", "idc_2025_smartphone_shipments", "ibm_2025_breach_cost_healthcare"];
  ids.forEach((id, i) => {
    const x = M + i * 4.1;
    card(s, x, 2.15, 3.85, 2.75);
    stat(s, x + 0.3, 2.45, 3.3, S(id).deck_figure, S(id).deck_label, i === 1 ? K.violet : K.cyan);
  });
  txt(s, `Our year-5 plan needs ${A.rom_y5} phones a year with the check built in, and business seats in firms that already pay for data-loss controls.`, { x: M, y: 5.25, w: W - 2 * M, h: 0.6, fontSize: 16 });
  note(s, cite(...ids) + " Market sizes are third-party estimates.", 6.15);
}

// 10 Competition -------------------------------------------------------------
{
  const s = content("Competition and position", "Crowded in the browser, open at company and device scale");
  const cols = [
    ["Browser extensions", "Several tools on the Chrome Web Store also check prompts before they are sent (for example Prompt Seal, SafePaste and Caviard). Good for one person; rarely a company control."],
    ["Security platforms", "Large security suites inspect traffic or files. Strong for big IT teams, but they sit in the middle of traffic and are heavy for a firm of 10 to 200 people."],
    ["EraseAI", "The check at Send, plus what a company needs (policy, audit log, rollout), then sector packs, phone software and organisation-wide deployment, with no proxy in the middle."],
  ];
  cols.forEach((c, i) => cardBlock(s, M + i * 4.1, 2.15, 3.85, 3.4, c[0], c[1], i === 2 ? K.cyan : K.fg, 14.5));
  note(s, "Other tools also check at Send. We do not claim to be alone; we compete on company controls, sector depth, phones and honesty about limits.", 5.95);
}

// 11 Engine 1: sector packs --------------------------------------------------
{
  const s = content("Growth engine 1", "Sector packs: a hospital gets checks a bank does not");
  const rows = [
    ["Healthcare", "Patient and record numbers, diagnosis and procedure codes, prescription details", "Year 2"],
    ["Finance", "Bank account and IBAN/SWIFT numbers, card data with checksum, client portfolio terms", "Year 2"],
    ["Legal", "Case and matter numbers, privileged and confidential markings", "Year 3"],
    ["HR and education", "Salary and payroll lines, performance notes, student records", "Year 3"],
    ["Public sector", "Classification markings, case file IDs, national ID formats", "Year 3"],
  ];
  const head = { bold: true, color: K.cyan, fontSize: 13, fill: { color: K.card } };
  const cell = { color: K.body, fontSize: 13 };
  s.addTable([[{ text: "Pack", options: head }, { text: "Example checks (planned)", options: head }, { text: "From", options: head }],
    ...rows.map((r) => [{ text: r[0], options: Object.assign({}, cell, { bold: true, color: K.fg }) }, { text: r[1], options: cell }, { text: r[2], options: cell }])],
  { x: M, y: 2.1, w: 8.3, colW: [1.9, 5.4, 1.0], fontFace: FONT, border: { type: "solid", color: K.line, pt: 0.75 }, rowH: 0.52, margin: 0.08 });
  card(s, 9.2, 2.1, 3.53, 3.75);
  txt(s, A.sector_price, { x: 9.5, y: 2.35, w: 3, h: 0.7, fontSize: 36, bold: true, color: K.cyan });
  txt(s, "per seat per month, added to the seat", { x: 9.5, y: 3.05, w: 3, h: 0.5, fontSize: 13 });
  txt(s, `${A.sector_attach_y2} of seats in year 2, ${A.sector_attach_y5} by year 5`, { x: 9.5, y: 3.6, w: 3, h: 0.6, fontSize: 13 });
  txt(s, Y("5").lines.sector, { x: 9.5, y: 4.3, w: 3, h: 0.6, fontSize: 28, bold: true, color: K.fg });
  txt(s, "ARR at the end of year 5", { x: 9.5, y: 4.95, w: 3, h: 0.4, fontSize: 13 });
  note(s, "Packs are rules and validators written with sector advisers, sold to regulated firms that need evidence of control. They are planned, not built.", 6.15);
}

// 12 Engine 2: phone software -------------------------------------------------
{
  const s = content("Growth engine 2", "The check, built into the phone");
  bullets(s, ["Phone makers and carriers preload the send-point check in device software, starting with business phones.",
    "Why they would pay: privacy is a selling point, and business device programmes need a control they can show.",
    `Priced at ${A.rom_fee} per device per year. A paid pilot of ${A.rom_y3} devices in year 3, ${A.rom_y4} in year 4, ${A.rom_y5} in year 5.`,
    "Gated: the Android send gate proven at scale, a policy review, and a signed pilot before any revenue counts."],
  { x: M, y: 2.15, w: 6.6, h: 4.0, fontSize: 16, paraSpaceAfter: 12 });
  s.addChart(pres.charts.BAR, [{ name: "Phone software ARR", labels: ["Year 3", "Year 4", "Year 5"],
    values: [Y("3").lines_raw.rom, Y("4").lines_raw.rom, Y("5").lines_raw.rom] }], {
    x: 7.6, y: 2.1, w: 5.13, h: 3.9, barDir: "col", chartColors: [K.violet], showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: "$#,##0.0,,\"M\"", dataLabelColor: K.fg, dataLabelFontSize: 13, dataLabelFontFace: FONT,
    showTitle: true, title: "Phone software ARR (US$)", titleColor: K.mu, titleFontSize: 13, titleFontFace: FONT,
    catAxisLabelColor: K.mu, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12, valAxisHidden: true,
    valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisLineShow: false, showLegend: false,
  });
  note(s, `${A.rom_y5} devices at ${A.rom_fee} each is ${Y("5").lines.rom} a year. Not built today; Android work needs a policy review before release.`, 6.25);
}

// 13 Engine 3: gateway -------------------------------------------------------
{
  const s = content("Growth engine 3", "One check, switched on for every managed device");
  const boxes = [
    ["Organisation, sector body or carrier", "Opts in, and sets the rules."],
    ["Device management", "Pushes the same on-device check to the phones and laptops it already manages."],
    ["Each device, at Send", "Checks and holds. The person sees why and decides."],
    ["Decision records", "What was caught and what was done. Designed to keep no message text."],
  ];
  boxes.forEach((b, i) => {
    const x = M + i * 3.08;
    card(s, x, 2.15, 2.8, 2.3);
    txt(s, b[0], { x: x + 0.2, y: 2.35, w: 2.4, h: 0.7, fontSize: 15, bold: true, color: K.cyan2 });
    txt(s, b[1], { x: x + 0.2, y: 3.1, w: 2.4, h: 1.25, fontSize: 13 });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.84, y: 3.15, w: 0.2, h: 0.3, fill: { color: K.cyan }, line: { color: K.cyan } });
  });
  txt(s, "What it is not", { x: M, y: 4.75, w: 5.5, h: 0.4, fontSize: 16, bold: true, color: K.fg });
  bullets(s, ["Not a proxy: no traffic decryption, nothing in the middle.", "Not monitoring: it acts on messages to AI tools, and people see every hold.",
    "Strict no-storage setting for message text, required for this product."], { x: M, y: 5.2, w: 6.6, h: 1.4, fontSize: 14, paraSpaceAfter: 4 });
  txt(s, `${A.gw_y4_n} contracts at ${A.gw_y4_p} in year 4, ${A.gw_y5_n} at ${A.gw_y5_p} in year 5`, { x: 7.6, y: 4.8, w: 5.13, h: 0.7, fontSize: 15, color: K.body });
  txt(s, `${Y("5").lines.gateway} ARR by year 5`, { x: 7.6, y: 5.5, w: 5.13, h: 0.6, fontSize: 26, bold: true, color: K.cyan });
}

// 14 Five-year plan ----------------------------------------------------------
{
  const s = content("The plan", "Five years, stated as a plan, not a forecast");
  const head = { bold: true, color: K.cyan, fontSize: 13, align: "right" };
  const lab = { color: K.mu, fontSize: 13, align: "left" };
  const v = { color: K.body, fontSize: 13, align: "right" };
  const vb = { color: K.fg, fontSize: 13, align: "right", bold: true };
  const row = (label, vals, o) => [{ text: label, options: lab }, ...vals.map((x) => ({ text: x, options: o || v }))];
  const rows = [
    [{ text: "US$", options: Object.assign({}, head, { align: "left" }) }, ...yrs.map((y) => ({ text: "Year " + y, options: head }))],
    row("Year-end ARR, plan", yrs.map((y) => Y(y).arr), vb),
    row("Year-end ARR, base case", yrs.map((y) => F.base[y].arr)),
    row("Revenue in the year, plan", yrs.map((y) => Y(y).revenue)),
    row("People at year end, plan", yrs.map((y) => Y(y).head)),
    row("People at year end, base case", yrs.map((y) => F.base[y].head)),
    row("Net burn, plan", yrs.map((y) => Y(y).burn)),
    row("Raised in the year, plan", yrs.map((y) => Y(y).funding)),
    row("Cash at year end, plan", yrs.map((y) => Y(y).cash)),
  ];
  s.addTable(rows, { x: M, y: 2.05, w: W - 2 * M, colW: [2.63, 1.9, 1.9, 1.9, 1.9, 1.9], fontFace: FONT, rowH: 0.4,
    border: { type: "solid", color: K.line, pt: 0.75 }, margin: [0.04, 0.1, 0.04, 0.1] });
  note(s, `Base case: the existing model (core seats and Personal), same prices and costs. Plan: the same with the account curve at ${A.core_mult} times and the three new engines. Operating break-even in month ${F.breakeven_plan} (plan) and month ${F.breakeven_base} (base). Negative burn means cash generated. Every figure is an assumption we intend to test.`, 5.85);
}

// 15 Revenue mix -------------------------------------------------------------
{
  const s = content("Revenue mix", `From seats to a portfolio: ${Y("5").arr} ARR in year 5`);
  const L = (k) => yrs.map((y) => Y(y).lines_raw[k]);
  const pa = yrs.map((y) => Y(y).lines_raw.personal + Y(y).lines_raw.api);
  s.addChart(pres.charts.BAR, [
    { name: "Business seats", labels: yrs.map((y) => "Year " + y), values: L("core") },
    { name: "Sector packs", labels: yrs.map((y) => "Year " + y), values: L("sector") },
    { name: "Phone software", labels: yrs.map((y) => "Year " + y), values: L("rom") },
    { name: "Gateway", labels: yrs.map((y) => "Year " + y), values: L("gateway") },
    { name: "Personal and API", labels: yrs.map((y) => "Year " + y), values: pa },
  ], {
    x: M, y: 2.0, w: 8.2, h: 4.6, barDir: "col", barGrouping: "stacked", chartColors: [K.cyan, K.green, K.violet, K.amber, K.mu],
    showLegend: true, legendPos: "b", legendColor: K.body, legendFontFace: FONT, legendFontSize: 12,
    catAxisLabelColor: K.mu, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12,
    valAxisLabelColor: K.mu, valAxisLabelFontFace: FONT, valAxisLabelFontSize: 11, valAxisLabelFormatCode: "$#,##0,,\"M\"",
    valGridLine: { color: "1E2B3D", size: 0.5 }, catGridLine: { style: "none" },
  });
  const y5 = Y("5").lines;
  const items = [["Business seats", y5.core, K.cyan], ["Sector packs", y5.sector, K.green], ["Phone software", y5.rom, K.violet], ["Gateway", y5.gateway, K.amber]];
  txt(s, "Year 5 ARR by line", { x: 9.2, y: 2.1, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: K.fg });
  items.forEach((it, i) => {
    txt(s, it[1], { x: 9.2, y: 2.6 + i * 0.8, w: 1.6, h: 0.5, fontSize: 22, bold: true, color: it[2] });
    txt(s, it[0], { x: 10.85, y: 2.72 + i * 0.8, w: 1.9, h: 0.4, fontSize: 13 });
  });
  txt(s, `New engines are ${F.y5_share_new} of year-5 ARR; business seats are ${F.y5_share_core}. The plan is ${F.plan_vs_base_y5} the base case.`, { x: 9.2, y: 5.85, w: 3.53, h: 0.8, fontSize: 12.5, color: K.mu });
}

// 16 Team --------------------------------------------------------------------
{
  const s = content("Team and hiring", `From one founder to ${Y("5").head} people, hired against milestones`);
  s.addChart(pres.charts.BAR, [
    { name: "Plan", labels: yrs.map((y) => "Year " + y), values: yrs.map((y) => Y(y).head_raw) },
    { name: "Base case", labels: yrs.map((y) => "Year " + y), values: yrs.map((y) => F.base[y].head_raw) },
  ], {
    x: M, y: 2.0, w: 5.6, h: 4.4, barDir: "col", chartColors: [K.cyan, K.dim], showValue: true, dataLabelPosition: "outEnd",
    dataLabelColor: K.body, dataLabelFontSize: 11, dataLabelFontFace: FONT, showLegend: true, legendPos: "b", legendColor: K.body,
    legendFontFace: FONT, legendFontSize: 12, catAxisLabelColor: K.mu, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12,
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
  });
  const stages = [
    ["Pre-seed", "Detection, Android and platform engineers; partnerships lead; customer success; security and compliance; part-time finance."],
    ["Seed", "Sector detection engineers, sales and partner managers, customer success, marketing."],
    ["Series A", "Phone-maker integration and gateway engineers, compliance counsel, solutions architects, product and design, a CFO."],
    ["Series B", "Regional sales and partner teams, more gateway and sector engineers, finance and operations."],
  ];
  stages.forEach((st, i) => {
    txt(s, st[0], { x: 6.6, y: 2.05 + i * 1.1, w: 1.5, h: 0.4, fontSize: 15, bold: true, color: K.cyan2 });
    txt(s, st[1], { x: 8.15, y: 2.05 + i * 1.1, w: 4.58, h: 1.0, fontSize: 13 });
  });
  note(s, "Each hire starts when the milestone before it is met, not before. The Hiring and PlanAssumptions sheets list every role, start month and salary.", 6.5);
}

// 17 Rounds and IPO track -----------------------------------------------------
{
  const s = content("Funding path", "Four rounds over five years, then an IPO-ready track");
  const head = { bold: true, color: K.cyan, fontSize: 12.5 };
  const c = { color: K.body, fontSize: 12.5 };
  const rows = [[{ text: "Round", options: head }, { text: "Month", options: head }, { text: "Amount", options: head },
    { text: "Pre-money (estimate)", options: head }, { text: "Founder after", options: head }],
  ...F.rounds.map((r) => [{ text: r.name, options: Object.assign({}, c, { bold: true, color: K.fg }) }, { text: r.month, options: c },
    { text: r.amount, options: c }, { text: r.pre, options: c }, { text: r.founder, options: c }])];
  s.addTable(rows, { x: M, y: 2.05, w: 7.7, colW: [1.4, 0.9, 1.65, 2.55, 1.2], fontFace: FONT, rowH: 0.42,
    border: { type: "solid", color: K.line, pt: 0.75 }, margin: [0.04, 0.08, 0.04, 0.08] });
  txt(s, `Each round is sized so cash stays above ${A.buffer} months of operating cost (${F.raised_total} in total). Pre-seed: cross-checks to the ask (S$1.0M at S$3.0M pre-money). Later rounds: forward 12-month ARR times ${A.mult_lo} to ${A.mult_hi}. These are estimates by method, not market quotes.`,
    { x: M, y: 4.35, w: 7.7, h: 1.2, fontSize: 12.5, color: K.mu });
  card(s, 8.6, 2.05, 4.13, 4.4);
  txt(s, "IPO-ready track, years 6 and 7", { x: 8.85, y: 2.25, w: 3.7, h: 0.4, fontSize: 15, bold: true, color: K.fg });
  txt(s, [{ text: `Year 6: ${F.ipo.y6} ARR.  Year 7: ${F.ipo.y7}.`, options: { breakLine: true, bold: true, color: K.cyan } },
    { text: "extrapolated, with growth slowing each year", options: {} }], { x: 8.85, y: 2.7, w: 3.7, h: 0.75, fontSize: 13 });
  bullets(s, ["Three years of audited accounts", "An independent board and audit committee", "SOC 2 Type II and ISO 27001", "Growth and a path to profit at the scale growth boards expect"],
    { x: 8.85, y: 3.55, w: 3.7, h: 2.0, fontSize: 12.5, paraSpaceAfter: 4 });
  txt(s, `A pre-IPO round could price at ${F.ipo.pre} (year-6 ARR times 6 to 10, illustrative). No listing is planned inside five years.`, { x: 8.85, y: 5.45, w: 3.7, h: 0.95, fontSize: 11, color: K.mu });
}

// 18 Risks -------------------------------------------------------------------
{
  const s = content("What could go wrong", "The honest list");
  const rows = [
    ["Detection is rules and can miss things.", "A published benchmark, a person decides at Send, and sector packs built with advisers."],
    ["Traction is early.", `Pilots before scale. The base case alone breaks even in month ${F.breakeven_base}; the engines are upside on top.`],
    ["One founder.", "Opening hires are named and hiring is gated on milestones."],
    ["Phone makers and carriers move slowly.", "Phone software counts from a signed, paid pilot in year 3, not before."],
    ["A gateway could be seen as surveillance.", "Opt-in, on the device, no decryption, no message text kept, people see every hold."],
    ["AI sites change their pages.", "Tests against real hosts and fast updates. A store once rejected a build for code readability; we fixed it and added a test."],
  ];
  const a = { color: K.fg, bold: true, fontSize: 13.5 }, b = { color: K.mu, fontSize: 13.5 };
  s.addTable(rows.map((r) => [{ text: r[0], options: a }, { text: r[1], options: b }]),
    { x: M, y: 2.05, w: W - 2 * M, colW: [4.6, 7.53], fontFace: FONT, rowH: 0.62, border: { type: "solid", color: K.line, pt: 0.75 }, margin: [0.06, 0.1, 0.06, 0.1] });
}

// 19 The ask -----------------------------------------------------------------
{
  const s = content("The ask", "About US$770k (S$1.0M) to build a company-grade control");
  card(s, M, 2.1, 6.4, 4.2);
  txt(s, "What it buys (14 months)", { x: M + 0.3, y: 2.3, w: 5.8, h: 0.4, fontSize: 17, bold: true, color: K.cyan2 });
  bullets(s, ["Central policy, single sign-on and SCIM, audit export and a SIEM hook", "A company switch that stores no message text",
    "Managed rollout proven on Google Workspace and Intune", "Singapore and Hong Kong identifiers extended (UEN, address formats)",
    "A published detection benchmark and a penetration test"], { x: M + 0.3, y: 2.8, w: 5.8, h: 3.4, fontSize: 14.5, paraSpaceAfter: 6 });
  card(s, 7.2, 2.1, 5.53, 4.2);
  txt(s, "What we will show you", { x: 7.5, y: 2.3, w: 5, h: 0.4, fontSize: 17, bold: true, color: K.fg });
  bullets(s, ["3 design partners signed by month 6", `${Y("1").arr} ARR by month 12 (plan)`, "The benchmark, published",
    `A team of ${Y("1").head} by month 12`, "The seed round prepared by month 12"], { x: 7.5, y: 2.8, w: 4.9, h: 3.4, fontSize: 14.5, paraSpaceAfter: 6 });
  note(s, `Two tranches: ${A.tranche_close} at close and ${A.tranche_m7} when the month-7 milestones are met (S$600k and S$400k). Terms open.`, 6.45);
}

// 20 Contact -----------------------------------------------------------------
{
  const s = pres.addSlide({ masterName: "COVER" }); n++;
  s.addImage({ path: LOCKUP, x: M, y: 0.7, w: 2.9, h: 1.0875 });
  txt(s, "LET US TALK", { x: M, y: 2.35, w: 10, h: 0.35, fontSize: 13, bold: true, color: K.cyan, charSpacing: 2 });
  txt(s, "Firdous Mahmood, founder", { x: M, y: 2.8, w: 11, h: 0.9, fontSize: 40, bold: true, color: K.fg });
  txt(s, ["director@vantward.com   ·   +65 8243 0739", "https://eraseai.ai", "Vantward Solutions Pte. Ltd.  ·  Reg. No. 202606980C", "68 Circular Road #02-01, Singapore 049422"]
    .map((t, i, arr) => ({ text: t, options: { breakLine: i < arr.length - 1 } })), { x: M, y: 4.0, w: 11, h: 2.2, fontSize: 20, color: K.body, paraSpaceAfter: 10 });
  txt(s, "Projections and valuations in this deck are estimates from stated assumptions, not forecasts or offers.", { x: M, y: 6.7, w: 11, h: 0.3, fontSize: 10, color: K.dim });
}

pres.writeFile({ fileName: OUT }).then((f) => console.log("wrote", f, n, "slides"));
