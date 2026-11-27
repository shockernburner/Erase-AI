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
const text = (lines, y, size = 104) => lines.map((l, i) => `drawtext=fontfile=${FONT}:text='${l}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y + i * Math.round(size * 1.12)}:shadowcolor=0x5fe3ff@0.55:shadowx=0:shadowy=0:borderw=2:bordercolor=0x05070a`).join(",");
const BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf";
// the quieter second line, smaller and slightly dimmer, below the eyes
const sub = (line, y, size) => `drawtext=fontfile=${BOLD}:text='${line.replace(/'/g, "\u2019")}':fontsize=${size}:fontcolor=white@0.85:x=(w-text_w)/2:y=${y}:borderw=2:bordercolor=0x05070a`;
fs.mkdirSync(out, { recursive: true });
// T1: the tunnel, short title inside the tilted screen, eyes at the far end
const t1 = still(at("l01").start + 1.0, {}, ["2240", "1260"]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", t1, "-vf", "crop=1680:945:280:60,scale=1280:720," + text(["ARE YOU", "WATCHING ME?"], 40) + "," + sub("or is it me watching you?", 560, 54), path.join(out, "thumb-1-eyes.png")]);
// T2: big sad eyes, "I'M DOT"
const t2 = still(at("l11").start + 0.4, {}, ["2240", "1260"]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", t2, "-vf", "crop=1440:810:400:240,scale=1280:720," + text(["I’M DOT"], 70), path.join(out, "thumb-2-dot.png")]);
// T3: the press of Send, "YOU LET ME GO"
const l05 = at("l05");
const t3 = still(l05.start + 1.15, {}, ["2240", "1260"]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", t3, "-vf", "crop=1680:945:280:150,scale=1280:720," + text(["YOU LET ME GO"], 34), path.join(out, "thumb-3-letgo.png")]);
const tls = JSON.parse(fs.readFileSync(path.join(here, "timeline-short.json"), "utf8"));
execFileSync("node", [path.join(here, "render.mjs"), path.join(here, "timeline-short.json"), "1440", "2560", tmp, "--stills", String(tls.items[0].start + 1.0)], { stdio: "inherit" });
const tv = path.join(tmp, `t${(tls.items[0].start + 1.0).toFixed(2).padStart(6, "0")}.png`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tv, "-vf", "crop=1080:1920:180:320," + text(["ARE YOU", "WATCHING", "ME?"], 300, 132) + "," + sub("or is it me watching you?", 1150, 66), path.join(out, "thumb-short-1080x1920.png")]);
for (const f of ["thumb-short-1080x1920.png", "thumb-1-eyes.png", "thumb-2-dot.png", "thumb-3-letgo.png"]) {
  const wh = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", path.join(out, f)]).toString().trim();
  console.log(f, wh);
}
