// Builds the YouTube videos from the real-extension footage made by capture_typed.mjs.
//   node build_videos.mjs <workDir with cap/raw.mp4 and cap/timeline.json> <outDir>
// Outputs: v1 (landscape + vertical) "paste test", v2 "3 ways to stop it", and thumbnails. Silent, with captions
// and a quiet sound bed; record your own voice-over from the scripts in docs/marketing/youtube/ if you prefer.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import path from "node:path";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const work = process.argv[2], out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const raw = path.join(work, "cap/raw.mp4");
const TL = JSON.parse(fs.readFileSync(path.join(work, "cap/timeline.json"), "utf8"));
const font = (w, n) => `@font-face{font-family:Inter;font-weight:${w};src:url(file:///usr/share/fonts/opentype/inter/Inter-${n}.otf)}`;
const CSS = `${font(500, "Medium")}${font(700, "Bold")}${font(800, "ExtraBold")}
*{margin:0;box-sizing:border-box}html,body{font-family:Inter,sans-serif;color:#fff;overflow:hidden}
.bg{background:radial-gradient(900px 700px at 28% 48%,rgba(13,204,242,.16),transparent 70%),radial-gradient(800px 600px at 85% 90%,rgba(61,224,255,.07),transparent 70%),#070A13}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 150px}
.k{font-weight:700;font-size:26px;letter-spacing:5px;color:#0DCCF2;margin-bottom:28px}
h1{font-weight:800;font-size:80px;line-height:1.1;letter-spacing:-2px}
.s{font-weight:500;font-size:42px;line-height:1.4;color:#94A3B8;margin-top:34px;max-width:1450px}.s b{color:#3DE0FF}
.fn{position:absolute;left:150px;right:150px;bottom:70px;font-size:24px;color:#64748B;text-align:center}
.two{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:70px;width:1640px;text-align:left}
.box{padding:34px 40px;border-radius:26px;border:2px solid rgba(13,204,242,.3);background:rgba(13,204,242,.06)}
.box h3{font-size:40px;font-weight:800;margin-bottom:12px}.box.g h3{color:#3DE0FF}.box.w h3{color:#FCA5A5}.box.w{border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.06)}
.box p{font-size:40px;line-height:1.4;font-weight:500;color:#E2E8F0}
ol{margin-top:50px;text-align:left;font-size:46px;line-height:1.45;font-weight:600;list-style:none;counter-reset:q}
ol li{counter-increment:q;margin-bottom:18px;padding-left:80px;position:relative}ol li:before{content:counter(q);position:absolute;left:0;width:54px;height:54px;border-radius:50%;background:#0DCCF2;color:#06202a;font-weight:800;display:grid;place-items:center;top:2px}
.pill{margin-top:52px;padding:22px 56px;border-radius:60px;border:2px solid rgba(61,224,255,.55);background:rgba(13,204,242,.1);font-weight:700;font-size:40px}
.shot{position:absolute;left:192px;top:200px;width:1536px;height:864px;border-radius:18px;border:2px solid #26334C;box-shadow:0 30px 100px rgba(0,0,0,.6),0 0 90px rgba(13,204,242,.12)}
.cap{position:absolute;left:0;right:0;top:0;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px}
.cap .k{margin:0 0 12px;font-size:24px}.cap h2{font-weight:800;font-size:56px;letter-spacing:-1px;line-height:1.1}.cap p{font-weight:500;font-size:28px;color:#3DE0FF;margin-top:8px}
.vcap{position:absolute;left:60px;right:60px;top:150px;text-align:center}.vcap .k{font-size:26px;margin-bottom:18px}.vcap h2{font-weight:800;font-size:74px;line-height:1.08;letter-spacing:-1.5px}.vcap p{font-size:36px;font-weight:500;color:#3DE0FF;margin-top:20px}
.vbot{position:absolute;left:60px;right:60px;bottom:140px;text-align:center;font-size:34px;color:#94A3B8;font-weight:500}
`;
const b = await chromium.launchPersistentContext(fs.mkdtempSync("/tmp/yt-"), { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"], viewport: { width: 1920, height: 1080 } });
const page = b.pages()[0] || await b.newPage();
const P = (f) => path.join(work, f);
async function shoot(name, body, { w = 1920, h = 1080, transparent = false } = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${CSS}${transparent ? "html,body{background:transparent}" : ""}</style>${body}`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(120);
  await page.screenshot({ path: P(name + ".png"), omitBackground: transparent });
}
const card = (k, h1, s = "", extra = "", fn = "") => `<div class="bg c" style="width:1920px;height:1080px"><div class="k">${k}</div><h1>${h1}</h1>${s ? `<div class="s">${s}</div>` : ""}${extra}${fn ? `<div class="fn">${fn}</div>` : ""}</div>`;
// ---- cards, video 1 (landscape)
await shoot("v1_hook", card("30-SECOND TEST", "You are about to paste<br>customer data into an AI chat.", "Watch what happens next. <b>(Sample values, real extension.)</b>"));
await shoot("v1_trust", card("HOW IT WORKS", "On your device by default.", "No proxy in the middle. <b>Not a VPN.</b><br>It is rules, not magic: it can miss things, so you always decide."));
await shoot("v1_cta", card("ERASEAI FIREWALL", "Free on Chrome.<br>Android app too.", "For teams: a <b>free 30-day pilot</b> for up to 10 people.", `<div class="pill">eraseai.ai</div>`));
await shoot("bg", `<div class="bg" style="width:1920px;height:1080px"><div class="shot"></div></div>`);
// ---- footage captions (landscape), times are footage seconds
const caps = [
  ["STEP 1", "Say you paste this into an AI chat.", "A name, an email, a card and a phone number.", 0.7, TL.send - 0.1],
  ["STEP 2", "Press Send.", "", TL.send - 0.1, TL.hold],
  ["STEP 3", "EraseAI holds the message and shows what it found.", "Before anything is sent.", TL.hold, TL.buttons],
  ["STEP 4", "You choose: Cancel, Sanitize & Send, or Send Anyway.", "", TL.buttons, TL.sanitize],
  ["PAID PLANS", "Sanitize & Send swaps the values for labels.", "", TL.sanitize, TL.sent],
  ["RESULT", "The AI only sees the sanitized message.", "", TL.sent, TL.end],
];
for (let i = 0; i < caps.length; i++) await shoot(`cap${i}`, `<div class="cap"><div class="k">${caps[i][0]}</div><h2>${caps[i][1]}</h2>${caps[i][2] ? `<p>${caps[i][2]}</p>` : ""}</div>`, { transparent: true });
// ---- vertical (Shorts): 1080x1920
const V = (body, name) => shoot(name, `<div class="bg" style="width:1080px;height:1920px">${body}</div>`, { w: 1080, h: 1920 });
await V(`<div class="vcap" style="top:560px"><div class="k">30-SECOND TEST</div><h2>You are about to paste customer data into an AI chat.</h2><p>Watch what happens next.</p></div>`, "vv_hook");
await V(`<div class="vcap" style="top:560px"><div class="k">HOW IT WORKS</div><h2>On your device by default.</h2><p>No proxy in the middle. Not a VPN. Rules, not magic: it can miss things, so you decide.</p></div>`, "vv_trust");
await V(`<div class="vcap" style="top:480px"><div class="k">ERASEAI FIREWALL</div><h2>Free on Chrome. Android app too.</h2><p>Teams: free 30-day pilot for up to 10 people.</p><div class="pill" style="display:inline-block;margin-top:50px">eraseai.ai</div></div>`, "vv_cta");
await shoot("vbg", `<div class="bg" style="width:1080px;height:1920px"><div class="vbot" style="bottom:120px;font-size:42px;color:#E2E8F0;font-weight:700">On your device by default. Not a VPN.<br><span style="color:#3DE0FF;font-size:46px">eraseai.ai</span></div></div>`, { w: 1080, h: 1920 });
for (let i = 0; i < caps.length; i++) await shoot(`vcap${i}`, `<div class="vcap"><div class="k">${caps[i][0]}</div><h2>${caps[i][1]}</h2>${caps[i][2] ? `<p>${caps[i][2]}</p>` : ""}</div>`, { w: 1080, h: 1920, transparent: true });
// ---- video 2 cards
const stat = "One vendor’s analysis of about 22 million enterprise AI prompts in 2025 found 579,113 sensitive items; ChatGPT accounted for 71.2% of them.";
await shoot("v2_hook", card("A 80-SECOND GUIDE", "Your staff are pasting customer data into AI chats.", "Three ways to stop it, and what each is good and bad at."));
await shoot("v2_why", card("WHY IT HAPPENS", "Nobody is careless.<br>They are fast.", stat, "", "Source: Harmonic Security, 2025 (a vendor study)."));
const opt = (n, title, good, weak) => card(`OPTION ${n}`, title, "", `<div class="two"><div class="box g"><h3>Good at</h3><p>${good}</p></div><div class="box w"><h3>Weak at</h3><p>${weak}</p></div></div>`);
await shoot("v2_o1", opt(1, "Policy and training", "It is cheap, sets expectations, and you need it anyway.", "It depends on memory at the worst moment: a deadline and a chat box."));
await shoot("v2_o2", opt(2, "Network tools and gateways", "Central visibility, and blocking whole categories of sites.", "They see the message after it has left the person&#39;s hands, and have to sit in the middle."));
await shoot("v2_o3", opt(3, "A check at the Send button", "It acts before anything leaves, and the person decides.", "Rules can miss things, and it has to be rolled out on every device and browser."));
await shoot("v2_demo", `<div class="bg" style="width:1920px;height:1080px"><div class="shot"></div></div>`);
await shoot("v2_democap_0", `<div class="cap"><div class="k">OPTION 3 IN ACTION</div><h2>EraseAI: the real extension, sample data.</h2></div>`, { transparent: true });
await shoot("v2_q", card("BEFORE YOU BUY ANYTHING", "Five questions to ask any vendor", "", `<ol><li>Where does the check run: on the device or on your servers?</li><li>What do you store, and for how long?</li><li>What happens when it is unsure?</li><li>Which apps and browsers does it cover?</li><li>Can I see decisions without seeing the text?</li></ol>`));
await shoot("v2_mix", card("THE HONEST ANSWER", "Most companies need a mix.", "Policy sets the rules. A check at Send catches the slip. Gateways give you visibility."));
await shoot("v2_cta", card("ERASEAI FIREWALL", "Try it free on Chrome.", "Teams: a <b>free 30-day pilot</b> for up to 10 people.", `<div class="pill">eraseai.ai</div>`));
// ---- thumbnails 1280x720, using a real frame
const grabPanel = (t, name) => { execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(t), "-i", raw, "-frames:v", "1", "-vf", "crop=1100:1080:410:0", P(name + ".png")]); return "data:image/png;base64," + fs.readFileSync(P(name + ".png")).toString("base64"); };
const imgHold = grabPanel(TL.hold + 1.6, "frame_hold"), imgChoice = grabPanel(TL.buttons + 1.6, "frame_choice");
const tb = (inner) => `<div class="bg" style="width:1280px;height:720px;position:relative">${inner}</div>`;
const T = `font-weight:800;letter-spacing:-2px;line-height:1.02`;
await shoot("thumb_v1_a", tb(`<img src="${imgHold}" style="position:absolute;right:30px;top:40px;height:640px;border-radius:20px;border:4px solid #F87171;box-shadow:0 0 60px rgba(248,113,113,.45)"><div style="position:absolute;left:50px;top:110px;width:520px;${T};font-size:128px">STOP.<br><span style="color:#FCA5A5;font-size:64px;letter-spacing:-1px">Before you<br>hit Send.</span></div><div style="position:absolute;left:50px;bottom:60px;font-size:36px;font-weight:700;color:#3DE0FF">Customer data in an AI chat</div>`), { w: 1280, h: 720 });
await shoot("thumb_v1_b", tb(`<img src="${imgChoice}" style="position:absolute;left:30px;top:40px;height:640px;border-radius:20px;border:4px solid #0DCCF2;box-shadow:0 0 60px rgba(13,204,242,.4)"><div style="position:absolute;left:730px;top:130px;width:520px;${T};font-size:96px;text-align:left">HELD<br><span style="color:#3DE0FF">before<br>sending</span></div>`), { w: 1280, h: 720 });
await shoot("thumb_v2", tb(`<div style="position:absolute;left:60px;top:80px;right:60px;${T};font-size:112px">3 ways to stop staff pasting <span style="color:#3DE0FF">customer data</span> into AI</div><div style="position:absolute;left:60px;bottom:60px;font-size:40px;font-weight:700;color:#94A3B8">An honest comparison  ·  80 seconds</div>`), { w: 1280, h: 720 });
await b.close();

// ---- ffmpeg
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const FMT = (w, h, d) => `fps=30,scale=${w}:${h},format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=${(d - 0.25).toFixed(2)}:d=0.25`;
const still = (png, d, o, w = 1920, h = 1080) => ff(["-loop", "1", "-t", String(d), "-i", P(png + ".png"), "-vf", FMT(w, h, d), "-c:v", "libx264", "-crf", "17", P(o + ".mp4")]);
function footage(o, start, end, capsList, capPrefix, bgPng, vertical) {
  const d = end - start;
  const inputs = ["-loop", "1", "-i", P(bgPng + ".png"), "-ss", String(start), "-t", String(d), "-i", raw];
  capsList.forEach((c, i) => inputs.push("-loop", "1", "-i", P(`${capPrefix}${i}.png`)));
  let fc, last;
  if (vertical) {
    // wide crop for typing and the sent message; tight crop on the panel while it holds, so its text is readable
    const A = (TL.hold - start).toFixed(2), B = (TL.sent - start).toFixed(2);
    fc = `[1:v]split=2[s1][s2];[s1]crop=1600:1080:160:0,scale=1080:729:flags=lanczos[w];[s2]crop=1100:1080:410:0,scale=1080:1060:flags=lanczos[n];[0:v][w]overlay=0:560:enable='lt(t,${A})+gt(t,${B})'[o0a];[o0a][n]overlay=0:480:enable='between(t,${A},${B})'[o0]`;
  }
  else fc = `[1:v]scale=1536:864:flags=lanczos[v];[0:v][v]overlay=192:200[o0]`;
  last = "o0";
  capsList.forEach((c, i) => {
    const a = Math.max(0, c[3] - start).toFixed(2), z = Math.min(d, c[4] - start).toFixed(2);
    if (+z <= +a) return;
    fc += `;[${last}][${i + 2}:v]overlay=0:0:enable='between(t,${a},${z})'[o${i + 1}]`; last = `o${i + 1}`;
  });
  const [w, h] = vertical ? [1080, 1920] : [1920, 1080];
  fc += `;[${last}]fps=30,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=${(d - 0.25).toFixed(2)}:d=0.25[final]`;
  ff([...inputs, "-filter_complex", fc, "-map", "[final]", "-t", d.toFixed(2), "-c:v", "libx264", "-crf", "17", P(o + ".mp4")]);
}
const footStart = TL.type - 0.3, footEnd = TL.end;
// video 1 landscape
still("v1_hook", 3.4, "a1"); footage("a2", footStart, footEnd, caps, "cap", "bg", false); still("v1_trust", 4.8, "a3"); still("v1_cta", 5.2, "a4");
// video 1 vertical
still("vv_hook", 3.4, "b1", 1080, 1920); footage("b2", footStart, footEnd, caps, "vcap", "vbg", true); still("vv_trust", 4.8, "b3", 1080, 1920); still("vv_cta", 5.2, "b4", 1080, 1920);
// video 2
const v2 = [["v2_hook", 5], ["v2_why", 8], ["v2_o1", 9], ["v2_o2", 9], ["v2_o3", 9]];
v2.forEach(([p, d], i) => still(p, d, `c${i + 1}`));
footage("c6", TL.send - 0.2, TL.sanitize + 2.6, [["", "", "", 0, 99]], "v2_democap_", "v2_demo", false);
still("v2_q", 14, "c7"); still("v2_mix", 8, "c8"); still("v2_cta", 6, "c9");
// ---- join and add a quiet sound bed
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", P(f)]).toString());
function join(parts, name) {
  const list = P(name + ".txt"); fs.writeFileSync(list, parts.map((p) => `file '${P(p + ".mp4")}'`).join("\n"));
  const total = parts.reduce((t, p) => t + dur(p + ".mp4"), 0);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", P(name + "_silent.mp4")]);
  ff(["-f", "lavfi", "-i", `sine=frequency=110:sample_rate=44100:duration=${total}`, "-f", "lavfi", "-i", `sine=frequency=165:sample_rate=44100:duration=${total}`, "-f", "lavfi", "-i", `sine=frequency=220:sample_rate=44100:duration=${total}`,
    "-filter_complex", `[0][1][2]amix=inputs=3,tremolo=f=0.15:d=0.6,lowpass=f=600,volume=0.14,afade=t=in:d=2,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[a]`, "-map", "[a]", "-c:a", "aac", "-b:a", "128k", P(name + "_bed.m4a")]);
  ff(["-i", P(name + "_silent.mp4"), "-i", P(name + "_bed.m4a"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", path.join(out, name + ".mp4")]);
  console.log(name, total.toFixed(1) + "s");
}
join(["a1", "a2", "a3", "a4"], "eraseai-paste-test-1920x1080");
join(["b1", "b2", "b3", "b4"], "eraseai-paste-test-vertical-1080x1920");
join(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"], "eraseai-3-ways-to-stop-staff-pasting-customer-data");
for (const t of ["thumb_v1_a", "thumb_v1_b", "thumb_v2"]) fs.copyFileSync(P(t + ".png"), path.join(out, t.replace("thumb_", "thumbnail-") + ".png"));
