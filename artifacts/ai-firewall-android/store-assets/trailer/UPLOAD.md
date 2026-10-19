# Google Play trailer: upload sheet

File: `eraseai-play-trailer-1920x1080-37s.mp4` (1080p, 30 fps, H.264 + AAC, 37 s, bilingual EN / 繁體中文 captions burned in).
Thumbnail: `eraseai-play-trailer-thumbnail.jpg`.

Google Play shows a trailer muted and autoplaying; sound plays when someone taps it. The file therefore carries an audio track
(ambient bed and UI sounds, no voice-over) but nothing depends on hearing it: every message is on screen in English and Chinese.

## 1. YouTube (Studio, channel "EraseAI Firewall")

- Visibility: **Public** or **Unlisted** (Play accepts both; not Private).
- Audience: **Not made for kids**. Do **not** age-restrict.
- **Monetization: Off.** Ads before a Play trailer are not allowed.
- Category: Science & Technology. Language: English.
- Title (max 100): `EraseAI Firewall for Android | 使用 AI，同時保護資料`

Description:

```
Use AI. Keep your data. / 使用 AI，同時保護資料

EraseAI Firewall for Android checks what you are about to send to ChatGPT, Claude, Gemini and the other AI apps you choose. If it finds an API key, password or personal data, it holds the message and lets you decide: Cancel, Sanitize & Send, or Send Anyway.

EraseAI Firewall 在你傳送訊息到 ChatGPT、Claude、Gemini 等你選擇的 AI 應用程式之前先作檢查。若發現 API 金鑰、密碼或個人資料，會先攔住訊息，由你決定：取消、淨化後傳送，或仍然傳送。

Free trial: 7 days or 25 messages, no account needed to start. / 免費試用：7 日或 25 則訊息，毋須註冊即可開始。
Not a VPN. It only watches the apps you choose. / 不是 VPN，只監察你選擇的應用程式。

Google Play: https://play.google.com/store/apps/details?id=com.eraseai.firewall
Website: https://eraseai.ai
Privacy: https://eraseai.ai/privacy

The key in this video is AWS's public example key (AKIAIOSFODNN7EXAMPLE) and the address uses example.com. Neither is real.
影片中的金鑰是 AWS 公開的示範金鑰，電郵地址使用 example.com，兩者都不是真實資料。

EraseAI is made by Vantward Solutions Pte. Ltd., Singapore.
```

Tags: EraseAI, EraseAI Firewall, AI firewall, ChatGPT privacy, data leak prevention, prompt security, Android app, 私隱, 資料外洩

## 2. Play Console

1. Open the app, then **Grow users** → **Store presence** → **Main store listing**.
2. **Graphics** → **Promo video**: paste the YouTube URL.
3. Save, then **Send for review**.

If you also keep a Hong Kong listing (custom store listing), the same video works there: the captions are bilingual.

## What the video shows, and where each screen comes from

| Scene | Source in this repo |
|---|---|
| Protected Apps list, Home | `MainActivity.kt` (`ProtectedAppsScreen`, Dashboard), `ui/Components.kt`, `ui/theme/*` |
| Free trial card: 7 days, 25 messages | `gradle.properties` (`freeDays=7`, `freeSends=25`), `GuestTrial.kt` |
| "EraseAI blocked send · tap to review" strip | `guard/SendCurtain.kt` |
| Send gate card and its three buttons | `guard/AiGuardAccessibilityService.kt` (`showGateOverlay`) |
| Findings list and the sanitized text | `guard/LocalRiskScanner.kt`, ported in `build/scanner_port.mjs` and run on the demo prompt |

The chat window is a generic "AI assistant", not a copy of any other company's app.

## Rebuild

```
FONTS_HK=<@fontsource/noto-sans-hk/package> FONTS_ROBOTO=<@fontsource/roboto/package> \
  node build/render_trailer.mjs timeline > tl.json
python3 build/make_audio.py tl.json audio.wav
FONTS_HK=... FONTS_ROBOTO=... node build/render_trailer.mjs video silent.mp4
ffmpeg -i silent.mp4 -i audio.m4a -c:v copy -c:a copy -shortest eraseai-play-trailer-1920x1080-37s.mp4
```
(`audio.m4a`: `ffmpeg -i audio.wav -af "acompressor=threshold=-22dB:ratio=3:attack=8:release=160:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k audio.m4a`)

## Phone screenshots (Play Console → Main store listing → Phone screenshots)

`../play-screenshots/` holds six 1080x1920 screenshots in two sets, `-en` and `-zh-HK`, in this order:
01 choose apps · 02 protection on · 03 checks before send · 04 you decide · 05 safe text · 06 enable accessibility.

- Upload the `-en` set to the default (English) listing and the `-zh-HK` set to a Chinese (Hong Kong) custom listing or translation.
- The captions are translated; the phone UI is the app's own text, which is English-only today.
- Google Play wants 2 to 8 phone screenshots, 16:9 or 9:16, each side 320 to 3840 px.
- `build/render_screens.mjs` regenerates them from the same page as the trailer.
