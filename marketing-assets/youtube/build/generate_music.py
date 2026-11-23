# Generates a 110-second instrumental bed with the ElevenLabs music API -> bed.mp3
#   ELEVENLABS_API_KEY=... python3 generate_music.py       (key optional inside a Claude Code session with a saved credential)
import json, os, subprocess
hdr = ["-H", f"xi-api-key: {os.environ['ELEVENLABS_API_KEY']}"] if os.environ.get("ELEVENLABS_API_KEY") else []
body = json.dumps({"prompt": "Calm, modern, minimal electronic underscore for a technology explainer video. Soft synth pads, a gentle steady pulse and light plucks, confident and trustworthy, slow subtle build, steady mid tempo. Instrumental only, no vocals, no drum fills, leaves room for a narrator.", "music_length_ms": 110000, "force_instrumental": True})
r = subprocess.run(["curl", "-sS", "-m", "240", "-X", "POST", "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", "-H", "Content-Type: application/json", *hdr, "-d", body, "-o", "bed.mp3", "-w", "%{http_code}"], capture_output=True, text=True)
print("HTTP", r.stdout)
