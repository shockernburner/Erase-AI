# YouTube pack: two videos to test (2026-11-22)

Files are in `files/` (the final videos, with narration and music) and `audio/`. Rebuild with `build/` (see the end). No video here promises or can promise "viral": these are built to be tested, with two thumbnails to A/B.

## What I took from the advice you pasted, and what I left out

Used:
- A hook that names the moment ("You are about to paste customer data into an AI chat"), and a solution shown on screen, not described.
- Title, thumbnail and first seconds that say the same thing (the message alignment point).
- "Not a VPN" stated plainly (it matches your rule and answers a real confusion).
- A how-to/checklist format ("5 questions to ask any vendor"), which is the shareable part for a B2B audience.

Left out, on purpose:
- Fear titles with absolute claims ("Never leak data again", "Game-changer", "Which is actually safe?").
- The "100,000 ChatGPT conversations on Google" story. Those were chats people had chosen to share publicly, it is not a leak EraseAI prevents, and the number is unconfirmed.
- Statistics worded as "leaks". The only statistic used is Harmonic Security's, worded as a vendor study of sensitive items (see video 2, card 2). Confirm it on their page before you publish, as noted in the deck checklist.
- Any look-alike of another company's chat product. The footage is the real EraseAI extension on a generic "AI assistant" stand-in page.

Because you now sell to companies, both videos aim at someone responsible for staff and customer data, not at curious consumers.

## Video 1: "The paste test" (36 seconds)

Files: `eraseai-paste-test-1920x1080.mp4` (YouTube) and `eraseai-paste-test-vertical-1080x1920.mp4` (Shorts, also usable on LinkedIn and Reels).
What it shows, all real extension footage with sample values (an example.com address and a published test card number): type the message, press Send, the hold with what it found, the three choices, Sanitize & Send on a paid plan, and the sanitized message that goes through.

Title options (pick one, test the others later):
1. `What happens when you paste customer data into an AI chat? (30-second test)`
2. `I tested pasting a customer's card number into an AI chat. Here is what stopped it.`
3. `Stop. Before you hit Send in an AI chat.`

Option 1 is my pick: it is a question the viewer already half-asks, and it says what you will see.

Description:

```
A 30-second test: what happens when you are about to paste a customer's name, email, card number and phone number into an AI chat.

This is the real EraseAI Firewall Chrome extension on a generic stand-in chat page. All values are samples (an example.com email address and a published test card number). Nothing here is real customer data.

What you see:
- The message is held before it is sent, with what was found.
- You choose: Cancel, Sanitize & Send, or Send Anyway.
- On paid plans, Sanitize & Send swaps the sensitive values for labels, and the AI only sees the sanitized message.

How it works: the check runs on your device by default, with no proxy in the middle. It is not a VPN. It uses rules (patterns and validators such as the card-number checksum), so it can miss things and flag harmless text. You always decide.

Try it free on Chrome (the Android app has a free trial): https://eraseai.ai/ai-firewall?utm_source=youtube&utm_medium=video&utm_campaign=paste_test
For teams: a free 30-day pilot for up to 10 people. Write to director@vantward.com

Narration and music are AI-generated (ElevenLabs). Vee is the Vantward mascot.
Made by Vantward Solutions Pte. Ltd., Singapore.
#AISecurity #DataLeakPrevention #ShadowAI #ChatGPT #PromptSecurity
```

Tags: AI security, data leak prevention, ChatGPT data leak, shadow AI, prompt security, AI firewall, PII protection, EraseAI.

Pinned comment: `Everything in this video uses sample data (an example.com email and a published test card number). The checks are rules, so they can miss things and sometimes flag harmless text; you always choose. If you try it, tell me what it got wrong.`

## Video 2: "3 ways to stop staff pasting customer data into AI" (1 minute 42 seconds)

File: `eraseai-3-ways-to-stop-staff-pasting-customer-data.mp4`.
It compares policy and training, network tools and gateways, and a check at the Send button, with what each is good and weak at, shows option 3 in action, gives five questions to ask any vendor, and ends with the offer. It is deliberately fair to the other options: that is what makes it believable and shareable.

Title options:
1. `3 ways to stop staff pasting customer data into AI (an honest comparison)`
2. `5 questions to ask before you buy any AI data-leak tool`
3. `Your staff are pasting customer data into AI chats. Now what?`

Pick 1 first; use 2 as the title of a later cut of the last 20 seconds.

Description:

```
Staff paste customer data into AI chats because they are fast, not careless. There are three ways to stop it, and each is good and weak at different things:

0:00 The problem
0:08 Why it happens
0:23 Option 1: policy and training
0:34 Option 2: network tools and gateways
0:48 Option 3: a check at the Send button
0:59 Option 3 in action (the real extension, sample data)
1:09 Five questions to ask any vendor
1:26 The honest answer: most companies need a mix
1:35 Try it

Statistic: one vendor's analysis of about 22 million enterprise AI prompts in 2025 found 579,113 sensitive items; ChatGPT accounted for 71.2% of them. Source: Harmonic Security, 2025 (a vendor study): https://harmonic.security/resources/what-22-million-enterprise-ai-prompts-reveal-about-shadow-ai-in-2025

I build EraseAI Firewall, a check at the Send button. It runs on your device by default, with no proxy in the middle, and it is not a VPN. It uses rules, so it can miss things and flag harmless text; a person always decides. On paid plans it also reads attached files and offers Sanitize & Send.

Try it free on Chrome: https://eraseai.ai/ai-firewall?utm_source=youtube&utm_medium=video&utm_campaign=three_ways
For teams: a free 30-day pilot for up to 10 people. director@vantward.com

Narration and music are AI-generated (ElevenLabs). Vee is the Vantward mascot.
Made by Vantward Solutions Pte. Ltd., Singapore.
#AISecurity #ShadowAI #DataLossPrevention #AIGovernance #CyberSecurity
```

Tags: AI security, shadow AI, data loss prevention, AI governance, ChatGPT data leak, prompt security, how to stop data leaks, EraseAI.

Pinned comment: `Which of the five questions do your current tools fail? I am collecting answers, and I will reply to every one.`

## Narration and music (already in the videos)

Made with your ElevenLabs plan: voice "Eric - Smooth, Trustworthy" (a library voice, model Multilingual v2) and one 110-second instrumental track from the ElevenLabs music API, ducked under the voice and normalised to -16 LUFS.
- The narration says "we", not "I", on purpose: it is a synthetic voice, not you. The exact lines are in `audio/narration-lines.json`; the audio files are in `audio/narration-eric/`.
- Two other voices were sampled on the first lines so you can compare: `audio/voice-samples/` (Daniel, a steady British broadcaster; Alice, a clear British educator). If you prefer one, regenerate the lines with `build/generate_voice.py` and rebuild (see the end).
- The music bed is `audio/music-bed-110s.mp3` if you want to reuse it. Video 1 uses its opening 36 seconds.
- If you would rather record your own voice, read the lines in `narration-lines.json` (change "we" to "I" where you like) and replace the audio in any video editor.

## Vee, the presenter

Vee is the small robot from vantward.com. He appears in every video: big on the left of each card and next to the footage, with a mood that fits the moment (worried on the hook, wide-eyed when the extension catches the data, happy on Sanitize, delighted on the offer). His mouth moves with the narration (it follows the loudness of the voice, frame by frame), and he floats, blinks and glows like on the site.
- He is not a copy: `build/vee_stage.mjs` renders the real Vee markup and styles taken from the live site (`build/vee_source.html` is a saved copy of https://vantward.com, which is served from the repo `shockernburner/vantward-site`).
- The vertical cut puts him at the bottom, next to the "On your device by default. Not a VPN." line.
- Thumbnails with Vee: `thumbnail-v1_c.png` (worried: "STOP. Before you hit Send."), `thumbnail-v1_d.png` (wow: "HELD before sending"), `thumbnail-v2_vee.png` (video 2). The earlier panel-only thumbnails are still there for A/B testing: a face against no face is a good test.
- The description of each video says that Vee is Vantward's mascot, so nobody mistakes him for a person.

## Thumbnails (1280x720)

- `thumbnail-v1_a.png`: "STOP. Before you hit Send." with the real hold panel, red border.
- `thumbnail-v1_b.png`: "HELD before sending" with the three choices, cyan border.
- `thumbnail-v2.png`: "3 ways to stop staff pasting customer data into AI".
Use YouTube's "Test and compare" on video 1 with up to three of: a, b, c (Vee worried) and d (Vee wow). My pick to try first: c against a. They use real frames, so they match what the viewer then sees.

## Before you publish

1. Listen to both videos once with headphones (I could check levels, timing and gaps, but not how the voice sounds to you). If the voice is not right, swap it as described above.
1b. Check that your ElevenLabs plan covers commercial use of generated voice and music, and answer YouTube's "altered or synthetic content" question in Studio as it asks. The description already says the narration and music are AI-generated.
2. The Harmonic statistic: open the page linked in the video 2 description and confirm 22 million, 579,113 and 71.2% match.
3. YouTube settings: not made for kids. The footage is real software with sample data, and the description says so.
4. Check the free claims in the description are still true on your pages (free Chrome checks, Android trial).
5. Do not say "no retention" in comments or replies until the storage fix is deployed and the old rows are cleaned.
6. Reply to every comment in the first two hours.

## What I noticed while filming (product, not video)

In the footage the sanitized email appears as `jord**************.com`: Sanitize & Send keeps the first four and last four characters of a masked value, while card and phone become whole labels. It is real behaviour, so I left it in. It would be a stronger product, and a cleaner video, if sanitized values used whole labels such as `[EMAIL_REDACTED]`, the way scan history now does. That is a separate change (the extension's local scanner is generated from the server rules, so it needs the server rule changed and the extension rebuilt).

## Rebuild

```
node build/capture_typed.mjs <work>/cap      # real extension footage + timeline.json
ffmpeg -f concat -safe 0 -i <work>/cap/frames.txt -vf "fps=30,scale=1920:1080,format=yuv420p" <work>/cap/raw.mp4
node build/build_videos.mjs <work> <outDir>
```

To add narration and music, generate them first (see the scripts' headers), then pass the folder:

```
cd <voiceDir> && cp <repo>/marketing-assets/youtube/audio/narration-lines.json lines.json
python3 <repo>/marketing-assets/youtube/build/generate_voice.py cjVigY5qzO86Huf0OWal eric       # writes eric_<line>.mp3
mkdir music && (cd music && python3 <repo>/marketing-assets/youtube/build/generate_music.py)       # writes music/bed.mp3
VOICE_DIR=<voiceDir> node build/build_videos.mjs <work> <outDir>                                   # card lengths follow the narration; Vee is rendered and composited (a few minutes)
node build/make_thumbs_vee.mjs <veeMoodDir> <frame.png> <outDir>                                   # thumbnails with Vee (moods from: node build/vee_stage.mjs build/vee_source.html <veeMoodDir> sheet - 640)
```

Without `VOICE_DIR` the script builds the silent version with a quiet placeholder bed.
Needs Chromium at /opt/pw-browsers/chromium, ffmpeg, and the Inter font.
