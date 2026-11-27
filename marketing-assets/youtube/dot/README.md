# Dot: "Are you sure you're watching me?" (2026-11-26)

A short film told by your data, a faceless character called Dot (only eyes in the dark). No product pitch, no
"AI" in the film: the EraseAI logo and https://eraseai.ai appear only on the end card. Vee is not in this film.
Design: `docs/superpowers/specs/2026-11-26-data-pov-video-design.md`.

Revision 2 (owner feedback): opens on the eyes alone on black (no tunnel or text); every blink turns the whole
screen black; the network is a 3D field of glass nodes with depth of field that the camera travels through, with Dot's
copies inside the bubbles; voice is Zelda (v3) with emotion; the end-card logo is the shield cut out of its tile.

## Files (`files/`)

| File | What |
|---|---|
| `dot-film-1920x1080.mp4` | The film, 1:28, for YouTube (captions: `dot-film.en.srt`) |
| `dot-short-1080x1920.mp4` | The Short, 0:47 (lines 1, 3, 5, 7, 10, 12), for YouTube Shorts, Reels, LinkedIn (captions: `dot-short.en.srt`) |
| `thumb-1-eyes.png` | Dot's eyes on black under "ARE YOU WATCHING ME?" with "or is it me watching you?" below the eyes (matches the opening) |
| `thumb-short-1080x1920.png` | Vertical version for the Short (cover image for Shorts, Reels, TikTok, LinkedIn) |
| `thumb-2-dot.png` | Close-up of Dot's sad eyes, "I'M DOT" |
| `thumb-3-letgo.png` | Dot above the Send button, "YOU LET ME GO" |

All thumbnails are 1280x720 (YouTube's A/B test drops anything smaller to 480p).

## Upload copy (revised 2026-11-27 from short-film title research and a decision-maker psychology review)

What the research said, in one line each:
- Emotional shorts lead with a short name, then a genre label after " | " or in round brackets ("In a Heartbeat - Animated
  Short Film", "Hair Love | Oscar-Winning Short Film"). Square brackets did not appear in any of 15 sampled titles.
- Brackets help viewers recognise the format; there is no evidence they raise clicks on YouTube (894 matched pairs: no
  effect; the "+38%" figure is a 2015 paid-headline study, not YouTube). Use round brackets for the genre label.
- Security leaders watch as curators ("could I show this to my people?"). They click on "short film", a stated length and
  no vendor signals; "security", "AI", "breach", "protect" read as a pitch or training module and get skipped.
  "Personal data" is the term that lands (it is the PDPA's term); "privacy" suits the general viewer.
- Fear without an action backfires (EPPM), so the description adds one product-neutral action line.
- YouTube: titles up to 100 characters (30–50 do best in studies), up to three hashtags show by the title, tags play a
  minimal role. #shorts is not required for classification but does no harm.

### Film (16:9, 1:28): titles for YouTube's A/B test (desktop Studio, up to three)

1. `Dot | A short film about what leaves when you press Send` (my pick to lead, with `thumb-1-eyes.png`)
2. `Are you sure you're watching me? | Dot (Short Film)` (your original line, kept as a test)
3. `You pressed Send. Dot never came back. (Short Film)`

Description (paste as is; the first two lines are what people see before "more"):

```
A 1:28 short film about the personal data that leaves every time we press Send. No product demo, no sales pitch.
Free to show in team meetings and staff awareness sessions: share the link or embed it (please don't re-upload or edit). English captions included.

This is Dot. Every little dot of you: your name, your birthday, your number, the things you only ever told it. One press of Send, and it's gone. Copied, and copied again.

Before you press Send, take one second. Names, birthdays, numbers, files: do they need to go?

0:00 Are you watching me?
0:28 You pressed Send
0:57 I would have stayed with you
1:13 There are more of us

Vertical version (0:47): <paste the Short's link here>

Made by Vantward Solutions Pte. Ltd., Singapore: https://eraseai.ai/?utm_source=youtube&utm_medium=video&utm_campaign=dot
Voice and music are synthetic (generated with ElevenLabs). Animated short film; no real people or real data.

#ShortFilm #PersonalData #DataPrivacy #AnimatedShortFilm #Privacy #OnlineSafety
```

Tags: short film, animated short film, personal data, data privacy, data protection, what happens to my data, think
before you send, digital footprint, online privacy, staff awareness video, PDPA, Dot short film.

Captions: upload `files/dot-film.en.srt` (Studio > Subtitles > English > Upload file > With timing).

### Short (9:16, 0:47)

Title: `You let me go when you pressed Send. | Dot (Short Film) #shorts`

Description:

```
A 47-second short film about the personal data that leaves every time we press Send. No product demo, no sales pitch.
Full film (1:28): <paste the film's link here>

Before you press Send, take one second.

Made by Vantward Solutions Pte. Ltd., Singapore: https://eraseai.ai/?utm_source=youtube&utm_medium=shorts&utm_campaign=dot
Voice and music are synthetic (generated with ElevenLabs).

#ShortFilm #PersonalData #DataPrivacy #shorts
```

Tags: same as the film. Captions: `files/dot-short.en.srt`. Cover: pick the frame where the eyes first open (in the YouTube
app; Studio cannot set a Short's cover); use `files/thumb-short-1080x1920.png` as the cover on Reels, TikTok and LinkedIn.

Pinned comment (both): `If your data could talk, what would it say to you? I'm reading every reply.`

Words kept out on purpose: AI, ChatGPT, EraseAI, security, cybersecurity, breach, hackers, protect, shocking,
terrifying, must watch, viral, "watch till the end".

## Before you publish

1. Watch both videos once with headphones. Dot's voice is ElevenLabs "Zelda - Sad and Sobbing" on the v3 model, with
   emotion directions (whispering, voice breaking, sobbing) in `build/lines-performance.json`; the spoken words are
   checked against the approved script, and every line was transcribed back and matched word for word. I cannot hear
   it: if a line's emotion is off, change its [direction] and regenerate that line only; the film re-times itself.
   The earlier Will version is kept in `audio/voice/` (and River/Brian samples in `audio/samples/`).
2. Your ElevenLabs plan is Starter: check it covers commercial use of generated voice and music on YouTube.
3. YouTube Studio: "Altered or synthetic content": this is clearly animated, so the realistic-content label should not
   be required; the description already says the voice and music are synthetic. Audience: not made for kids.
4. The description has no product claims on purpose. Do not add any in replies either ("never leak", "AI detection",
   "no retention" are out).

## Rebuild

From `marketing-assets/youtube/dot/build`. Needs Chromium at /opt/pw-browsers/chromium, ffmpeg, the Inter font, and
`pnpm install` run at the repo root (it provides `playwright-core` and the `three` package in `artifacts/landing-video`).
Voice IDs: Zelda `wcIrsZmi758yTtAxuW4l` (used, model eleven_v3), Will `bIHbv24MWmeRgasZH58o`, River `SAz9YHcvj6GT2YYXdXww`, Brian `nPczCjzI2devNBz1zQrb`.

```
LINES=lines-performance.json MODEL=eleven_v3 node voice.mjs wcIrsZmi758yTtAxuW4l ../audio/voice-zelda   # key from the session proxy, or ELEVENLABS_API_KEY
python3 logo_cutout.py ../../../../artifacts/eraseai/public/brand/eraseai-icon-512.png logo-shield.png   # end-card shield, no background
./music.sh                                              # writes ../audio/music.mp3
node timeline.mjs ../audio/voice-zelda film > timeline-film.json
node timeline.mjs ../audio/voice-zelda short > timeline-short.json
node render.mjs timeline-film.json 1920 1080 /tmp/film-video.mp4
node render.mjs timeline-short.json 1080 1920 /tmp/short-video.mp4
node compose.mjs timeline-film.json /tmp/film-video.mp4 ../audio/voice-zelda ../audio/music.mp3 ../files/dot-film-1920x1080.mp4
node compose.mjs timeline-short.json /tmp/short-video.mp4 ../audio/voice-zelda ../audio/music.mp3 ../files/dot-short-1080x1920.mp4
node thumbs.mjs ../files
node --test timeline.test.mjs
```
