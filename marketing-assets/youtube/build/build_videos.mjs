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
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 110px 0 540px}
.k{font-weight:700;font-size:26px;letter-spacing:5px;color:#0DCCF2;margin-bottom:28px}
h1{font-weight:800;font-size:72px;line-height:1.1;letter-spacing:-2px}
.s{font-weight:500;font-size:42px;line-height:1.4;color:#94A3B8;margin-top:34px;max-width:1450px}.s b{color:#3DE0FF}
.fn{position:absolute;left:540px;right:110px;bottom:70px;font-size:24px;color:#64748B;text-align:center}
.two{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:50px;width:1250px;text-align:left}
.box{padding:34px 40px;border-radius:26px;border:2px solid rgba(13,204,242,.3);background:rgba(13,204,242,.06)}
.box h3{font-size:36px;font-weight:800;margin-bottom:12px}.box.g h3{color:#3DE0FF}.box.w h3{color:#FCA5A5}.box.w{border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.06)}
.box p{font-size:34px;line-height:1.4;font-weight:500;color:#E2E8F0}
ol{margin-top:40px;text-align:left;font-size:40px;line-height:1.45;font-weight:600;list-style:none;counter-reset:q}
ol li{counter-increment:q;margin-bottom:18px;padding-left:80px;position:relative}ol li:before{content:counter(q);position:absolute;left:0;width:54px;height:54px;border-radius:50%;background:#0DCCF2;color:#06202a;font-weight:800;display:grid;place-items:center;top:2px}
.pill{margin-top:52px;padding:22px 56px;border-radius:60px;border:2px solid rgba(61,224,255,.55);background:rgba(13,204,242,.1);font-weight:700;font-size:40px}
.shot{position:absolute;left:470px;top:200px;width:1400px;height:787px;border-radius:18px;border:2px solid #26334C;box-shadow:0 30px 100px rgba(0,0,0,.6),0 0 90px rgba(13,204,242,.12)}
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
await shoot("vbg", `<div class="bg" style="width:1080px;height:1920px"><div class="vbot" style="left:360px;right:40px;bottom:100px;text-align:left;font-size:38px;line-height:1.35;color:#E2E8F0;font-weight:700">On your device by default.<br>Not a VPN.<br><span style="color:#3DE0FF;font-size:44px">eraseai.ai</span></div></div>`, { w: 1080, h: 1920 });
for (let i = 0; i < caps.length; i++) await shoot(`vcap${i}`, `<div class="vcap"><div class="k">${caps[i][0]}</div><h2>${caps[i][1]}</h2>${caps[i][2] ? `<p>${caps[i][2]}</p>` : ""}</div>`, { w: 1080, h: 1920, transparent: true });
// ---- video 2 cards
const stat = "One vendor’s analysis of about 22 million enterprise AI prompts in 2025 found 579,113 sensitive items; ChatGPT accounted for 71.2% of them.";
await shoot("v2_hook", card("AN HONEST GUIDE", "Your staff are pasting customer data into AI chats.", "Three ways to stop it, and what each is good and bad at."));
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
    fc = `[1:v]split=2[s1][s2];[s1]crop=1600:1080:160:0,scale=1000:675:flags=lanczos[w];[s2]crop=1100:1080:410:0,scale=960:942:flags=lanczos[n];[0:v][w]overlay=40:560:enable='lt(t,${A})+gt(t,${B})'[o0a];[o0a][n]overlay=60:420:enable='between(t,${A},${B})'[o0]`;
  }
  else fc = `[1:v]scale=1400:787:flags=lanczos[v];[0:v][v]overlay=470:200[o0]`;
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
const VOICE = process.env.VOICE_DIR;           // folder with eric_<line>.mp3 and music/bed.mp3 (see README)
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const vd = (k) => (VOICE ? dur(path.join(VOICE, `eric_${k}.mp3`)) : 0);
const vf = (k) => path.join(VOICE, `eric_${k}.mp3`);
// ---- video 1 timeline (landscape and vertical share it)
const HOOK = 3.4, footLen = footEnd - footStart;
const trust = VOICE ? vd("v1_7") + 0.9 : 4.8, cta = VOICE ? vd("v1_8") + 1.2 : 5.2;
const fin = (t) => HOOK + (t - footStart);
still("v1_hook", HOOK, "a1"); footage("a2", footStart, footEnd, caps, "cap", "bg", false); still("v1_trust", trust, "a3"); still("v1_cta", cta, "a4");
still("vv_hook", HOOK, "b1", 1080, 1920); footage("b2", footStart, footEnd, caps, "vcap", "vbg", true); still("vv_trust", trust, "b3", 1080, 1920); still("vv_cta", cta, "b4", 1080, 1920);
const t1 = [["v1_1", 0.4], ["v1_2", fin(TL.send - 0.1)], ["v1_3", fin(TL.hold) + 0.1], ["v1_4", fin(TL.buttons) + 0.1], ["v1_5", fin(TL.sanitize) + 0.9], ["v1_6", fin(TL.sent) + 0.3], ["v1_7", HOOK + footLen + 0.3], ["v1_8", HOOK + footLen + trust + 0.3]];
// ---- video 2 timeline: each card lasts as long as its narration plus a short pause
const cards = ["v2_hook", "v2_why", "v2_o1", "v2_o2", "v2_o3"].map((p, i) => [p, VOICE ? vd(`v2_${i + 1}`) + 0.9 : [5, 8, 9, 9, 9][i]]);
cards.forEach(([p, d], i) => still(p, d, `c${i + 1}`));
const demoStart = TL.send - 0.2, demoEnd = TL.sanitize + 2.6;
footage("c6", demoStart, demoEnd, [["", "", "", 0, 99]], "v2_democap_", "v2_demo", false);
const q = VOICE ? vd("v2_7") + 0.9 : 14, mix = VOICE ? vd("v2_8") + 0.9 : 8, cta2 = VOICE ? vd("v2_9") + 0.9 : 6;
still("v2_q", q, "c7"); still("v2_mix", mix, "c8"); still("v2_cta", cta2, "c9");
const t2 = []; let at = 0; const marks = [];
cards.forEach(([p, d], i) => { t2.push([`v2_${i + 1}`, at + 0.3]); marks.push(at); at += d; });
t2.push(["v2_6", at + 0.3]); marks.push(at); at += demoEnd - demoStart;
t2.push(["v2_7", at + 0.3]); marks.push(at); at += q;
t2.push(["v2_8", at + 0.3]); marks.push(at); at += mix;
t2.push(["v2_9", at + 0.3]); marks.push(at); at += cta2;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const names = ["The problem", "Why it happens", "Option 1: policy and training", "Option 2: network tools and gateways", "Option 3: a check at the Send button", "Option 3 in action (the real extension, sample data)", "Five questions to ask any vendor", "The honest answer: most companies need a mix", "Try it"];
fs.writeFileSync(path.join(out, "chapters-v2.txt"), marks.map((m, i) => `${mmss(m)} ${names[i]}`).join("\n") + "\n");
// ---- Vee: the Vantward mascot, rendered from the real vantward.com markup and CSS, talking with the narration
const VEE_H = 558, FPS = 30;
function envelope(wav, total) {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { maxBuffer: 1 << 28 });
  const n = buf.length / 2, spf = 16000 / FPS, rms = [];
  for (let f = 0; f * spf < n; f++) { let s = 0, c = 0; for (let i = Math.floor(f * spf); i < Math.min(n, Math.floor((f + 1) * spf)); i++) { const v = buf.readInt16LE(i * 2) / 32768; s += v * v; c++; } rms.push(Math.sqrt(s / Math.max(c, 1))); }
  const sorted = [...rms].sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)] || 1e-3;
  let open = 0; const out = [];
  for (const r of rms) { let x = Math.max(0, (r - 0.012) / (p95 - 0.012)); x = Math.min(1, Math.pow(x, 0.75)); open = x > open ? open * 0.35 + x * 0.65 : open * 0.6 + x * 0.4; out.push(Math.round(open * 10) / 10); }
  return out;
}
const moodAt = (sched, t) => { let m = sched[0][1]; for (const [s, mood] of sched) if (t >= s) m = mood; return m; };
const veeCache = {};
function renderVee(key, wav, total, sched) {
  if (veeCache[key]) return veeCache[key];
  const dir = P("vee_" + key); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const env = envelope(wav, total), n = Math.ceil(total * FPS) + 1;
  const frames = Array.from({ length: n }, (_, k) => ({ t: k / FPS, mood: moodAt(sched, k / FPS), open: env[k] || 0 }));
  fs.writeFileSync(P("vee_" + key + ".json"), JSON.stringify({ fps: FPS, frames }));
  execFileSync("node", [path.join(path.dirname(new URL(import.meta.url).pathname), "vee_stage.mjs"), path.join(path.dirname(new URL(import.meta.url).pathname), "vee_source.html"), dir, "frames", P("vee_" + key + ".json"), String(VEE_H)], { stdio: "inherit" });
  return (veeCache[key] = dir);
}
// ---- join, then mix narration and music (music ducks under the voice)
function join(parts, name, voiceLines, vee) {
  const list = P(name + ".txt"); fs.writeFileSync(list, parts.map((p) => `file '${P(p + ".mp4")}'`).join("\n"));
  const total = parts.reduce((t, p) => t + dur(P(p + ".mp4")), 0);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", P(name + "_silent.mp4")]);
  if (VOICE) {
    const ins = []; voiceLines.forEach(([k]) => ins.push("-i", vf(k))); ins.push("-i", path.join(VOICE, "music/bed.mp3"));
    const n = voiceLines.length;
    const delays = voiceLines.map(([k, s], i) => `[${i}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},apad[d${i}]`).join(";");
    const fc = `${delays};${voiceLines.map((_, i) => `[d${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,atrim=0:${total.toFixed(2)},asplit=2[vs][vo];[${n}:a]atrim=0:${total.toFixed(2)},volume=0.5,afade=t=in:d=2,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5[m];[m][vs]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[duck];[duck][vo]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[a]`;
    ff([...ins, "-filter_complex", fc, "-map", "[a]", "-t", total.toFixed(2), "-c:a", "aac", "-b:a", "192k", P(name + "_mix.m4a")]);
    const vins = []; voiceLines.forEach(([k]) => vins.push("-i", vf(k)));
    const vfc = `${delays};${voiceLines.map((_, i) => `[d${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,atrim=0:${total.toFixed(2)}[v]`;
    ff([...vins, "-filter_complex", vfc, "-map", "[v]", "-ar", "16000", "-ac", "1", P(name + "_voice.wav")]);
  } else {
    ff(["-f", "lavfi", "-i", `sine=frequency=110:sample_rate=44100:duration=${total}`, "-f", "lavfi", "-i", `sine=frequency=165:sample_rate=44100:duration=${total}`, "-f", "lavfi", "-i", `sine=frequency=220:sample_rate=44100:duration=${total}`,
      "-filter_complex", `[0][1][2]amix=inputs=3,tremolo=f=0.15:d=0.6,lowpass=f=600,volume=0.14,afade=t=in:d=2,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[a]`, "-map", "[a]", "-c:a", "aac", "-b:a", "128k", P(name + "_mix.m4a")]);
  }
  if (VOICE && vee) {
    const dir = renderVee(vee.key, P(name + "_voice.wav"), total, vee.sched);
    ff(["-i", P(name + "_silent.mp4"), "-framerate", String(FPS), "-i", path.join(dir, "v%05d.png"), "-i", P(name + "_mix.m4a"),
      "-filter_complex", `[1:v]scale=-1:${vee.h}[vee];[0:v][vee]overlay=${vee.x}:${vee.y}:shortest=1[o]`, "-map", "[o]", "-map", "2:a", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", "-movflags", "+faststart", path.join(out, name + ".mp4")]);
  } else {
  ff(["-i", P(name + "_silent.mp4"), "-i", P(name + "_mix.m4a"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", path.join(out, name + ".mp4")]);
  }
  console.log(name, total.toFixed(1) + "s");
}
const m1 = [[0, "worried"], [fin(TL.send - 0.1), "focus"], [fin(TL.hold), "wow"], [fin(TL.buttons), "focus"], [fin(TL.sanitize), "happy"], [fin(TL.sent), "glee"], [HOOK + footLen, "read"], [HOOK + footLen + trust, "happy"], [HOOK + footLen + trust + cta - 1.8, "glee"]];
join(["a1", "a2", "a3", "a4"], "eraseai-paste-test-1920x1080", t1, { key: "v1", sched: m1, h: 540, x: 30, y: 500 });
join(["b1", "b2", "b3", "b4"], "eraseai-paste-test-vertical-1080x1920", t1, { key: "v1", sched: m1, h: 430, x: 14, y: 1450 });
const m2 = [["worried", 0], ["focus", 1], ["read", 2], ["read", 3], ["focus", 4], ["wow", 5], ["focus", 6], ["happy", 7], ["glee", 8]].map(([mo, i]) => [marks[i], mo]);
join(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"], "eraseai-3-ways-to-stop-staff-pasting-customer-data", t2, { key: "v2", sched: m2, h: 540, x: 30, y: 500 });
for (const t of ["thumb_v1_a", "thumb_v1_b", "thumb_v2"]) fs.copyFileSync(P(t + ".png"), path.join(out, t.replace("thumb_", "thumbnail-") + ".png"));
