// Muxes the rendered video track with Dot's voice lines (placed at the timeline's start times)
// and the music bed (ducked under the voice), then normalises to -16 LUFS.
//   node compose.mjs <timeline.json> <video.mp4> <voiceDir> <music.mp3> <out.mp4>
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [tlPath, video, voiceDir, music, out] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const inputs = ["-i", video, "-i", music];
const parts = [];
tl.items.forEach((it, n) => {
  inputs.push("-i", `${voiceDir}/${it.id}.mp3`);
  const ms = Math.round(it.start * 1000);
  parts.push(`[${n + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${n}]`);
});
const T = tl.total.toFixed(3);
const vlabels = tl.items.map((_, n) => `[v${n}]`).join("");
const filter = [
  ...parts,
  `${vlabels}amix=inputs=${tl.items.length}:normalize=0,apad,atrim=0:${T},volume=1.0[voice]`,
  `[voice]asplit=2[voiceMix][voiceKey]`,
  `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${T},afade=t=in:d=2,afade=t=out:st=${(tl.total - 3.5).toFixed(3)}:d=3.5,volume=0.55[mus]`,
  `[mus][voiceKey]sidechaincompress=threshold=0.04:ratio=5:attack=40:release=600[ducked]`,
  `[voiceMix][ducked]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`,
].join(";");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "0:v", "-map", "[aout]",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", T, "-movflags", "+faststart", out], { stdio: "inherit" });
console.log("wrote", out);
