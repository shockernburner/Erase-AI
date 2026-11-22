// Records the REAL EraseAI Chrome extension holding a typed message, on a generic stand-in chat page
// (marketing-assets/start-video/build/chat-standin.html, served as chatgpt.com only inside this harness so
// the extension runs on it; it is not a copy of any company's product). The values in the message are
// samples: an example.com address and a published test card number. The browser's own screencast supplies
// the frames, so what is on screen is what the extension rendered.
//   node capture_typed.mjs <outDir>   -> frames/*.jpg, frames.txt (ffmpeg concat list), timeline.json
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const ext = path.join(repo, "extension");
const html = fs.readFileSync(path.join(repo, "marketing-assets/start-video/build/chat-standin.html"), "utf8");
const out = process.argv[2]; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, "frames"), { recursive: true });
const PROMPT = process.env.CLIP_PROMPT || "Reply to this complaint. Customer: Jordan Lee, jordan.lee@example.com, card 4242 4242 4242 4242, phone 415-555-0132.";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-"));
const context = await chromium.launchPersistentContext(dir, {
  executablePath: "/opt/pw-browsers/chromium", headless: false,
  args: ["--headless=new", "--no-sandbox", `--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--window-size=896,504", "--force-device-scale-factor=2.1429"],
  viewport: { width: 896, height: 504 }, deviceScaleFactor: 2.1429,
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
const clock = Date.now(); const T = () => (Date.now() - clock) / 1000; const marks = {};
const cap = async () => {};
const cdp = await context.newCDPSession(page);
const frames = []; let t0 = null; let n = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const ts = metadata.timestamp; if (t0 == null) t0 = ts;
  const f = `frames/f${String(n++).padStart(5, "0")}.jpg`;
  fs.writeFileSync(path.join(out, f), Buffer.from(data, "base64"));
  frames.push({ f, t: ts - t0 });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await page.waitForTimeout(900);
marks.type = T(); await cap("You are about to send this to an AI chat.", "Names, an email, a card number.");
await page.focus("#prompt-textarea");
await page.keyboard.type(PROMPT, { delay: 38 });
await page.waitForTimeout(1300);
marks.send = T(); await cap("Press Send.", "");
await page.click('button[data-testid="send-button"]');
await page.waitForTimeout(900);
marks.hold = T();
await page.waitForTimeout(3800);                       // panel up: score and what was found
marks.buttons = T();
await page.evaluate(() => { const p = document.getElementById("eraseai-overlay-panel"); if (p) p.scrollTo({ top: p.scrollHeight, behavior: "smooth" }); });
await page.waitForTimeout(2600);                       // the choices come into view
marks.sanitize = T();
await page.evaluate(() => document.getElementById("eraseai-sanitize")?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => { const p = document.getElementById("eraseai-overlay-panel"); if (p) p.scrollTo({ top: p.scrollHeight, behavior: "smooth" }); });
await page.waitForTimeout(2600);                       // "Changes applied" and the Send Sanitized button
marks.sent = T();
await page.evaluate(() => [...document.querySelectorAll("#eraseai-overlay-panel button")].find((b) => b.textContent.includes("Send Sanitized"))?.click());
await page.waitForTimeout(3200);                       // the sanitized message is in the thread
marks.end = T();
await cdp.send("Page.stopScreencast"); await page.waitForTimeout(300);
const lines = [];
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : Math.max(0.1, marks.end - 0.05 - frames[i].t);
  lines.push(`file '${frames[i].f}'`, `duration ${Math.max(d, 0.001).toFixed(4)}`);
}
lines.push(`file '${frames[frames.length - 1].f}'`);
fs.writeFileSync(path.join(out, "frames.txt"), lines.join("\n"));
fs.writeFileSync(path.join(out, "timeline.json"), JSON.stringify({ ...marks, frames: frames.length, duration: marks.end - 0.05 }, null, 1));
console.log(JSON.stringify({ ...marks, frames: frames.length }));
await context.close();
