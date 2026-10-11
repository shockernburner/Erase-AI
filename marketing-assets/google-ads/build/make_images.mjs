// Builds every Google Ads image from the real UI: it opens the built site, grabs crisp
// stills of the plan animations (no sample data), then lays them out with the brand
// fonts/colours at each Google Ads size.
//
//   (build the site first)  node marketing-assets/google-ads/build/make_images.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const dist = path.join(repo, "artifacts/eraseai/dist/public");
const outDir = path.resolve(here, "../images");
const stillsDir = path.join(here, "stills");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(stillsDir, { recursive: true });

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = http
  .createServer((q, r) => {
    const u = q.url.split("?")[0];
    if (u.startsWith("/api/")) {
      r.statusCode = 401;
      r.setHeader("content-type", "application/json");
      return r.end("{}");
    }
    let f = path.join(dist, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, "index.html");
    r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
    r.end(fs.readFileSync(f));
  })
  .listen(0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });

// ---------- 1. stills of the real animations ----------
async function stills() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  const grab = async (plan, caption, file) => {
    await p.goto(`${base}/${plan === "personal" ? "personal" : plan === "pro" ? "developer" : "business"}`);
    const dlg = p.getByRole("dialog");
    await dlg.waitFor({ timeout: 15000 });
    await p.waitForFunction((c) => document.querySelector('[role="dialog"]')?.textContent?.includes(c), caption, { timeout: 20000 });
    await p.waitForTimeout(1600); // let the step finish animating
    await dlg.locator(":scope > div:nth-child(2)").screenshot({ path: path.join(stillsDir, file) });
  };
  await grab("personal", "stops it and shows what it found", "personal-stop.png");
  await grab("personal", "masks it in one click", "personal-sanitized.png");
  await grab("personal", "Files and screenshots are scanned", "personal-files.png");
  await grab("pro", "Send text, get back what it found", "pro-api.png");
  await grab("pro", "A webhook tells your app", "pro-webhook.png");
  await grab("business", "sees what was caught, by person", "teams-admin.png");
  await ctx.close();
}
if (!process.env.SKIP_STILLS) await stills();

// ---------- 2. layouts ----------
const logoSvg = fs.readFileSync(path.join(repo, "branding/logos/eraseai-icon.svg"), "utf8").replace("<svg", '<svg style="width:100%;height:100%"');
const CROP = { "personal-stop.png": 0.95, "personal-sanitized.png": 0.8, "personal-files.png": 0.8, "pro-api.png": 0.78 };
const dims = (f) => {
  const b = fs.readFileSync(path.join(stillsDir, f));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const uiImg = (f) => `<div class="box" style="padding-top:${((CROP[f] ?? 1) * 100 * dims(f).h) / dims(f).w}%"><img src="${img(f)}"></div>`;
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(stillsDir, f)).toString("base64")}`;

const CONCEPTS = [
  { id: "keep-your-data", h: "Use AI. <em>Keep your data.</em>", hs: "Use AI. Keep your data.", s: "Stops keys, passwords and personal data before they reach ChatGPT, Claude and Gemini.", short: "Stops secrets before ChatGPT sees them", still: "personal-stop.png" },
  { id: "stop-pasting-secrets", h: "Stop pasting secrets <em>into ChatGPT.</em>", hs: "Stop pasting secrets into ChatGPT.", s: "EraseAI checks every message before you press Send.", short: "Checks every message before Send", still: "personal-sanitized.png" },
  { id: "chrome-and-android", h: "Protect your AI chats <em>on Chrome and Android.</em>", hs: "Protect your AI chats on Chrome and Android.", s: "Free Chrome extension. Android app on Google Play.", short: "Free Chrome extension + Android app", still: "personal-files.png" },
  { id: "developer-api", h: "Check prompts <em>in your own app.</em>", hs: "Check prompts in your own app.", s: "The EraseAI API: keys, webhooks, JSON in and out.", short: "EraseAI API for developers", still: "pro-api.png" },
];

const SIZES = [
  // Performance Max / Demand Gen / Display responsive
  { w: 1200, h: 628, group: "responsive" },
  { w: 1200, h: 1200, group: "responsive" },
  { w: 960, h: 1200, group: "responsive" },
  { w: 1080, h: 1920, group: "responsive" },
  // Classic display sizes
  { w: 300, h: 250, group: "display" },
  { w: 336, h: 280, group: "display" },
  { w: 728, h: 90, group: "display" },
  { w: 300, h: 600, group: "display" },
  { w: 160, h: 600, group: "display" },
  { w: 320, h: 100, group: "display" },
  { w: 970, h: 250, group: "display" },
];

function page(c, { w, h }) {
  const r = w / h;
  const banner = h <= 130 || r > 3.2;
  const wide = !banner && r >= 1.45;
  const tall = !banner && !wide;
  const m = Math.min(w, h);
  // type scale per layout
  const bannerUi0 = h <= 130 || r > 3.2 ? (w >= 960 && h >= 200) : false;
  const hSize = banner ? (bannerUi0 ? h * 0.125 : Math.min(h * 0.3, w * 0.034)) : wide ? Math.min(h * 0.12, w * 0.058) : Math.min(w * 0.095, h * 0.075);
  const sSize = banner ? Math.min(h * 0.17, 15) : hSize * 0.46;
  const logo = banner ? h * 0.52 : m * 0.075 + 14;
  const pad = banner ? h * 0.18 : m * 0.06;
  const showSub = !banner || (w >= 728 && h >= 90 && false);
  const uiW = wide ? w * 0.44 : banner ? 0 : Math.min(w - pad * 2, h * 0.62);
  const showUi = !banner || (w >= 960 && h >= 200);
  const bannerUi = banner && w >= 960 && h >= 200 ? h * 0.72 * 2 : 0;
  const body = banner
    ? `<div class="row"><div class="logo">${logoSvg}</div><div class="t"><h1>${w >= 728 ? c.hs : c.short}</h1>${w >= 728 && h >= 200 ? `<p>${c.s}</p>` : ""}<div class="url">eraseai.ai</div></div>${bannerUi ? `<div class="ui" style="width:${bannerUi}px">${uiImg(c.still)}</div>` : ""}</div>`
    : wide
      ? `<div class="wide"><div class="t"><div class="logo">${logoSvg}</div><h1>${c.h}</h1><p>${c.s}</p><div class="url">eraseai.ai</div></div><div class="ui" style="width:${uiW}px">${uiImg(c.still)}</div></div>`
      : `<div class="tall"><div class="t"><div class="logo">${logoSvg}</div><h1>${c.h}</h1>${h >= 400 || w >= 600 ? `<p>${c.s}</p>` : ""}</div><div class="ui" style="width:${uiW}px">${uiImg(c.still)}</div><div class="url">eraseai.ai</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&family=DM+Sans:wght@500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:radial-gradient(ellipse at 78% 38%,rgba(13,204,242,.24),transparent 58%),radial-gradient(ellipse at 0% 100%,rgba(14,116,144,.25),transparent 55%),#060a14;color:#fff;font-family:'DM Sans',system-ui,sans-serif;padding:${pad}px;display:flex}
body:before{content:"";position:absolute;inset:0;opacity:.06;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:${Math.max(24, m / 18)}px ${Math.max(24, m / 18)}px;mask-image:radial-gradient(ellipse at center,#000,transparent 75%)}
.logo{width:${logo}px;height:${logo}px;flex:none;filter:drop-shadow(0 0 ${logo * 0.35}px rgba(13,204,242,.5))}
h1{font-family:Outfit,sans-serif;font-weight:800;line-height:1.04;letter-spacing:-.02em;font-size:${hSize}px}
h1 em{font-style:normal;background:linear-gradient(90deg,#67e8f9,#0ea5e9);-webkit-background-clip:text;color:transparent}
p{color:rgba(255,255,255,.74);font-size:${sSize}px;line-height:1.35;margin-top:${hSize * 0.35}px;font-weight:500}
.url{font-family:Outfit,sans-serif;font-weight:800;color:#22d3ee;font-size:${banner ? Math.min(h * 0.2, 17) : hSize * 0.55}px;margin-top:${banner ? 3 : hSize * 0.5}px;letter-spacing:.01em}
.ui{border-radius:${Math.max(8, m * 0.022)}px;overflow:hidden;border:1px solid rgba(103,232,249,.35);box-shadow:0 ${m * 0.03}px ${m * 0.09}px rgba(0,0,0,.6),0 0 ${m * 0.08}px rgba(13,204,242,.18)}
.ui .box{position:relative;width:100%}
.ui img{position:absolute;left:0;top:0;width:100%}
.row{display:flex;align-items:center;gap:${h * 0.2}px;width:100%;position:relative}
.row .t{flex:1;min-width:0}
.row h1{font-size:${hSize}px;${bannerUi ? '' : 'white-space:nowrap;overflow:hidden;'}}
.wide{display:flex;align-items:center;justify-content:space-between;gap:${w * 0.04}px;width:100%;position:relative}
.wide .t{flex:1}
.wide .logo{margin-bottom:${hSize * 0.6}px}
.tall{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:${pad * 0.8}px;width:100%;position:relative}
.tall .ui{align-self:center;flex:none}
.tall .url{align-self:center;margin:0}
.tall .logo{margin-bottom:${hSize * 0.5}px}
</style></head><body>${body}</body></html>`;
}

const manifest = [];
for (const c of CONCEPTS) {
  for (const s of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.setContent(page(c, s), { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    const dir = path.join(outDir, s.group === "display" ? "display-banners" : "responsive");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `eraseai-${c.id}-${s.w}x${s.h}.png`);
    await p.screenshot({ path: file });
    manifest.push(path.relative(outDir, file));
    await ctx.close();
  }
}
fs.writeFileSync(path.join(outDir, "manifest.txt"), manifest.join("\n") + "\n");
console.log(manifest.length, "images");
await browser.close();
server.close();
