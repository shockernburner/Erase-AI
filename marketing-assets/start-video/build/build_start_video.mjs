// Builds public/videos/eraseai-how-it-works.mp4 for the /start page (English, silent, 1920x1080, 30 fps).
//   1. capture_chrome.mjs   the REAL extension scanning an attached file (frames + timeline)
//   2. render_trailer.mjs   the Android scenes (TRAILER_LANG=en, T0/T1 window, demo prompt via TRAILER_PROMPT)
//   3. this script          title and price cards, Chrome captions, and the ffmpeg join
//   node build/build_start_video.mjs <workDir> <out.mp4>      (needs FONTS_HK and FONTS_ROBOTO, see trailer/UPLOAD.md)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import path from "node:path";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const work = process.argv[2], out = process.argv[3];
const inter = (w) => `@font-face{font-family:Inter;font-weight:${w};src:url(file:///usr/share/fonts/opentype/inter/Inter-${{ 500: "Medium", 700: "Bold", 800: "ExtraBold" }[w]}.otf)}`;
const CSS = `${inter(500)}${inter(700)}${inter(800)}
*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;font-family:Inter,sans-serif;color:#fff;overflow:hidden}
.bg{background:radial-gradient(900px 700px at 28% 48%,rgba(13,204,242,.16),transparent 70%),radial-gradient(800px 600px at 85% 90%,rgba(61,224,255,.07),transparent 70%),#070A13}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 160px}
.k{font-weight:700;font-size:26px;letter-spacing:5px;color:#0DCCF2;margin-bottom:28px}
h1{font-weight:800;font-size:84px;line-height:1.1;letter-spacing:-2px}
.s{font-weight:500;font-size:36px;line-height:1.4;color:#94A3B8;margin-top:34px;max-width:1400px}
.s b{color:#3DE0FF;font-weight:700}
.row{display:flex;gap:28px;margin-top:56px}
.card{flex:1;text-align:left;padding:34px 38px;border-radius:26px;border:2px solid rgba(13,204,242,.35);background:rgba(13,204,242,.07);max-width:700px}
.card h3{font-size:34px;font-weight:800;color:#3DE0FF;margin-bottom:12px}.card p{font-size:30px;line-height:1.4;font-weight:500;color:#E2E8F0}
.pill{margin-top:52px;padding:22px 52px;border-radius:60px;border:2px solid rgba(61,224,255,.55);background:rgba(13,204,242,.1);font-weight:700;font-size:34px}
.cap{position:absolute;left:0;right:0;top:0;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cap .k{margin:0 0 12px;font-size:24px}.cap h2{font-weight:800;font-size:58px;letter-spacing:-1px;line-height:1.1}
.cap p{font-weight:500;font-size:28px;color:#3DE0FF;margin-top:8px}
.shot{position:absolute;left:192px;top:200px;width:1536px;height:864px;border-radius:18px;border:2px solid #26334C;box-shadow:0 30px 100px rgba(0,0,0,.6),0 0 90px rgba(13,204,242,.15)}`;
const pages = {
  bg: `<div class="bg" style="width:1920px;height:1080px"><div class="shot"></div></div>`,
  title: `<div class="bg c"><div class="k">ERASEAI FIREWALL</div><h1>Stop sensitive data<br>before it reaches AI</h1><div class="s"><b>Android:</b> every chat in the AI apps you choose.<br><b>Chrome:</b> your messages and your attached files.</div></div>`,
  price: `<div class="bg c"><div class="k">ERASEAI PERSONAL</div><h1>$5 a month</h1>
    <div class="row"><div class="card"><h3>On Chrome</h3><p>Attachment scanning and one-click Sanitize &amp; Send. Other browsers soon.</p></div>
    <div class="card"><h3>On Android</h3><p>Full protection for your AI chats.</p></div></div>
    <div class="pill">Start free on Chrome and Android. Subscribe when you're ready.</div></div>`,
};
const caps = [
  ["ON CHROME", "Attach a file, as you always do.", "", 0.3, 3.0],
  ["ON CHROME", "Then press Send.", "", 3.0, 6.1],
  ["ON CHROME", "EraseAI reads inside the file first.", "Emails and card numbers are found before you send.", 6.1, 10.2],
  ["ON CHROME", "Send a clean copy instead.", "One click downloads the file with those values masked.", 10.2, 13.4],
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const shoot = async (name, body, transparent = false) => {
  await page.setContent(`<style>${CSS}</style>${transparent ? '<style>html,body{background:transparent}</style>' : ""}${body}`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(work, `${name}.png`), omitBackground: transparent });
};
for (const [n, b] of Object.entries(pages)) await shoot(n, b);
for (let i = 0; i < caps.length; i++) await shoot(`cap${i}`, `<div class="cap"><div class="k">${caps[i][0]}</div><h2>${caps[i][1]}</h2>${caps[i][2] ? `<p>${caps[i][2]}</p>` : ""}</div>`, true);
await browser.close();

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const P = (f) => path.join(work, f);
const FMT = "fps=30,format=yuv420p";
ff(["-loop", "1", "-t", "3.5", "-i", P("title.png"), "-vf", FMT, "-c:v", "libx264", "-crf", "17", P("s0.mp4")]);
ff(["-loop", "1", "-t", "6", "-i", P("price.png"), "-vf", FMT, "-c:v", "libx264", "-crf", "17", P("s3.mp4")]);
// Chrome segment: footage in a window, captions on top
const inputs = ["-loop", "1", "-i", P("bg.png"), "-i", P("chrome_raw.mp4")];
caps.forEach((_, i) => inputs.push("-loop", "1", "-i", P(`cap${i}.png`)));
let fc = `[1:v]scale=1536:864,fps=30[v];[0:v][v]overlay=192:200:shortest=1[b0]`;
caps.forEach(([, , , a, b], i) => {
  fc += `;[${i + 2}:v]format=rgba,fade=t=in:st=${a}:d=0.3:alpha=1,fade=t=out:st=${b - 0.3}:d=0.3:alpha=1[c${i}];[b${i}][c${i}]overlay=0:0:shortest=1[b${i + 1}]`;
});
fc += `;[b${caps.length}]format=yuv420p[out]`;
ff([...inputs, "-filter_complex", fc, "-map", "[out]", "-t", "13.4", "-c:v", "libx264", "-crf", "17", P("s1.mp4")]);
ff(["-i", P("android_part.mp4"), "-vf", FMT, "-c:v", "libx264", "-crf", "17", P("s2.mp4")]);
// join with 0.5 s cross-fades
const d = [3.5, 13.4, 16.1, 6];
ff(["-i", P("s0.mp4"), "-i", P("s1.mp4"), "-i", P("s2.mp4"), "-i", P("s3.mp4"), "-filter_complex",
  `[0:v]settb=AVTB,fps=30[x0];[1:v]settb=AVTB,fps=30[x1];[2:v]settb=AVTB,fps=30[x2];[3:v]settb=AVTB,fps=30[x3];[x0][x1]xfade=transition=fade:duration=0.5:offset=${d[0] - 0.5}[a];[a][x2]xfade=transition=fade:duration=0.5:offset=${d[0] + d[1] - 1.0}[b];[b][x3]xfade=transition=fade:duration=0.5:offset=${d[0] + d[1] + d[2] - 1.5}[o]`,
  "-map", "[o]", "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
console.log("wrote", out);
