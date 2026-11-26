// Muxes the rendered video track with Dot's voice lines (placed at the timeline's start times)
// and the music bed (ducked under the voice), then normalises to -16 LUFS.
//   node compose.mjs <timeline.json> <video.mp4> <voiceDir> <music.mp3> <out.mp4>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
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
// an extra 4.4 dB dip in the music under every line, on top of the sidechain ducking
const dips = tl.items.map((it) => `volume=0.6:enable='between(t,${(it.start - 0.15).toFixed(2)},${(it.end + 0.2).toFixed(2)})'`).join(",");
const vlabels = tl.items.map((_, n) => `[v${n}]`).join("");
const filter = [
  ...parts,
  `${vlabels}amix=inputs=${tl.items.length}:normalize=0,apad,atrim=0:${T},volume=1.0[voice]`,
  `[voice]asplit=2[voiceMix][voiceKey]`,
  `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${T},afade=t=in:d=2,afade=t=out:st=${(tl.total - 3.5).toFixed(3)}:d=3.5,volume=0.28,${dips}[mus]`,
  `[mus][voiceKey]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=900[ducked]`,
  `[voiceMix][ducked]amix=inputs=2:normalize=0[aout]`,
].join(";");
// Pass 1: mix to WAV and measure. Pass 2: one fixed gain to -16 LUFS plus a peak limiter, so the
// voice/music balance stays as mixed (a dynamic normaliser would lift the music in the pauses).
const wav = path.join(os.tmpdir(), `dot-mix-${process.pid}.wav`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[aout]", "-t", T, "-c:a", "pcm_s16le", wav]);
const meas = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", wav, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const I = Number([...meas.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop()[1]);
const gain = (-16 - I).toFixed(2);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a",
  "-af", `volume=${gain}dB,alimiter=limit=0.84:level=disabled`, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-t", T, "-movflags", "+faststart", out], { stdio: "inherit" });
fs.unlinkSync(wav);
console.log(`mix ${I} LUFS, gain ${gain} dB`);
console.log("wrote", out);
