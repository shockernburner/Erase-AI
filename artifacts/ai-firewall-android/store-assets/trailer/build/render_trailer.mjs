// Renders the Google Play trailer frames from trailer/trailer.html (a pure function of time, so every
// frame is deterministic) and encodes them with ffmpeg.
//
//   node render_trailer.mjs stills 4.5,9,13 /tmp/out      -> PNG stills for review
//   node render_trailer.mjs video  /tmp/out/video.mp4     -> silent 1920x1080 30fps H.264
//
// Fonts (Roboto for the app UI, Noto Sans HK for Traditional Chinese) come from the @fontsource packages;
// set FONTS_HK / FONTS_ROBOTO to the unpacked `package` directories.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { scan, redact } from "./scanner_port.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(here, "../../../../..");
const require = createRequire(path.join(repo, "package.json"));
const { chromium } = require("playwright-core");

const FONTS_HK = process.env.FONTS_HK;
const FONTS_ROBOTO = process.env.FONTS_ROBOTO;
if (!FONTS_HK || !FONTS_ROBOTO) throw new Error("set FONTS_HK and FONTS_ROBOTO");

// The demo prompt: AWS's public example key and an example.com address. What the app shows is computed
// with the port of the app's own on-device rules, not typed in by hand.
export const PROMPT = "Why does this fail? Email jordan.lee@example.com, my AWS key is AKIAIOSFODNN7EXAMPLE";
const s = scan(PROMPT);
const SCANJSON = JSON.stringify({ labels: s.findings.map((f) => `${f.label} (${f.type})`), redacted: redact(PROMPT) });

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff" };
const server = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    let f;
    if (u === "/" || u === "/index.html") {
      const html = fs.readFileSync(path.join(root, "trailer.html"), "utf8").replace("__PROMPT__", PROMPT).replace("__SCAN__", SCANJSON);
      r.setHeader("content-type", "text/html");
      return r.end(html);
    }
    if (u.startsWith("/fonts/hk/")) f = path.join(FONTS_HK, u.slice(10));
    else if (u.startsWith("/fonts/roboto/")) f = path.join(FONTS_ROBOTO, u.slice(14));
    else if (u.startsWith("/branding/")) f = path.join(repo, u);
    else f = path.join(root, u);
    if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
    r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
    r.end(fs.readFileSync(f));
  })
  .listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => window.__ready === true);
await page.evaluate(() => document.fonts.ready);
const total = await page.evaluate(() => window.TL.total);

const [mode, a, b] = process.argv.slice(2);
if (mode === "timeline") console.log(JSON.stringify(await page.evaluate(() => window.TL)));
if (mode === "stills") {
  fs.mkdirSync(b, { recursive: true });
  for (const t of a.split(",").map(Number)) {
    await page.evaluate((x) => window.renderAt(x), t);
    await page.screenshot({ path: path.join(b, `t${String(t).replace(".", "_")}.png`) });
  }
} else if (mode === "video") {
  const FPS = 30;
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", a], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(total * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((x) => window.renderAt(x), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once("drain", res));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((res) => ff.on("close", res));
}
await browser.close();
server.close();
