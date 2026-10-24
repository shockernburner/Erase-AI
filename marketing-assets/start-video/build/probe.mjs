import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import vm from "node:vm";
const repo = "/home/user/Erase-AI";
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const ext = path.join(repo, "extension");
const html = fs.readFileSync(new URL("./chat-standin.html", import.meta.url), "utf8");
// the extension's own scanner, in Node, to answer the API calls with the same rules
const ctx = { self: {}, globalThis: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ext, "src/local-scanner.js"), "utf8"), ctx);
const S = ctx.self.EraseAILocalScanner;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-"));
const context = await chromium.launchPersistentContext(dir, {
  executablePath: "/opt/pw-browsers/chromium", headless: false,
  args: ["--headless=new", "--no-sandbox", `--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--window-size=1920,1080"],
  viewport: { width: 1920, height: 1080 },
});
await context.route("https://chatgpt.com/**", (r) => r.fulfill({ contentType: "text/html", body: html }));
await context.route("https://eraseai.ai/api/dev/ping", (r) => r.fulfill({ json: { ok: true, plan: "personal" } }));
await context.route("https://eraseai.ai/api/dev/analyze", (r) => r.fulfill({ json: S.analyzePromptSafety(JSON.parse(r.request().postData()).text) }));
await context.route("https://eraseai.ai/api/dev/sanitize", (r) => r.fulfill({ json: S.sanitizeText(JSON.parse(r.request().postData()).text) }));
await context.route("https://eraseai.ai/api/**", (r) => r.fulfill({ json: { ok: true } }));
let [sw] = context.serviceWorkers(); if (!sw) sw = await context.waitForEvent("serviceworker");
console.log("sw", sw.url());
// The extension's own server calls are answered inside its service worker, with its own on-device rules
// (the same rules the server runs), so the panel shows what a Personal subscriber sees.
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
fs.writeFileSync("/tmp/customers.csv", "name,email,card\nJordan Lee,jordan.lee@example.com,4242 4242 4242 4242\nMaya Chen,maya.chen@example.com,5555 5555 5555 4444\n");
await page.setInputFiles("#file", "/tmp/customers.csv");
await page.fill("#prompt-textarea", "Summarise this customer export and draft a follow-up email.");
await page.waitForTimeout(900);
await page.click('button[data-testid="send-button"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: process.argv[2] || "probe.png" });
await context.close();
