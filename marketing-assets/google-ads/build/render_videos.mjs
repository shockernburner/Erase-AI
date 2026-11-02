// Renders the Google Ads videos from the REAL built website (artifacts/eraseai/dist/public):
// the landing page's own scenes, driven frame by frame with a fake clock so the
// animation is smooth at any resolution. No sample data: everything shown is the live UI.
//
//   pnpm --filter @workspace/eraseai run build   (PORT=3000 BASE_PATH=/)
//   node marketing-assets/google-ads/build/render_videos.mjs [landscape|square|portrait ...]
//
// Output: marketing-assets/google-ads/videos/eraseai-ad-<format>-<w>x<h>-17s.mp4 (+ poster jpg)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const require = createRequire(path.join(repo, "package.json"));
const { chromium } = require("playwright-core");
const dist = path.join(repo, "artifacts/eraseai/dist/public");
const outDir = path.resolve(here, "../videos");
const work = process.env.AD_WORK || "/tmp/eraseai-ad-frames";
const logoSvg = fs.readFileSync(path.join(repo, "branding/logos/eraseai-icon.svg"), "utf8");

const FPS = 30;
const TOTAL = 17.5; // seconds

const FORMATS = {
  // zoom: camera push-in on the preview window so its text reads at ad size
  landscape: { w: 1440, h: 810, dsf: 4 / 3, out: [1920, 1080], label: "1920x1080", zoom: 1.85 },
  square: { w: 720, h: 720, dsf: 1.5, out: [1080, 1080], label: "1080x1080", zoom: 1.3 },
  portrait: { w: 360, h: 640, dsf: 3, out: [1080, 1920], label: "1080x1920", zoom: 1.0 },
};

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4" };
const server = http
  .createServer((q, r) => {
    const u = q.url.split("?")[0];
    if (u.startsWith("/api/")) {
      r.statusCode = 401;
      r.setHeader("content-type", "application/json");
      return r.end('{"error":"signed out"}');
    }
    let f = path.join(dist, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, "index.html");
    r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
    r.end(fs.readFileSync(f));
  })
  .listen(0);
const port = server.address().port;

// Clicks go through the DOM: Playwright's own click waits on animation frames, which are frozen here.
const chapter = (p, i) => p.evaluate((n) => document.querySelectorAll("nav[aria-label] button")[n].click(), i);
const checkOut = (p) =>
  p.evaluate(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => /check out/i.test(x.textContent || "") && x.tabIndex !== -1);
    b[0]?.click();
  });
const press = (p, key) => p.evaluate((k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })), key);

// Timeline (seconds of video). `speed` is how fast the page's clock runs relative to video time.
const EVENTS = [
  { t: 0.0, run: (p) => chapter(p, 1) }, // data -> AI -> the world
  { t: 3.2, run: (p) => chapter(p, 3) }, // "Erase AI?"
  { t: 4.2, run: (p) => press(p, "ArrowDown") }, // "Erase your leaks before AI"
  { t: 5.8, run: (p) => press(p, "ArrowDown") }, // EraseAI logo (the site's sample-text demo is hidden)
  { t: 8.8, run: (p) => chapter(p, 4) }, // plans
  { t: 9.5, run: checkOut }, // PIP preview of Personal: type, stop, sanitize
];
const PIP_FROM = 9.5;
const PIP_TO = 14.6;
const speedAt = (t) => (t >= PIP_FROM && t < PIP_TO ? 2.2 : 1);
const endCardAlpha = (t) => Math.min(1, Math.max(0, (t - 14.6) / 0.4));

const HIDE_CHROME = `
  header > div:last-child { display: none !important; }       /* nav links, language, sign in / up */
  nav[aria-label] { display: none !important; }                /* chapter timeline */
  main ~ div[class*="right-4"] { display: none !important; }   /* prev / next */
  [class*="bottom-[6"] { display: none !important; }           /* scroll cue */
  main .max-w-xl { display: none !important; }                 /* Send-button demo: shows sample names and card numbers, not used in ads */
`;

function endCardHtml(u) {
  return `
  <div id="endcard" style="position:fixed;inset:0;z-index:9999;display:none">
  <div id="endbg" style="position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at 50% 35%,rgba(13,204,242,.22),transparent 60%),#050912"></div>
  <div id="endfg" style="position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(${u}*3);color:#fff;font-family:Outfit,'DM Sans',system-ui,sans-serif;text-align:center;padding:calc(${u}*6)">
    <div style="width:calc(${u}*14);height:calc(${u}*14);filter:drop-shadow(0 0 calc(${u}*3) rgba(13,204,242,.55))">${logoSvg.replace("<svg", '<svg style="width:100%;height:100%"')}</div>
    <div style="font-weight:800;font-size:calc(${u}*8);line-height:1.05;letter-spacing:-.02em">Use AI. <span style="background:linear-gradient(90deg,#67e8f9,#0ea5e9);-webkit-background-clip:text;color:transparent">Keep your data.</span></div>
    <div style="font-size:calc(${u}*3.4);color:rgba(255,255,255,.7);max-width:calc(${u}*70)">Stops keys, passwords and personal data before they reach ChatGPT, Claude and Gemini.</div>
    <div style="margin-top:calc(${u}*1);padding:calc(${u}*2) calc(${u}*5);border-radius:999px;background:#22d3ee;color:#04111a;font-weight:800;font-size:calc(${u}*5.4)">eraseai.ai</div>
    <div style="display:flex;gap:calc(${u}*3);flex-wrap:wrap;justify-content:center;font-weight:700;font-size:calc(${u}*3.1)">
      <span style="padding:calc(${u}*1.4) calc(${u}*3.4);border-radius:999px;border:2px solid rgba(255,255,255,.28)">Chrome Web Store · free</span>
      <span style="padding:calc(${u}*1.4) calc(${u}*3.4);border-radius:999px;border:2px solid rgba(255,255,255,.28)">Google Play</span>
    </div>
  </div></div>`;
}

async function renderFormat(browser, name) {
  const F = FORMATS[name];
  const dir = path.join(work, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: F.dsf, reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.clock.install({ time: new Date("2026-10-10T10:00:00Z") });
  await p.goto(`http://localhost:${port}/`);
  await p.waitForSelector("nav[aria-label] button", { timeout: 20000 });
  await p.waitForTimeout(800);
  await p.addStyleTag({ content: HIDE_CHROME });
  const u = `${Math.min(F.w, F.h * 1.0) / 100}px`;
  await p.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), endCardHtml(u));
  // freeze the page clock, then step it by hand
  const now = await p.evaluate(() => Date.now());
  await p.clock.pauseAt(now + 200);
  await p.clock.runFor(1000);

  const frames = Math.round(TOTAL * FPS);
  const pending = [...EVENTS];
  let focus = null;
  const zoomAt = (t) => {
    const k = (x) => x * x * (3 - 2 * x);
    const inn = k(Math.min(1, Math.max(0, (t - 10.0) / 0.7)));
    return 1 + (F.zoom - 1) * inn;
  };
  let pageMs = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    while (pending.length && pending[0].t <= t + 1e-6) await pending.shift().run(p);
    const a = endCardAlpha(t);
    const z = zoomAt(t);
    if (t >= PIP_FROM + 0.4 && !focus) focus = await p.evaluate(() => {
      const r = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
      return r ? { cx: r.x + r.width / 2, cy: r.y + r.height / 2 } : null;
    });
    await p.evaluate(
      ([a, z, focus, w, h]) => {
        const card = document.getElementById("endcard");
        card.style.display = a > 0 ? "block" : "none";
        document.getElementById("endbg").style.opacity = String(Math.min(1, a * 4));
        document.getElementById("endfg").style.opacity = String(Math.max(0, (a - 0.25) / 0.75));
        const root = document.querySelector("#root > div");
        if (root) {
          root.style.transformOrigin = "0 0";
          root.style.transform = z > 1.001 && focus ? `translate(${w / 2 - focus.cx * z}px, ${h / 2 - focus.cy * z}px) scale(${z})` : "";
        }
      },
      [a, z, focus, F.w, F.h],
    );
    await p.screenshot({ path: path.join(dir, `f${String(f).padStart(4, "0")}.jpg`), type: "jpeg", quality: 93 });
    const step = (1000 / FPS) * speedAt(t);
    pageMs += step;
    await p.clock.runFor(step);
  }
  await ctx.close();
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `eraseai-ad-${name}-${F.label}-17s.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "f%04d.jpg"), "-vf", `scale=${F.out[0]}:${F.out[1]}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", "-r", String(FPS), out]);
  fs.copyFileSync(path.join(dir, `f${String(Math.round(15.9 * FPS)).padStart(4, "0")}.jpg`), path.join(outDir, `eraseai-ad-${name}-${F.label}-poster.jpg`));
  console.log(name, "done", out, errors.length ? `page errors: ${errors.join(" | ")}` : "no page errors");
}

const want = process.argv.slice(2).filter((a) => FORMATS[a]);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
for (const name of want.length ? want : Object.keys(FORMATS)) await renderFormat(browser, name);
await browser.close();
server.close();
