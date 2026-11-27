// Renders the Dot scenes with three.js in headless Chromium.
//   node render.mjs <timeline.json> <w> <h> <out.mp4>            full video (30 fps, no audio), piped into ffmpeg
//   node render.mjs <timeline.json> <w> <h> <outDir> --stills t1,t2,...   PNG stills at given seconds
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const THREE = path.join(repo, "artifacts/landing-video/node_modules/three/build/three.module.js");
const LOGO = path.join(repo, "marketing-assets/youtube/dot/build/logo-shield.png");
const [tlPath, w, h, out, flag, stillList] = process.argv.slice(2);
const timeline = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const files = { "/": [path.join(here, "scene.html"), "text/html"], "/scene.js": [path.join(here, "scene.js"), "text/javascript"],
  "/three.module.js": [THREE, "text/javascript"], "/logo.png": [LOGO, "image/png"] };
const server = http.createServer((req, res) => { let f = files[req.url]; if (!f && /^\/three\.[a-z.]+\.js$/.test(req.url)) f = [path.join(path.dirname(THREE), req.url.slice(1)), "text/javascript"]; if (!f) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": f[1] }); fs.createReadStream(f[0]).pipe(res); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on("pageerror", (e) => { console.error("pageerror", e); process.exit(1); });
page.on("console", (m) => { if (m.type() === "error") console.error("console", m.text()); });
await page.goto(url);
await page.waitForFunction(() => typeof window.setup === "function");
await page.evaluate((a) => window.setup(a), { w: +w, h: +h, timeline, thumbTitle: process.env.THUMB_TITLE || "" });
const grab = async (t) => {
  const b64 = await page.evaluate((t) => { window.renderAt(t); return document.querySelector("canvas").toDataURL("image/png").split(",")[1]; }, t);
  return Buffer.from(b64, "base64");
};
if (flag === "--stills") {
  fs.mkdirSync(out, { recursive: true });
  for (const s of stillList.split(",").map(Number)) fs.writeFileSync(path.join(out, `t${s.toFixed(2).padStart(6, "0")}.png`), await grab(s));
} else {
  const fps = 30, n = Math.ceil(timeline.total * fps);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-r", String(fps), out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < n; f++) {
    const buf = await grab(f / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 150 === 0) console.log(`frame ${f}/${n}`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
}
await browser.close(); server.close();
