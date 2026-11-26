#!/usr/bin/env bash
# Generates the 90-second music bed with the ElevenLabs music API -> audio/music.mp3
# Run from marketing-assets/youtube/dot. Key: injected by the session proxy, or set ELEVENLABS_API_KEY.
set -euo pipefail
KEY=(); [ -n "${ELEVENLABS_API_KEY:-}" ] && KEY=(-H "xi-api-key: $ELEVENLABS_API_KEY")
curl -sS -m 300 -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128" \
  -H "Content-Type: application/json" "${KEY[@]}" -o audio/music.mp3 -w "HTTP %{http_code}\n" \
  -d '{"prompt":"Slow, sparse, melancholic solo felt piano with a soft warm ambient pad underneath. Intimate and lonely, like a small lost pet remembering its owner. Very gentle, lots of space and silence between notes, no drums, no percussion, no vocals. Leaves room for a quiet narrator. Ends softly.","music_length_ms":90000,"force_instrumental":true}'
