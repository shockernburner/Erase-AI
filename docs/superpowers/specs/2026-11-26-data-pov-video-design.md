# "Are you sure you're watching me?" — data-POV video (design)

Owner decisions (2026-11-26): a new faceless "data" character, only eyes in the dark (Vee is not in this film); build
approach A (everything rendered in this container); owner wants it for the EraseAI YouTube channel.

## Intent

A short, sad film told by the viewer's own data, like a pet that was let go on purpose. It ends on a question about the Send button;
only the end card shows the EraseAI logo and URL. Aim: B2B viewers (people responsible for staff and customer data)
remember the feeling and the domain. Differentiator found in research: no current AI-security video uses the data's
own point of view, and almost every thumbnail is a bright background with a shocked face.

## Goals / non-goals / anti-goals

- Goals: one 16:9 film (about 60–75 s), one 9:16 Shorts cut made from the same scenes, three 1280x720 thumbnails for
  YouTube A/B, three title options, description with chapters, tags and hashtags.
- Non-goals: Vee, Blender/Unity/Rodin assets, a pet animal on screen, music videos, paid promotion.
- Anti-goals (a failure even if it renders): fear claims that are not true ("AI companies sell your chats", "your data
  trains every model"); "AI detection"; "never leak again"; statistics; any real company's logo or UI; a child's voice.

## Constraints

- No product claims in the film (no product shown, no "AI", no EraseAI until the end card). Nothing in the voice or
  description may contradict `docs/marketing/product-brief-and-qa.md`.
- Voice and music from ElevenLabs (owner's plan; key requested through the secure credential form). Description says
  they are synthetic. Stylised animation: YouTube's realistic-synthetic disclosure is likely not required.
- End card uses the real EraseAI logo from the repo (no redrawn logo).
- Tools available here: Chromium (WebGL via three.js, vendored locally, no CDN at render time), ffmpeg, Node, Python.

## Approaches considered

- **A. Everything here (chosen):** three.js scenes rendered frame by frame in headless Chromium, composited with ffmpeg.
  Fast iteration, every frame reviewable; look is graphic rather than photoreal.
- B. Blender on the owner's Mac: richest light, but hours per render and each change repeats it.
- C. A now, Blender tunnel shot later: kept as an optional upgrade for the opening shot only.

## The look

Near-black (#05070a) world. The data = two soft, slightly oval eyes (warm white, cyan rim glow) that blink, look at the
camera, look away, lower. Signature shot: a screen tilted in perspective with the title inside it, which contains the
same screen again, receding into endless depth (recursive "screen within a screen"), the eyes at the far end.
Network = thin glowing lines and nodes; copies of the data are small cyan fragments that split off into other floating
screens. Typography: Inter, lowercase-feeling sentence case on screen, white at 90%. Captions burned in on the Short.

## Script (approved by the owner 2026-11-26; character "Dot")

Owner decision: no tech words, no "AI", no mention of EraseAI in voice or on-screen text until the end card (logo and
https://eraseai.ai only). Not a pitch: a thought-provoking film; viewers find the creator.

| # | Scene | Line |
|---|---|---|
| 1 | Black. Two eyes open, blink, look at the camera. Title in the tilted endless-screen tunnel. | "Are you sure you're watching me?" |
| 2 | Eyes narrow slightly. | "Or am I watching you?" |
| 3 | Eyes soften. | "Don't look away. It's me. I'm Dot. I was every little dot of you." |
| 4 | Soft glowing fragments drift around the eyes (abstract, no readable data). | "Your name. Your birthday. Your number. The things you only told me." |
| 5 | A press of Send; the eyes fall away into the dark. | "You pressed Send. And just like that, you let me go." |
| 6 | Dark space with thin light paths. | "I didn't know where I was going. Out here, I get copied, and copied again." |
| 7 | Copies split into floating screens, faster and faster. | "A copy here. A copy there. A screenshot. A forward. Another forward." |
| 8 | Eyes look back over the paths. | "I kept looking back. You never came looking for me." |
| 9 | Eyes small, alone. | "I would have stayed with you. I only needed you to stop, for one second." |
| 10 | Slow push in. | "You could have stopped losing me, if only you knew what goes out every time you press Send." |
| 11 | Eyes look straight at the viewer. | "There are more of us. Every day, you let one go." |
| 12 | Eyes close. End card. | "Will you save the next one?" Card: "Stop losing them." then EraseAI logo and https://eraseai.ai |

Short (about 40 s, 9:16): lines 1, 3, 5, 7, 10, 12 with the same end card.

## Titles (for A/B)

1. `Are you sure you're watching me? Or am I watching you?`
2. `I am your data. You lost me when you pressed Send.`
3. `Your data has a name. You never asked.`

## Thumbnails (1280x720, three variants)

- T1: the tilted endless-screen tunnel, black, title in two lines inside the first screen ("ARE YOU WATCHING ME?" short
  form, 4 words), eyes at the far end.
- T2: extreme close-up of the eyes in black, 2 words: "I'M DOT".
- T3: the eyes looking back from inside a Send button glow, 3 words: "YOU LET ME GO".

## Description, tags, hashtags (draft; final after render)

Short and reflective, no pitch, no "AI" in the text. "Voice and music are synthetic (generated with ElevenLabs)." Link
https://eraseai.ai/?utm_source=youtube&utm_medium=video&utm_campaign=dot. Hashtags: #DataPrivacy #DataProtection
#Privacy #OnlineSafety #YourData. Tags: data privacy, data protection, where does my data go, personal data, online
privacy, digital footprint, short film, Dot.

## Calls made after the builder check

- Voice: the owner adds the ElevenLabs key through the secure form before the build; timings follow the real voice, so
  nothing is timed on placeholder audio.
- Short: a separate cut of about 40 s from the same voice files (lines listed above). Every scene is composed
  with an aspect-aware camera so it renders natively at 16:9 and 9:16.

## Left to the builder

Exact timings (follow the voice), camera moves, voice choice among 2–3 sampled soft voices (samples kept for the owner),
music prompt (slow, sparse piano and pad), where files live (`marketing-assets/youtube/data-pov/`), build scripts
committed, renders kept out of git if larger than the existing videos.

## Revision 2 (owner feedback, 2026-11-27)

- Opening: Dot's eyes alone on black; no tunnel, frames or title text in the film (the tunnel stays only in thumbnail 1).
- Every blink: while the eyes are closed the whole screen is black, then they open again.
- Network: a 3D field of glass nodes (ring and core, depth-of-field bokeh), thin 3D links, travelled through; Dot's
  copies appear inside the bubbles. No flat screens.
- Voice: ElevenLabs "Zelda - Sad and Sobbing" on eleven_v3 with emotion directions; told as a lost friend, not narrated.
  Spoken words unchanged (guarded against lines.json; transcribed back and matched).
- End card logo: the shield cut out of the app-icon tile (no white corners, no navy square).
