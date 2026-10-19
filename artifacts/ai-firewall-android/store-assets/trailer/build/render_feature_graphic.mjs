// 1024x500 Play feature graphic, same layout as feature-graphic-1024x500.png, Traditional Chinese (Hong Kong) tagline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../../..");
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const hk = (w) => "file://" + path.join(process.env.FONTS_HK, `files/noto-sans-hk-chinese-hongkong-${w}-normal.woff2`);
const rob = (w) => "file://" + path.join(process.env.FONTS_ROBOTO, `files/roboto-latin-${w}-normal.woff2`);
const icon = "file://" + path.join(repo, "artifacts/ai-firewall-android/store-assets/eraseai_shield.png");
const html = `<!doctype html><meta charset=utf8><style>
@font-face{font-family:HK;font-weight:700;src:url(${hk(700)})}
@font-face{font-family:HK;font-weight:500;src:url(${hk(500)})}
@font-face{font-family:HK;font-weight:400;src:url(${hk(400)})}
@font-face{font-family:Rb;font-weight:700;src:url(${rob(700)})}
@font-face{font-family:Rb;font-weight:400;src:url(${rob(400)})}
*{margin:0;box-sizing:border-box} body{width:1024px;height:500px;background:#0A0F1A;position:relative;overflow:hidden;font-family:Rb,HK}
.grid{position:absolute;inset:0;background-image:linear-gradient(#142033 1px,transparent 1px),linear-gradient(90deg,#142033 1px,transparent 1px);background-size:40px 40px;opacity:.55}
.c1{position:absolute;left:620px;top:-120px;width:360px;height:360px;border-radius:50%;background:#0B2A3A}
.c2{position:absolute;left:40px;top:280px;width:280px;height:280px;border-radius:50%;background:#0B2230}
.bar{position:absolute;left:64px;top:120px;width:117px;height:7px;background:#0DCCF2}
h1{position:absolute;left:64px;top:140px;font:700 52px/1.1 Rb;color:#fff}
.t{position:absolute;left:64px;top:224px;font:500 30px/1.45 HK;color:#0DCCF2}
.s{position:absolute;left:64px;top:340px;font:400 21px/1 Rb,HK;color:#94A3B8}
img{position:absolute;left:700px;top:110px;width:280px;height:280px;border-radius:66px}
</style><div class=grid></div><div class=c1></div><div class=c2></div><div class=bar></div>
<h1>EraseAI Firewall</h1><div class=t>傳送到 AI 之前，<br>先檢查敏感內容。</div>
<div class=s>Android · ChatGPT · Claude · Gemini</div><img src="${icon}">`;
fs.writeFileSync("/tmp/fg.html", html);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
await p.goto("file:///tmp/fg.html"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: process.argv[2] }); await b.close();
