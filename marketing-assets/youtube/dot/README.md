# Dot: "Are you sure you're watching me?" (2026-11-26)

A short film told by your data, a faceless character called Dot (only eyes in the dark). No product pitch, no
"AI" in the film: the EraseAI logo and https://eraseai.ai appear only on the end card. Vee is not in this film.
Design: `docs/superpowers/specs/2026-11-26-data-pov-video-design.md`.

## Files (`files/`)

| File | What |
|---|---|
| `dot-film-1920x1080.mp4` | The film, 1:14, for YouTube |
| `dot-short-1080x1920.mp4` | The Short, 0:40 (lines 1, 3, 5, 7, 10, 12), for YouTube Shorts, Reels, LinkedIn |
| `thumb-1-tunnel.png` | Tilted endless-screen tunnel, "ARE YOU WATCHING ME?", eyes at the far end |
| `thumb-2-dot.png` | Close-up of Dot's sad eyes, "I'M DOT" |
| `thumb-3-letgo.png` | Dot above the Send button, "YOU LET ME GO" |

All thumbnails are 1280x720 (YouTube's A/B test drops anything smaller to 480p).

## Titles (A/B: up to three, set on desktop in YouTube Studio)

1. `Are you sure you're watching me? Or am I watching you?`
2. `I am your data. You lost me when you pressed Send.`
3. `Your data has a name. You never asked.`

My pick to lead: 1 with `thumb-1-tunnel.png` (title and thumbnail say the same thing). Test thumbnails 1, 2 and 3
against each other first; YouTube picks the winner by watch time, and editing the title during a test stops it.

## Description (paste as is)

```
Your data has something to say about the Send button.

This is Dot. Every little dot of you: your name, your birthday, your number, the things you only told it.
One press of Send, and it's gone. Copied, and copied again.

Before the next one goes, stop for one second.

0:00 Are you watching me?
0:22 You pressed Send
0:47 I would have stayed with you
1:00 There are more of us

Made by Vantward Solutions Pte. Ltd., Singapore: https://eraseai.ai/?utm_source=youtube&utm_medium=video&utm_campaign=dot
Voice and music are synthetic (generated with ElevenLabs). Animated short film; no real people or real data.

#DataPrivacy #DataProtection #Privacy #OnlineSafety #YourData
```

Tags: data privacy, data protection, where does my data go, personal data, online privacy, digital footprint, think
before you send, short film, animated short, Dot.

Short (title, max 100 characters): `I'm Dot. You let me go when you pressed Send. #DataPrivacy #Shorts`
Short description: first two lines of the description above, the link, the synthetic-voice line and the hashtags.

Pinned comment: `If your data could talk, what would it say to you? I'm reading every reply.`

## Before you publish

1. Watch both videos once with headphones. I checked timing, loudness and stills from every scene of the final
   videos, but I cannot hear: if Dot's voice is wrong for you, compare the samples in `audio/samples/` (River, Will, Brian; Will is
   used) and rebuild with another voice (see below). Everything re-times itself to the new voice.
2. Your ElevenLabs plan is Starter: check it covers commercial use of generated voice and music on YouTube.
3. YouTube Studio: "Altered or synthetic content": this is clearly animated, so the realistic-content label should not
   be required; the description already says the voice and music are synthetic. Audience: not made for kids.
4. The description has no product claims on purpose. Do not add any in replies either ("never leak", "AI detection",
   "no retention" are out).

## Rebuild

From `marketing-assets/youtube/dot/build` (needs Chromium at /opt/pw-browsers/chromium, ffmpeg, Inter, and the
`three` package installed in `artifacts/landing-video`):

```
node voice.mjs <voiceId> ../audio/voice                 # ElevenLabs key from the session proxy, or ELEVENLABS_API_KEY
./music.sh                                              # run from marketing-assets/youtube/dot
node timeline.mjs ../audio/voice film > timeline-film.json
node timeline.mjs ../audio/voice short > timeline-short.json
node render.mjs timeline-film.json 1920 1080 /tmp/film-video.mp4
node render.mjs timeline-short.json 1080 1920 /tmp/short-video.mp4
node compose.mjs timeline-film.json /tmp/film-video.mp4 ../audio/voice ../audio/music.mp3 ../files/dot-film-1920x1080.mp4
node compose.mjs timeline-short.json /tmp/short-video.mp4 ../audio/voice ../audio/music.mp3 ../files/dot-short-1080x1920.mp4
node thumbs.mjs ../files
node --test timeline.test.mjs
```
