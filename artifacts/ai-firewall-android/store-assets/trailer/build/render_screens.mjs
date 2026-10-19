// Google Play phone screenshots (1080x1920, 9:16), English and Traditional Chinese captions, rendered from the
// same page as the trailer so they show the app's real dark UI and the scanner's real output.
//   node render_screens.mjs <outDir>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { scan, redact } from "./scanner_port.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(here, "../../../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const { FONTS_HK, FONTS_ROBOTO } = process.env;
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const PROMPT = "Why does this fail? Email jordan.lee@example.com, my AWS key is AKIAIOSFODNN7EXAMPLE";
const SCANJSON = JSON.stringify({ labels: scan(PROMPT).findings.map((f) => `${f.label} (${f.type})`), redacted: redact(PROMPT) });
const types = { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  if (u === "/") { r.setHeader("content-type", "text/html"); return r.end(fs.readFileSync(path.join(root, "trailer.html"), "utf8").replace("__PROMPT__", PROMPT).replace("__SCAN__", SCANJSON)); }
  const f = u.startsWith("/fonts/hk/") ? path.join(FONTS_HK, u.slice(10)) : u.startsWith("/fonts/roboto/") ? path.join(FONTS_ROBOTO, u.slice(14)) : u.startsWith("/branding/") ? path.join(repo, u) : path.join(root, u);
  if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); r.end(fs.readFileSync(f));
}).listen(0);

// state time on the trailer timeline, which layer to show, captions
const SHOTS = [
  { n: "01-choose-apps", t: 7.6, layer: "sApps", en: ["Choose the AI apps", "to protect"], zh: ["選擇要保護的", "AI 應用程式"], enSub: "ChatGPT, Claude, Gemini and more", zhSub: "ChatGPT、Claude、Gemini 等" },
  { n: "02-protection-on", t: 11.5, layer: "sHome", en: ["Turn protection on"], zh: ["開啟保護"], enSub: "It only watches the apps you chose", zhSub: "只會監察你選擇的應用程式" },
  { n: "03-checks-before-send", t: 18.7, layer: "sChat", en: ["It checks the message", "before you send"], zh: ["傳送之前", "先檢查訊息"], enSub: "", zhSub: "" },
  { n: "04-you-decide", t: 21.6, layer: "sChat", en: ["See what it found.", "You decide."], zh: ["看見偵測結果", "由你決定"], enSub: "Cancel · Sanitize & Send · Send Anyway", zhSub: "取消 · 淨化後傳送 · 仍然傳送" },
  { n: "05-safe-text", t: 28.0, layer: "sChat", en: ["Only the safe text", "goes out"], zh: ["只會傳送", "已淨化的文字"], enSub: "", zhSub: "" },
  { n: "06-enable-accessibility", t: 11.5, layer: "sGuide", en: ["Enable Accessibility", "to start"], zh: ["開啟無障礙功能", "即可開始"], enSub: "Not a VPN. Only the apps you choose.", zhSub: "不是 VPN，只保護你選擇的應用程式。" },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.__ready === true);
await page.addStyleTag({ content: `
  html, body, #stage { width: 1080px !important; height: 1920px !important; }
  #stage { background: radial-gradient(1000px 1000px at 50% 62%, rgba(13,204,242,.20), transparent 70%), radial-gradient(700px 500px at 50% 0%, rgba(61,224,255,.08), transparent 70%), #070A13 !important; }
  #caps, .centre { display: none !important; }
  .scap { position: absolute; left: 0; right: 0; top: 96px; text-align: center; padding: 0 60px; }
  .scap .h { font: 800 82px/1.1 Inter, Roboto, "Noto Sans HK"; letter-spacing: -1.5px; color: #fff; }
  .scap .h.zh { font: 700 84px/1.2 "Noto Sans HK", Inter; letter-spacing: 0; }
  .scap .sub { font: 500 38px/1.35 Inter, Roboto, "Noto Sans HK"; color: #3DE0FF; margin-top: 26px; }
` });
for (const lang of ["en", "zh-HK"]) {
  for (const sh of SHOTS) {
    await page.evaluate(({ t, layer, lines, sub }) => {
      window.renderAt(t);
      for (const id of ["sApps", "sHome", "sChat", "sGuide"]) document.getElementById(id).style.opacity = id === layer ? 1 : 0;
      const ph = document.getElementById("phone");
      ph.style.opacity = 1; ph.style.left = "130px"; ph.style.top = "470px"; ph.style.transformOrigin = "0 0"; ph.style.transform = "scale(1.822)";
      document.querySelectorAll(".scap").forEach((e) => e.remove());
      const c = document.createElement("div"); c.className = "scap";
      c.innerHTML = `<div class="h ${lines.zh ? "zh" : ""}">${lines.l.join("<br>")}</div>${sub ? `<div class="sub">${sub}</div>` : ""}`;
      document.getElementById("stage").appendChild(c);
    }, { t: sh.t, layer: sh.layer, lines: { l: lang === "en" ? sh.en : sh.zh, zh: lang !== "en" }, sub: lang === "en" ? sh.enSub : sh.zhSub });
    await page.screenshot({ path: path.join(out, `phone-${sh.n}-${lang}.png`) });
  }
}
await browser.close(); server.close();
console.log("done", out);
