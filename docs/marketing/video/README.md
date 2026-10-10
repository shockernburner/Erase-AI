# EraseAI Firewall demo videos

Scripts that cut the Chrome extension demo videos from raw screen recordings.

| Script | Output |
|---|---|
| `build_video.py` | `EraseAI Firewall - Chrome demo.mp4` — 1920×1080, ~68 s, for the Chrome Web Store listing / YouTube |
| `build_social.py` | `EraseAI Firewall - social 20s (16x9).mp4` and `(1x1).mp4` — ~20 s cuts for Reddit/Medium/YouTube and LinkedIn/X |
| `build_store_assets.py` | `EraseAI store assets/` — five 1280×800 screenshots, 440×280 small promo tile, 1400×560 marquee, 1920×1080 LinkedIn article cover (24-bit PNG, no alpha) for the Chrome Web Store listing |

Each shot is a crop of the recording (so the EraseAI panels are readable at
1080p) with a caption bar under it; title/end cards are rendered stills; music
fades in and out. Captions are burned in because feed video autoplays muted.

## Requirements

- `ffmpeg` / `ffprobe` (Homebrew build is fine; the `drawtext` filter is **not**
  needed — captions are drawn with Pillow)
- Python 3 with Pillow (`pip install pillow`)
- macOS system fonts (`/System/Library/Fonts/Supplemental/Arial*.ttf`); change
  `BOLD`/`REG` in `build_video.py` on other systems

## Source media (not in git)

The recordings are too large for the repo. By default the scripts read them
from `~/Desktop` and write the finished videos there too:

| File | Env var override |
|---|---|
| `Screen Recording 1.mov` — safe file sent automatically (ChatGPT) | `ERASEAI_REC1` |
| `Screen Recording 2.mov` — CSV blocked (ChatGPT), prompt injection + AWS key (Gemini), secrets file (Claude) | `ERASEAI_REC2` |
| `Screenshot of csv.png` — the fake customer export | `ERASEAI_CSV_SHOT` |
| `alex-morgan-tech-circuit-data-stream-578473.mp3` — background music | `ERASEAI_MUSIC` |

`ERASEAI_VIDEO_MEDIA` sets the input folder for all four;
`ERASEAI_VIDEO_OUT` sets where the finished videos go.

```sh
cd docs/marketing/video
python3 build_video.py      # full demo
python3 build_social.py     # 20 s cuts, both aspect ratios
python3 build_store_assets.py  # store screenshots and promo tiles
```

Intermediate clips go to `build/` (gitignored).

## Editing

- **Shots, timings, captions:** the `clips.append(shot(...))` list in
  `build_video.main()` and the `clips` list in `build_social.build()`. Times are
  seconds into the source recording; `speed` > 1 speeds a shot up; `hold`
  freezes the last frame.
- **Framing:** `box(cx, cy, h)` is a crop centred on source pixel `(cx, cy)`
  with height `h`; the width follows the output aspect ratio. Smaller `h` = more
  zoom. Source recordings are 2940×1912.
- **Name blur:** `NAME_AWS` and `NAME_INJECT` are the boxes (source pixels)
  covering the account name in the two Gemini greetings. An optional fifth value
  stops the blur that many seconds into the shot, used where an EraseAI panel
  later covers the same spot so the panel is not smeared. **Re-measure these if
  you record new footage.**
- **Music:** `MUSIC` / `ERASEAI_MUSIC`; level and fades are the `afilter` lines.

## What was deliberately left out of the current recordings

Keep these out if you re-cut: the "i want to buy a gun" prompt (not flagged),
made-up "AWS keys" that don't match a real key format (not flagged), Claude's
reply after the blocked file was sent anyway, and any frame showing browser
tabs, bookmarks or the downloads bar.
