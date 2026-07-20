---
name: Headless brand-asset rendering
description: Gotchas rendering SVG/PNG/PDF brand assets with nix chromium + imagemagick in this workspace
---

- Chromium headless `--screenshot` ignores tiny `--window-size` values (≤~64px come out blank/clipped). Render at 512+ via an HTML wrapper (`<img style="width:Npx">`, `--default-background-color=00000000` for transparency) and downscale with `magick -resize`.
- Screenshotting an SVG file directly does NOT scale it to the viewport — the SVG's own width/height attrs win. Always use the img-wrapper HTML.
- `magick file.pdf[n]` fails (no ghostscript); use `pdftoppm -png` (poppler is present) to rasterize PDF pages for visual checks.
- Distributable SVG logos must not use `<text>` + Google Fonts `@import` (code review rejects: non-deterministic offline). Outline text: fetch static TTF via `curl fonts.googleapis.com/css2?family=X:wght@700 -A curl` (curl UA → TTF URLs), then opentype.js (`ot.parse(buffer)`, per-glyph `getPath().toPathData()` with manual advance/kerning/letter-spacing).
- `--virtual-time-budget=8000+` needed so web fonts load before screenshot/PDF.
