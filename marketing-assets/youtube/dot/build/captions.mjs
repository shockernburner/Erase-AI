// Writes SRT captions from a timeline and the approved lines (no emotion tags).
//   node captions.mjs <timeline.json> <out.srt>
import fs from "node:fs";
const [tlPath, out] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const lines = JSON.parse(fs.readFileSync(new URL("./lines.json", import.meta.url)));
const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
// split a line into caption-sized pieces at sentence ends, timed by character share
const cues = [];
for (const it of tl.items) {
  const parts = lines[it.id].match(/[^.?!]+[.?!]+/g).map((p) => p.trim());
  const total = parts.reduce((a, p) => a + p.length, 0); let t = it.start;
  for (const p of parts) { const d = (it.end - it.start) * p.length / total; cues.push([t, t + d, p]); t += d; }
}
cues.push([tl.endCardStart + 0.2, tl.total, "Stop losing them."]);
fs.writeFileSync(out, cues.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt}\n`).join("\n"));
console.log("wrote", out, cues.length, "cues");
