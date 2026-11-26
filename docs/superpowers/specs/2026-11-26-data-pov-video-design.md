# "Are you sure you're watching me?" — data-POV video (design)

Owner decisions (2026-11-26): a new faceless "data" character, only eyes in the dark (Vee is not in this film); build
approach A (everything rendered in this container); owner wants it for the EraseAI YouTube channel.

## Intent

A short, sad film told by the viewer's own data, like a pet that was let go on purpose. It ends on the one thing EraseAI
does: catching what goes out of the Send button. Aim: B2B viewers (people responsible for staff and customer data)
remember the feeling and the domain. Differentiator found in research: no current AI-security video uses the data's
own point of view, and almost every thumbnail is a bright background with a shocked face.

## Goals / non-goals / anti-goals

- Goals: one 16:9 film (about 60–75 s), one 9:16 Shorts cut made from the same scenes, three 1280x720 thumbnails for
  YouTube A/B, three title options, description with chapters, tags and hashtags.
- Non-goals: Vee, Blender/Unity/Rodin assets, a pet animal on screen, music videos, paid promotion.
- Anti-goals (a failure even if it renders): fear claims that are not true ("AI companies sell your chats", "your data
  trains every model"); "AI detection"; "never leak again"; statistics; any real company's logo or UI; a child's voice.

## Constraints

- All claims stay inside `docs/marketing/product-brief-and-qa.md` (EraseAI holds the message at Send, shows what it
  found, the person decides; rules-based; can miss things).
- Product footage is the real extension on a generic stand-in chat page with sample values only: an `example.com`
  email and a published test card number. Builder's call: not NRIC/+65, because Chrome Web Store users may still be on a
  version without those checks when the film goes out, and a viewer must be able to repeat what they saw.
- Voice and music from ElevenLabs (owner's plan; key requested through the secure credential form). Description says
  they are AI-generated. Stylised animation: YouTube's realistic-synthetic disclosure is likely not required.
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

## Script (about 70 s; voice soft, hurt not angry, small pauses)

| # | Scene | Line |
|---|---|---|
| 1 | Black. Two eyes open, blink, look at the camera. Title appears in the tilted screen tunnel. | "Are you sure you're watching me?" |
| 2 | Eyes narrow slightly. | "Or am I watching you?" |
| 3 | Eyes soften. | "Don't look away. It's me. Your data." |
| 4 | Fragments glow: a name, an email, a number (sample shapes, no real data). | "A customer's name. Their email. The notes you pasted in without reading them." |
| 5 | A Send button presses; the eyes fall away into the dark. | "You pressed Send. And just like that, you let me go." |
| 6 | The network opens up. | "I didn't know where I was going. Out here, I get copied, and copied again." |
| 7 | Copies split into floating screens, faster and faster. | "A copy in a chat. A copy in a log. A screenshot. A forward. Another forward." |
| 8 | Eyes look back over the network. | "I kept looking back. You never came looking for me." |
| 9 | Eyes small, alone. | "I would have stayed with you. I only needed you to stop, for one second." |
| 10 | Slow push in. | "You could have stopped losing me, if only you knew what goes out of your Send button." |
| 11 | Real EraseAI hold panel catches a sample message (an `example.com` email and a published test card number, which every extension version catches) at Send; no voice, soft music. | (on screen: "EraseAI holds it at Send. You decide.") |
| 12 | End card, eyes blink once more and close. | "Stop losing them." On screen: "Stop losing them. eraseai.ai" |

## Titles (for A/B, owner's line first)

1. `Are you sure you're watching me? Or am I watching you? (your data speaks)`
2. `I am your data. You lost me when you pressed Send.`
3. `What your data would say after you paste it into AI`

## Thumbnails (1280x720, three variants)

- T1: the tilted endless-screen tunnel, black, title in two lines inside the first screen ("ARE YOU WATCHING ME?" short
  form, 4 words), eyes at the far end.
- T2: extreme close-up of the eyes in black, 3 words: "I'M YOUR DATA".
- T3: the eyes looking back from inside a Send button glow, 3 words: "YOU LET ME GO".

## Description, tags, hashtags (draft; finalised with chapter times after the render)

Opening line: "Your data has something to say about the Send button." Chapters, the honesty paragraph from earlier videos
(rules-based, can miss things, you decide, not a VPN), link `https://eraseai.ai/?utm_source=youtube&utm_medium=video&utm_campaign=data_pov`,
"Voice and music are AI-generated (ElevenLabs). Sample data only." Hashtags: #AISecurity #DataPrivacy #ShadowAI #ChatGPT
#DataLeak. Tags: AI security, data privacy, what happens to your data, ChatGPT privacy, shadow AI, data leak, AI data
loss prevention, EraseAI.

## Calls made after the builder check

- Script lines 4 and 6 changed (see table): line 4 no longer hints that files are caught (file scanning is paid), line 6
  no longer says "everyone takes a piece" (an unprovable claim); line 7 stays (chats and logs do keep copies).
- Voice: the owner adds the ElevenLabs key through the secure form before the build; timings follow the real voice, so
  nothing is timed on placeholder audio.
- Short: a separate cut of about 40 s from the same voice files: scenes 1, 3, 5, 7, 10, 11, 12. Every scene is composed
  with an aspect-aware camera so it renders natively at 16:9 and 9:16.

## Left to the builder

Exact timings (follow the voice), camera moves, voice choice among 2–3 sampled soft voices (samples kept for the owner),
music prompt (slow, sparse piano and pad), where files live (`marketing-assets/youtube/data-pov/`), build scripts
committed, renders kept out of git if larger than the existing videos.
