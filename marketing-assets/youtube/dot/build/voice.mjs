// Generates Dot's lines with ElevenLabs. Uses curl so the request goes through the session's
// HTTPS proxy, which injects the saved key; outside such a session set ELEVENLABS_API_KEY.
// Usage: node voice.mjs <voiceId> <outDir> [ids...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const [voiceId, outDir, ...only] = process.argv.slice(2);
const lines = JSON.parse(fs.readFileSync(new URL("./lines.json", import.meta.url)));
fs.mkdirSync(outDir, { recursive: true });
const key = process.env.ELEVENLABS_API_KEY ? ["-H", `xi-api-key: ${process.env.ELEVENLABS_API_KEY}`] : [];
for (const [id, text] of Object.entries(lines)) {
  if (only.length && !only.includes(id)) continue;
  const out = path.join(outDir, `${id}.mp3`);
  const body = JSON.stringify({ text, model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true, speed: 0.9 } });
  const code = execFileSync("curl", ["-sS", "-m", "120", "-X", "POST",
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    "-H", "Content-Type: application/json", ...key, "-d", body, "-o", out, "-w", "%{http_code}"]).toString();
  if (code !== "200") throw new Error(`${id}: HTTP ${code} ${fs.readFileSync(out, "utf8").slice(0, 300)}`);
  console.log("wrote", id);
}
