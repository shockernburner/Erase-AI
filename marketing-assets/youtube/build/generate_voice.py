# Generates the narration lines in audio/narration-lines.json with ElevenLabs text-to-speech.
#   ELEVENLABS_API_KEY=... python3 generate_voice.py <voice_id> <tag> [line ids...]   (run in a folder that holds lines.json)
# Voice used: "Eric - Smooth, Trustworthy" (cjVigY5qzO86Huf0OWal). Alternatives sampled: Daniel (onwK4e9ZLuTAKqWW03F9), Alice (Xb7hH8MSUJpSbSDYk0k2).
# In a Claude Code session with a saved network credential the key is injected by the proxy, so the variable can be left unset.
import json, os, subprocess, sys
VOICE, TAG, only = sys.argv[1], sys.argv[2], sys.argv[3:]
hdr = ["-H", f"xi-api-key: {os.environ['ELEVENLABS_API_KEY']}"] if os.environ.get("ELEVENLABS_API_KEY") else []
for k, t in json.load(open("lines.json")).items():
    if only and k not in only: continue
    body = json.dumps({"text": t, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True}})
    out = f"{TAG}_{k}.mp3"
    r = subprocess.run(["curl", "-sS", "-m", "90", "-X", "POST", f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128", "-H", "Content-Type: application/json", *hdr, "-d", body, "-o", out, "-w", "%{http_code}"], capture_output=True, text=True)
    if r.stdout.strip() != "200": print(k, "HTTP", r.stdout, open(out, "rb").read()[:300]); os.remove(out); break
    print(k, out)
