// Thumbnails with Vee (the Vantward mascot): node make_thumbs_vee.mjs <veeMoodDir> <panelFrame.png> <outDir>
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const [moods, panel, out] = process.argv.slice(2);
const b64 = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const font = (w, n) => `@font-face{font-family:Inter;font-weight:${w};src:url(file:///usr/share/fonts/opentype/inter/Inter-${n}.otf)}`;
const css = `${font(700, "Bold")}${font(800, "ExtraBold")}*{margin:0}body{width:1280px;height:720px;font-family:Inter,sans-serif;color:#fff;overflow:hidden;position:relative;background:radial-gradient(800px 600px at 22% 55%,rgba(13,204,242,.25),transparent 70%),radial-gradient(700px 500px at 90% 10%,rgba(248,113,113,.14),transparent 70%),#070A13}.t{position:absolute;font-weight:800;letter-spacing:-2px;line-height:1.02}`;
const pages = {
  "thumbnail-v1_c": `<img src="${b64(path.join(moods, "mood_worried.png"))}" style="position:absolute;left:10px;top:70px;height:650px"><div class="t" style="left:470px;top:70px;font-size:150px">STOP.</div><div class="t" style="left:470px;top:250px;font-size:78px;color:#FCA5A5">Before you<br>hit Send.</div><img src="${b64(panel)}" style="position:absolute;right:40px;bottom:50px;height:330px;border-radius:18px;border:4px solid #F87171;box-shadow:0 0 50px rgba(248,113,113,.45)">`,
  "thumbnail-v1_d": `<img src="${b64(path.join(moods, "mood_wow.png"))}" style="position:absolute;right:20px;top:60px;height:660px"><div class="t" style="left:50px;top:90px;font-size:112px">HELD</div><div class="t" style="left:50px;top:215px;font-size:112px;color:#3DE0FF">before<br>sending</div><div style="position:absolute;left:54px;bottom:60px;width:640px;font-size:34px;line-height:1.25;font-weight:700;color:#94A3B8">What happens when you paste customer data into an AI chat?</div>`,
  "thumbnail-v2_vee": `<img src="${b64(path.join(moods, "mood_focus.png"))}" style="position:absolute;left:10px;top:70px;height:650px"><div class="t" style="left:500px;top:90px;width:740px;font-size:92px">3 ways to stop staff pasting <span style="color:#3DE0FF">customer data</span> into AI</div><div style="position:absolute;left:504px;bottom:60px;font-size:36px;font-weight:700;color:#94A3B8">An honest comparison with Vee</div>`,
};
const br = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const p = await br.newPage({ viewport: { width: 1280, height: 720 } });
for (const [n, body] of Object.entries(pages)) { await p.setContent(`<style>${css}</style>${body}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150); await p.screenshot({ path: path.join(out, n + ".png") }); }
await br.close();
