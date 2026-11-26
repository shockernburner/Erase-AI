// Three 1280x720 thumbnails for YouTube's title/thumbnail A/B test.
//   node thumbs.mjs <outDir>     (uses timeline-film.json and render.mjs stills)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dot-thumbs-"));
const tl = JSON.parse(fs.readFileSync(path.join(here, "timeline-film.json"), "utf8"));
const at = (id) => tl.items.find((x) => x.id === id);
const still = (t, env = {}, size = ["1280", "720"]) => {
  execFileSync("node", [path.join(here, "render.mjs"), path.join(here, "timeline-film.json"), ...size, tmp, "--stills", String(t)], { env: { ...process.env, ...env }, stdio: "inherit" });
  return path.join(tmp, `t${t.toFixed(2).padStart(6, "0")}.png`);
};
const FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf";
const text = (lines, y) => lines.map((l, i) => `drawtext=fontfile=${FONT}:text='${l}':fontsize=104:fontcolor=white:x=(w-text_w)/2:y=${y + i * 116}:shadowcolor=0x5fe3ff@0.55:shadowx=0:shadowy=0:borderw=2:bordercolor=0x05070a`).join(",");
fs.mkdirSync(out, { recursive: true });
// T1: the tunnel, short title inside the tilted screen, eyes at the far end
const t1 = still(at("l01").end - 0.2, { THUMB_TITLE: "ARE YOU\nWATCHING ME?" });
fs.copyFileSync(t1, path.join(out, "thumb-1-tunnel.png"));
// T2: big sad eyes, "I'M DOT"
const t2 = still(at("l11").start + 0.4, {}, ["2240", "1260"]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", t2, "-vf", "crop=1440:810:400:240,scale=1280:720," + text(["I’M DOT"], 70), path.join(out, "thumb-2-dot.png")]);
// T3: the press of Send, "YOU LET ME GO"
const l05 = at("l05");
const t3 = still(l05.start + 1.15, {}, ["2240", "1260"]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", t3, "-vf", "crop=1680:945:280:150,scale=1280:720," + text(["YOU LET ME GO"], 34), path.join(out, "thumb-3-letgo.png")]);
for (const f of ["thumb-1-tunnel.png", "thumb-2-dot.png", "thumb-3-letgo.png"]) {
  const wh = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", path.join(out, f)]).toString().trim();
  console.log(f, wh);
}
