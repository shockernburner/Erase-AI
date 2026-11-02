// Records the REAL EraseAI Chrome extension (extension/) scanning an attached file, on a stand-in chat page.
// Frames come from the browser's own screencast, so what is on screen is what the extension rendered.
//   node capture_chrome.mjs <outDir>      -> frames/*.jpg + frames.txt (ffmpeg concat list) + timeline.json
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const ext = path.join(repo, "extension");
const html = fs.readFileSync(new URL("./chat-standin.html", import.meta.url), "utf8");
const out = process.argv[2]; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, "frames"), { recursive: true });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-"));
const context = await chromium.launchPersistentContext(dir, {
  executablePath: "/opt/pw-browsers/chromium", headless: false,
  args: ["--headless=new", "--no-sandbox", `--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--window-size=960,627", "--force-device-scale-factor=2", "--font-render-hinting=none"],
  viewport: null,
});
await context.route("https://chatgpt.com/**", (r) => r.fulfill({ contentType: "text/html", body: html }));
let [sw] = context.serviceWorkers(); if (!sw) sw = await context.waitForEvent("serviceworker");
await sw.evaluate(() => {
  const orig = self.fetch.bind(self);
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  self.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("/api/dev/ping")) return json({ ok: true, plan: "personal" });
    if (u.includes("/api/dev/analyze")) return json(self.EraseAILocalScanner.analyzePromptSafety(JSON.parse(opts.body).text));
    if (u.includes("/api/dev/sanitize")) return json(self.EraseAILocalScanner.sanitizeText(JSON.parse(opts.body).text));
    if (u.includes("eraseai.ai/api/")) return json({ ok: true });
    return orig(url, opts);
  };
});
await sw.evaluate(() => chrome.storage.local.set({ apiKey: "eak_demo", enabled: true }));
await new Promise((r) => setTimeout(r, 400));
await sw.evaluate(() => chrome.storage.local.set({ plan: { plan: "personal", planCheckedAt: Date.now() } }));

const page = await context.newPage();
await page.goto("https://chatgpt.com/");
await page.waitForTimeout(1500);
// one customer, sample values only (example.com address, a published test card number)
const csv = path.join(os.tmpdir(), "customer-refunds.csv");
fs.writeFileSync(csv, "name,email,card\nJordan Lee,jordan.lee@example.com,4242 4242 4242 4242\nMaya Chen,maya.chen@example.com,5555 5555 5555 4444\nSam Okoye,sam.okoye@example.com,3782 822463 10005\n");

var clock = Date.now();
const cdp = await context.newCDPSession(page);
const frames = []; let t0 = null; let n = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const ts = metadata.timestamp; if (t0 == null) { t0 = ts; console.log("first frame at wall", ((Date.now() - clock) / 1000).toFixed(2), "ts", ts); }
  const f = `frames/f${String(n++).padStart(5, "0")}.jpg`;
  fs.writeFileSync(path.join(out, f), Buffer.from(data, "base64"));
  frames.push({ f, t: ts - t0 });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const T = () => (Date.now() - clock) / 1000; const marks = {};
await page.waitForTimeout(1200);
marks.attach = T(); await page.setInputFiles("#file", csv);
await page.waitForTimeout(1400);
marks.type = T(); await page.focus("#prompt-textarea");
await page.keyboard.type("Summarise these refund requests for my team.", { delay: 45 });
await page.waitForTimeout(1300);
marks.send = T(); await page.click('button[data-testid="send-button"]');
await page.waitForTimeout(3400);
// the panel is up; show the clean-copy action working
marks.clean = T();
await page.evaluate(() => document.querySelector(".eraseai-clean-copy")?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector(".eraseai-clean-copy")?.click());
await page.waitForTimeout(3200);
marks.end = T();
await cdp.send("Page.stopScreencast");
await page.waitForTimeout(300);
// ffmpeg concat list with real durations
const lines = [];
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : Math.max(0.1, marks.end - 0.05 - frames[i].t);
  lines.push(`file '${frames[i].f}'`, `duration ${Math.max(d, 0.001).toFixed(4)}`);
}
lines.push(`file '${frames[frames.length - 1].f}'`);
fs.writeFileSync(path.join(out, "frames.txt"), lines.join("\n"));
fs.writeFileSync(path.join(out, "timeline.json"), JSON.stringify({ ...marks, frames: frames.length, duration: marks.end - 0.05 }, null, 1));
console.log(JSON.stringify({ ...marks, frames: frames.length, dur: frames[frames.length - 1].t }));
await context.close();
