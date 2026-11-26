// Renders Vee, the Vantward mascot, with the REAL markup and CSS of https://vantward.com (fetched into vee_source.html),
// on a transparent stage, so that he can be animated for the videos.
//   node vee_stage.mjs <vee_source.html> <outDir> sheet            -> a contact sheet of his moods
//   node vee_stage.mjs <vee_source.html> <outDir> frames <timeline.json> <size px>  -> transparent PNG frames
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path";
const repo = path.resolve(new URL("../../..", import.meta.url).pathname);
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright-core");
const [src, out, mode, tlPath, sizeArg] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(src, "utf8");
const css = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
const i = html.indexOf('id="vee"'); const s = html.lastIndexOf("<div", i);
let depth = 0, j = s; for (const m of html.slice(s).matchAll(/<div\b|<\/div>/g)) { depth += m[0] === "<div" ? 1 : -1; if (depth === 0) { j = s + m.index + m[0].length; break; } }
const veeMarkup = html.slice(s, j);
const F = sizeArg ? Number(sizeArg) / 18 : 24;     // font-size so that the 17em-tall character is ~sizeArg px high
const page = (mood) => `<!doctype html><meta charset="utf-8"><style>${css}
html,body{background:transparent!important;margin:0!important;overflow:hidden!important;height:auto!important}
body::before,body::after{display:none!important}
#stage{position:relative;font-size:${F}px;width:13em;height:18.6em;overflow:hidden}
#stage *{transition:none!important}
.vee .tummy{display:none!important}
</style><div id="stage">${veeMarkup.replace(/mood-\w+/, "mood-" + mood)}</div>`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: Math.ceil(F * 13), height: Math.ceil(F * 18.6) }, deviceScaleFactor: 1 });
if (mode === "sheet") {
  const moods = ["worried", "focus", "wow", "happy", "glee", "read", "hungry", "sleep"];
  const shots = [];
  for (const m of moods) { await p.setContent(page(m)); await p.waitForTimeout(250); const f = path.join(out, `mood_${m}.png`); await p.screenshot({ path: f, omitBackground: true }); shots.push(f); }
  console.log(shots.join("\n"));
} else {
  const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));       // { fps, frames: [{ t, mood, open }] }
  await p.setContent(page(tl.frames[0].mood)); await p.waitForTimeout(250);
  let mood = tl.frames[0].mood;
  for (let k = 0; k < tl.frames.length; k++) {
    const fr = tl.frames[k];
    await p.evaluate(({ mood, open, t }) => {
      const v = document.getElementById("vee");
      v.className = v.className.replace(/mood-\w+/, "mood-" + mood);
      const m = v.querySelector(".mouth");
      if (open > 0.04) { m.style.cssText = `width:${1.7 + open * 0.5}em;height:${0.25 + open * 1.5}em;margin-left:${-(1.7 + open * 0.5) / 2}em;border:0;border-radius:0 0 ${0.4 + open * 1.2}em ${0.4 + open * 1.2}em;background:var(--eye);box-shadow:0 0 .7em var(--eye);bottom:${0.9}em`; } else m.style.cssText = "";
      document.getAnimations().forEach((a) => { try { a.pause(); a.currentTime = t * 1000; } catch (e) {} });
    }, { mood: fr.mood, open: fr.open, t: fr.t });
    await p.screenshot({ path: path.join(out, `v${String(k).padStart(5, "0")}.png`), omitBackground: true });
  }
  console.log("frames", tl.frames.length);
}
await b.close();
