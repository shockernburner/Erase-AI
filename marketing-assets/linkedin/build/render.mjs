// Renders the LinkedIn creatives in creatives.html to PNGs. Usage: node render.mjs <outDir>
import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)); const out = path.resolve(process.argv[2] || "..");
const { chromium } = createRequire(path.resolve(here, "../../../package.json"))("playwright-core");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1300, height: 2200 }, deviceScaleFactor: 1 });
await p.goto("file://" + path.join(here, "creatives.html")); await p.evaluate(() => document.fonts.ready);
for (const [id, name] of [["banner", "vantward-banner-1128x191.png"], ["ad1", "eraseai-pilot-ad-1200x627.png"], ["ad2", "eraseai-pilot-ad-1080x1080.png"]])
  await p.locator("#" + id).screenshot({ path: path.join(out, name) });
await b.close(); console.log("done");
