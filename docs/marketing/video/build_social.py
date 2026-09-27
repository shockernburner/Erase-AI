"""20-second social cut of the EraseAI Firewall demo, in 16:9 and 1:1.

Reuses build_video's cutting, cropping and name blur; captions are larger and
the story is compressed to: key pasted -> caught -> masked -> AI sees masked ->
files blocked -> works in Claude -> end card.
"""
import os
import subprocess
from PIL import Image, ImageDraw

import build_video as bv

FORMATS = {
    # name: (width, height, video height, caption title size, badge)
    "16x9": (1920, 1080, 880, 60, True),
    "1x1": (1080, 1080, 840, 50, False),
}


def social_caption(name, title, size, badge):
    W, H, VH = bv.W, bv.H, bv.VH
    im = Image.new("RGB", (W, H - VH), bv.BG)
    d = ImageDraw.Draw(im)
    bv.gradient_line(d, 0, 4, W)
    max_w = W - 160 - (360 if badge else 0)
    fnt = bv.font(bv.BOLD, size)
    # Wrap to at most two lines, shrinking if a word still doesn't fit.
    words, lines, cur = title.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if d.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    line_h = int(size * 1.2)
    y = ((H - VH) - line_h * len(lines)) // 2 + 2
    for line in lines:
        d.text((80, y), line, font=fnt, fill="white")
        y += line_h
    if badge:
        icon = Image.open(bv.ICON).convert("RGBA").resize((60, 60), Image.LANCZOS)
        cy = (H - VH) // 2
        im.paste(icon, (W - 80 - 60 - 260, cy - 30), icon)
        d.text((W - 80 - 250, cy - 20), "EraseAI Firewall", font=bv.font(bv.BOLD, 34), fill="white")
    path = os.path.join(bv.WORK, f"cap_{name}.png")
    im.save(path)
    return path


def build(fmt):
    W, H, VH, size, badge = FORMATS[fmt]
    bv.W, bv.H, bv.VH = W, H, VH
    bv.WORK = os.path.join(bv.HERE, "build", f"social_{fmt}")
    os.makedirs(bv.WORK, exist_ok=True)
    square = fmt == "1x1"
    cap = lambda n, t: social_caption(n, t, size, badge)  # noqa: E731
    box = bv.box

    clips = [
        bv.shot("s1_paste", bv.REC2, 247.8, 250.5,
                box(1520, 985, 1100 if square else 900), cap("s1", "Pasting an AWS key into Gemini?"),
                speed=1.3, blurs=[bv.NAME_AWS]),
        bv.shot("s2_caught", bv.REC2, 251.4, 254.4,
                box(1470, 985, 1150), cap("s2", "EraseAI catches it before it's sent")),
        bv.shot("s3_mask", bv.REC2, 257.6, 260.6,
                box(1470, 1150, 1100 if square else 1060), cap("s3", "One click masks it")),
        # Starts once Gemini's reply begins, so the masked key sits above an answer.
        bv.shot("s4_masked", bv.REC2, 263.0, 265.6,
                box(1500, 700, 1150) if square else box(1470, 600, 900),
                cap("s4", "The AI only ever sees AKIA…MPLE")),
        bv.shot("s5_files", bv.REC2, 105.6, 108.8,
                box(1470, 800 if square else 700, 1150 if square else 970),
                cap("s5", "Files too: a customer export, blocked")),
        bv.shot("s6_claude", bv.REC2, 294.8, 297.6,
                box(1470, 800 if square else 730, 1150 if square else 1000),
                cap("s6", "Works in ChatGPT, Gemini and Claude")),
    ]

    end_lines = [
        ("EraseAI Firewall", bv.font(bv.BOLD, 70 if square else 80), "white", 105),
        ("Free on the Chrome Web Store", bv.font(bv.BOLD, 44), (167, 139, 250), 75),
        ("No account needed", bv.font(bv.REG, 36), bv.MUTED, 60),
    ]
    clips.append(bv.still("s7_end", bv.card_png("end", end_lines), 2.7))

    listing = os.path.join(bv.WORK, "concat.txt")
    with open(listing, "w") as f:
        f.writelines(f"file '{c}'\n" for c in clips)
    silent = os.path.join(bv.WORK, "silent.mp4")
    bv.run(["-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", silent])
    total = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent],
        capture_output=True, text=True, check=True).stdout.strip())

    final = os.path.join(bv.OUTDIR, f"EraseAI Firewall - social 20s ({fmt}).mp4")
    afilter = f"volume=0.8,afade=t=in:st=0:d=0.5,afade=t=out:st={total - 1.5}:d=1.5"
    bv.run(["-i", silent, "-i", bv.MUSIC, "-filter_complex", f"[1:a]{afilter}[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart", final])
    print(f"{final}  ({total:.1f}s)")


if __name__ == "__main__":
    bv.check_inputs()
    for fmt in FORMATS:
        build(fmt)
