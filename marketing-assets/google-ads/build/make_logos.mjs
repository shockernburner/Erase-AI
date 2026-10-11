// Google Ads logos from the brand kit SVGs: 1:1 (1200x1200) and 4:1 (1200x300).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const out = path.resolve(here, "../images/logos");
fs.mkdirSync(out, { recursive: true });
const svg = (f) => fs.readFileSync(path.join(repo, "branding/logos", f), "utf8").replace("<svg", '<svg style="width:100%;height:100%"');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
async function shot(file, w, h, html) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<style>*{margin:0}body{width:${w}px;height:${h}px;background:#060a14;display:flex;align-items:center;justify-content:center}</style>${html}`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(out, file) });
  await p.close();
}
await shot("eraseai-logo-square-1200x1200.png", 1200, 1200, `<div style="width:900px;height:900px">${svg("eraseai-icon.svg")}</div>`);
await shot("eraseai-logo-landscape-1200x300.png", 1200, 300, `<div style="width:1000px;height:220px">${svg("eraseai-lockup-horizontal.svg")}</div>`);
await browser.close();
