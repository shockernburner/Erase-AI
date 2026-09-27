"""Chrome Web Store listing images for EraseAI Firewall.

Outputs (24-bit PNG, no alpha, as the store requires) into
"<ERASEAI_VIDEO_OUT>/EraseAI store assets/":
  screenshot-1..5.png   1280x800
  promo-small.png       440x280
  promo-marquee.png     1400x560

Screenshots put a headline and three points on the left and a tall crop of the
real EraseAI panel on the right, so the panel text stays readable (a full-width
crop shrinks it to ~15px).
"""
import os
import subprocess
from PIL import Image, ImageDraw

import build_video as bv

OUT = os.path.join(bv.OUTDIR, "EraseAI store assets")
FRAMES = os.path.join(bv.HERE, "build", "store_frames")

GREEN = (74, 222, 128)
PURPLE = (167, 139, 250)

# (file, source, seconds, crop box in source px (x, y, w, h), headline, points)
SCREENSHOTS = [
    ("screenshot-1.png", "REC2", 108.0, (865, 235, 1210, 1100),
     "Stop secrets before you hit Send",
     ["A customer export: 39 issues, blocked",
      "Emails, phones, IDs, card numbers",
      "Checked before it reaches ChatGPT"]),
    ("screenshot-2.png", "REC2", 259.6, (777, 400, 1386, 1260),
     "Redact in one click",
     ["Sanitize & Send masks the value",
      "AKIAIOSFODNN7EXAMPLE → AKIA…MPLE",
      "The AI only ever sees the mask"]),
    ("screenshot-3.png", "REC2", 296.8, (865, 240, 1210, 1100),
     "Scans the files you attach",
     ["PDF, Word, Excel, slides and images",
      "Keys, tokens, private keys, DB URLs",
      "18 secrets caught in one file (Claude)"]),
    ("screenshot-4.png", "REC2", 156.5, (865, 240, 1210, 1100),
     "Catches prompt injection too",
     ["Injection and jailbreak patterns",
      "Found before the AI reads the file",
      "Works in Gemini, ChatGPT and Claude"]),
    ("screenshot-5.png", "REC1", 14.2, (920, 490, 1100, 1000),
     "Clean prompts go straight through",
     ["No extra click when nothing is found",
      "Cancel, sanitize or send: you decide",
      "Free on the Chrome Web Store"]),
]


def frame(src_key, seconds):
    os.makedirs(FRAMES, exist_ok=True)
    src = bv.REC1 if src_key == "REC1" else bv.REC2
    path = os.path.join(FRAMES, f"{src_key}_{seconds}.png")
    if not os.path.exists(path):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(seconds), "-i", src,
                        "-frames:v", "1", path], check=True)
    return Image.open(path).convert("RGB")


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def brand(im, draw, x, y, icon_size, text_size):
    icon = Image.open(bv.ICON).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
    im.paste(icon, (x, y), icon)
    draw.text((x + icon_size + 14, y + (icon_size - text_size) // 2 - 2), "EraseAI Firewall",
              font=bv.font(bv.BOLD, text_size), fill="white")


def screenshot(name, src_key, seconds, crop, headline, points):
    W, H, LEFT = 1280, 800, 420
    im = Image.new("RGB", (W, H), bv.BG)
    d = ImageDraw.Draw(im)

    x, y, cw, ch = crop
    shot = frame(src_key, seconds).crop((x, y, x + cw, y + ch))
    rw = W - LEFT
    shot = shot.resize((rw, round(ch * rw / cw)), Image.LANCZOS)
    if shot.height > H:
        top = (shot.height - H) // 2
        shot = shot.crop((0, top, rw, top + H))
    im.paste(shot, (LEFT, (H - shot.height) // 2))
    for i in range(4):  # accent divider
        d.line([(LEFT - 4 + i, 0), (LEFT - 4 + i, H)],
               fill=bv.ACCENT_A if i < 2 else bv.ACCENT_B)

    brand(im, d, 40, 48, 40, 24)
    hfont = bv.font(bv.BOLD, 42)
    yy = 150
    for line in wrap(d, headline, hfont, LEFT - 80):
        d.text((40, yy), line, font=hfont, fill="white")
        yy += 52
    yy += 34
    pfont = bv.font(bv.REG, 21)
    for point in points:
        d.ellipse([40, yy + 8, 50, yy + 18], fill=GREEN)
        for j, line in enumerate(wrap(d, point, pfont, LEFT - 110)):
            d.text((66, yy + j * 28), line, font=pfont, fill=(226, 232, 240))
        yy += 28 * len(wrap(d, point, pfont, LEFT - 110)) + 22

    im.save(os.path.join(OUT, name))


def promo_small():
    W, H = 440, 280
    im = Image.new("RGB", (W, H), bv.BG)
    d = ImageDraw.Draw(im)
    bv.gradient_line(d, H - 5, 5, W)
    icon = Image.open(bv.ICON).convert("RGBA").resize((72, 72), Image.LANCZOS)
    im.paste(icon, ((W - 72) // 2, 34), icon)
    for text, fnt, colour, y in [
        ("EraseAI Firewall", bv.font(bv.BOLD, 34), "white", 124),
        ("Stop secrets reaching AI", bv.font(bv.BOLD, 22), PURPLE, 174),
        ("ChatGPT · Claude · Gemini", bv.font(bv.REG, 18), bv.MUTED, 214),
    ]:
        d.text(((W - d.textlength(text, font=fnt)) / 2, y), text, font=fnt, fill=colour)
    im.save(os.path.join(OUT, "promo-small.png"))


def promo_marquee():
    W, H, SPLIT = 1400, 560, 700
    im = Image.new("RGB", (W, H), bv.BG)
    d = ImageDraw.Draw(im)
    shot = frame("REC2", 108.0).crop((865, 235, 865 + 1210, 235 + 970))
    shot = shot.resize((W - SPLIT, round(970 * (W - SPLIT) / 1210)), Image.LANCZOS)
    im.paste(shot.crop((0, 0, W - SPLIT, H)), (SPLIT, 0))
    for i in range(4):
        d.line([(SPLIT - 4 + i, 0), (SPLIT - 4 + i, H)], fill=bv.ACCENT_A if i < 2 else bv.ACCENT_B)
    brand(im, d, 70, 70, 56, 30)
    d.text((70, 190), "Stop secrets and personal", font=bv.font(bv.BOLD, 46), fill="white")
    d.text((70, 248), "data before you hit Send", font=bv.font(bv.BOLD, 46), fill="white")
    d.text((70, 330), "API keys, passwords, card numbers and customer", font=bv.font(bv.REG, 24), fill=bv.MUTED)
    d.text((70, 362), "data, in prompts and attached files.", font=bv.font(bv.REG, 24), fill=bv.MUTED)
    d.text((70, 440), "ChatGPT  ·  Claude  ·  Gemini", font=bv.font(bv.BOLD, 26), fill=PURPLE)
    im.save(os.path.join(OUT, "promo-marquee.png"))


def main():
    missing = [p for p in (bv.REC1, bv.REC2) if not os.path.exists(p)]
    if missing:
        raise SystemExit("Missing recordings:\n  " + "\n  ".join(missing))
    os.makedirs(OUT, exist_ok=True)
    for spec in SCREENSHOTS:
        screenshot(*spec)
    promo_small()
    promo_marquee()
    for f in sorted(os.listdir(OUT)):
        with Image.open(os.path.join(OUT, f)) as im:
            print(f"{f}: {im.size[0]}x{im.size[1]} {im.mode}")


if __name__ == "__main__":
    main()
