"""Builds the ~60-70s EraseAI Firewall demo video from the desktop recordings.

Layout per shot: 1920x900 cropped screen recording on top, 1920x180 caption bar
below. Title and end cards are full-frame stills. Music is mixed with fades.
"""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

# Source media is not in git (the recordings are large). Point these at your
# files with environment variables; the defaults match the original session.
MEDIA = os.path.expanduser(os.environ.get("ERASEAI_VIDEO_MEDIA", "~/Desktop"))
OUTDIR = os.path.expanduser(os.environ.get("ERASEAI_VIDEO_OUT", MEDIA))
REC1 = os.environ.get("ERASEAI_REC1", os.path.join(MEDIA, "Screen Recording 1.mov"))
REC2 = os.environ.get("ERASEAI_REC2", os.path.join(MEDIA, "Screen Recording 2.mov"))
CSV_SHOT = os.environ.get("ERASEAI_CSV_SHOT", os.path.join(MEDIA, "Screenshot of csv.png"))
MUSIC = os.environ.get("ERASEAI_MUSIC", os.path.join(MEDIA, "alex-morgan-tech-circuit-data-stream-578473.mp3"))
ICON = os.path.join(REPO, "extension", "icons", "icon128.png")
FINAL = os.path.join(OUTDIR, "EraseAI Firewall - Chrome demo.mp4")

# Intermediate clips (gitignored).
WORK = os.path.join(HERE, "build", "full")
os.makedirs(WORK, exist_ok=True)

W, H, VH = 1920, 1080, 900
FPS = 30
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
BG = (11, 16, 32)
MUTED = (148, 163, 184)
ACCENT_A, ACCENT_B = (99, 102, 241), (139, 92, 246)


def font(path, size):
    return ImageFont.truetype(path, size)


def gradient_line(draw, y, h, width=W):
    for x in range(width):
        t = x / (width - 1)
        c = tuple(int(ACCENT_A[i] + (ACCENT_B[i] - ACCENT_A[i]) * t) for i in range(3))
        draw.line([(x, y), (x, y + h)], fill=c)


def caption_png(name, title, subtitle=None):
    im = Image.new("RGB", (W, H - VH), BG)
    d = ImageDraw.Draw(im)
    gradient_line(d, 0, 3)
    # Shrink long titles so they never run under the brand badge on the right.
    max_w, size = W - 80 - 360, 50
    while d.textlength(title, font=font(BOLD, size)) > max_w and size > 34:
        size -= 2
    d.text((80, (38 if subtitle else 62) + (50 - size) // 2), title, font=font(BOLD, size), fill="white")
    if subtitle:
        d.text((80, 106), subtitle, font=font(REG, 30), fill=MUTED)
    icon = Image.open(ICON).convert("RGBA").resize((56, 56), Image.LANCZOS)
    im.paste(icon, (W - 80 - 56 - 250, 62), icon)
    d.text((W - 80 - 240, 70), "EraseAI Firewall", font=font(BOLD, 32), fill="white")
    path = os.path.join(WORK, f"cap_{name}.png")
    im.save(path)
    return path


def card_png(name, lines, icon_size=150):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    gradient_line(d, H - 6, 6)
    icon = Image.open(ICON).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
    y = 250
    im.paste(icon, ((W - icon_size) // 2, y), icon)
    y += icon_size + 50
    for text, fnt, colour, gap in lines:
        w = d.textlength(text, font=fnt)
        d.text(((W - w) / 2, y), text, font=fnt, fill=colour)
        y += gap
    path = os.path.join(WORK, f"card_{name}.png")
    im.save(path)
    return path


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


ENCODE = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]


def still(name, png, seconds, zoom=False):
    out = os.path.join(WORK, f"{name}.mp4")
    frames = int(seconds * FPS)
    vf = f"fade=t=in:st=0:d=0.4,fade=t=out:st={seconds - 0.4}:d=0.4"
    if zoom:
        vf = f"zoompan=z='min(zoom+0.0006,1.06)':d={frames}:s={W}x{H}:fps={FPS}," + vf
    run(["-loop", "1", "-t", str(seconds), "-i", png, "-vf", vf, *ENCODE, out])
    return out


# Names shown in the Gemini greetings ("Hi Firdous, …"), in source pixels.
NAME_AWS = (1140, 760, 260, 90)     # "Hi Firdous, what's the move?"
NAME_INJECT = (1080, 590, 260, 85)  # "Hi Firdous, what's on your mind?"


def blur_chain(blurs):
    """Blur boxes (x, y, w, h[, until]) applied in source space before cropping.
    `until` (seconds from clip start) stops the blur once an EraseAI panel covers
    the spot, so the panel itself is never smeared."""
    if not blurs:
        return "[0:v]", ""
    chain, label = "", "0:v"
    for i, b in enumerate(blurs):
        bx, by, bw, bh = b[:4]
        until = b[4] if len(b) > 4 else None
        enable = f":enable='lt(t,{until})'" if until is not None else ""
        chain += (f"[{label}]split=2[m{i}][c{i}];[c{i}]crop={bw}:{bh}:{bx}:{by},"
                  f"boxblur=luma_radius=16:luma_power=3:chroma_radius=8[b{i}];"
                  f"[m{i}][b{i}]overlay={bx}:{by}{enable}[s{i}];")
        label = f"s{i}"
    return f"[{label}]", chain


def shot(name, src, start, end, crop, caption, speed=1.0, hold=0.0, blurs=None):
    """crop = (x, y, w, h) in source pixels; w/h should match W/VH."""
    x, y, cw, ch = crop
    out = os.path.join(WORK, f"{name}.mp4")
    dur = (end - start) / speed + hold
    tpad = f"tpad=stop_mode=clone:stop_duration={hold}," if hold else ""
    src_label, pre = blur_chain(blurs)
    vf = pre + (
        f"{src_label}setpts=PTS/{speed},{tpad}crop={cw}:{ch}:{x}:{y},scale={W}:{VH}:flags=lanczos,"
        f"pad={W}:{H}:0:0:color=0x0B1020[v];[v][1:v]overlay=0:{VH},"
        f"fade=t=in:st=0:d=0.25,fade=t=out:st={max(dur - 0.25, 0)}:d=0.25[o]"
    )
    run(["-ss", str(start), "-to", str(end), "-i", src, "-i", caption,
         "-filter_complex", vf, "-map", "[o]", *ENCODE, out])
    return out


def still_shot(name, png, crop, caption, seconds):
    x, y, cw, ch = crop
    out = os.path.join(WORK, f"{name}.mp4")
    frames = int(seconds * FPS)
    vf = (
        f"[0:v]crop={cw}:{ch}:{x}:{y},scale={W * 2}:{VH * 2}:flags=lanczos,"
        f"zoompan=z='min(zoom+0.0005,1.05)':d={frames}:s={W}x{VH}:fps={FPS},"
        f"pad={W}:{H}:0:0:color=0x0B1020[v];[v][1:v]overlay=0:{VH},"
        f"fade=t=in:st=0:d=0.25,fade=t=out:st={seconds - 0.25}:d=0.25[o]"
    )
    # zoompan emits d frames per input frame, so feed it the image once.
    run(["-i", png, "-i", caption,
         "-filter_complex", vf, "-map", "[o]", "-frames:v", str(frames), *ENCODE, out])
    return out


def box(cx, cy, h):
    """16:7.5 crop of height h centred on (cx, cy), clamped to the 2940x1912 source."""
    w = round(h * W / VH)
    x = min(max(round(cx - w / 2), 0), 2940 - w)
    y = min(max(round(cy - h / 2), 0), 1912 - h)
    return (x, y, w, h)


def check_inputs():
    missing = [p for p in (REC1, REC2, CSV_SHOT, MUSIC) if not os.path.exists(p)]
    if missing:
        raise SystemExit("Missing source media:\n  " + "\n  ".join(missing) +
                         "\nSet ERASEAI_VIDEO_MEDIA (folder) or ERASEAI_REC1/REC2/CSV_SHOT/MUSIC.")


def main():
    check_inputs()
    clips = []
    title = card_png("title", [
        ("About to paste company data into an AI chat?", font(BOLD, 64), "white", 90),
        ("EraseAI Firewall checks every message and file before it's sent.", font(REG, 38), MUTED, 60),
    ])
    clips.append(still("00_title", title, 3.5))

    c = caption_png("csv", "A customer export: emails, phones, IDs, card numbers",
                    "Demo data — every value here is fake")
    clips.append(still_shot("01_csv", CSV_SHOT, (0, 0, 1962, 920), c, 3.5))

    c = caption_png("attach", "Attach it in ChatGPT and press Send…")
    compose = box(1525, 1080, 900)
    clips.append(shot("02a_attach", REC2, 90.0, 92.0, compose, c))
    clips.append(shot("02b_type", REC2, 100.0, 104.6, compose, c, speed=1.6))

    top = box(1470, 700, 970)
    bottom = box(1470, 1285, 970)
    c = caption_png("blocked", "EraseAI stops it first: 39 issues found",
                    "Checked before it reaches ChatGPT")
    clips.append(shot("03_blocked", REC2, 104.8, 110.0, top, c))

    c = caption_png("decide", "You decide: cancel, or send anyway at your own risk")
    clips.append(shot("04_decide", REC2, 111.0, 115.5, bottom, c))

    c = caption_png("clean", "Or download a clean copy in one click")
    clips.append(shot("05_clean", REC2, 119.5, 123.6, top, c))

    c = caption_png("awstype", "Paste an AWS key into Gemini…")
    # Ends before the scan panel appears (~250.9s); the name is blurred throughout.
    clips.append(shot("06_awstype", REC2, 246.5, 250.5, box(1520, 985, 900), c, speed=1.5, blurs=[NAME_AWS]))

    c = caption_png("awscaught", "Caught: AWS access key", "Medium risk — Sanitize & Send, Send Anyway or Cancel")
    clips.append(shot("07_awscaught", REC2, 251.3, 256.5, box(1470, 985, 1150), c))

    c = caption_png("sanitize", "Sanitize & Send masks the key",
                    "AKIAIOSFODNN7EXAMPLE  →  AKIA************MPLE")
    clips.append(shot("08_sanitize", REC2, 256.5, 261.3, box(1470, 1150, 1060), c))

    c = caption_png("gemini", "Gemini only ever sees the masked key")
    clips.append(shot("09_gemini", REC2, 261.5, 266.0, box(1470, 600, 900), c))

    c = caption_png("inject", "Catches prompt-injection files too", "Blocked before Gemini reads it")
    clips.append(shot("10a_inject", REC2, 151.8, 153.6, box(1520, 990, 1000), c, blurs=[NAME_INJECT]))
    # The dimmed greeting shows above the small "Scanning…" panel until the result
    # panel covers it at ~154.75s.
    clips.append(shot("10b_inject", REC2, 154.0, 158.0, box(1470, 730, 1000), c, blurs=[(*NAME_INJECT, 0.7)]))

    c = caption_png("claude", "Works in Claude too: 18 secrets in one file",
                    "AWS, GitHub and Slack tokens, JWTs, private keys, database URLs")
    clips.append(shot("11a_claude", REC2, 290.0, 293.4, box(1470, 1060, 1000), c))
    clips.append(shot("11b_claude", REC2, 294.2, 298.0, box(1470, 730, 1000), c))

    c = caption_png("safe", "Clean prompts go straight through", "No false alarm, no extra click")
    # End on the green verdict and hold it; the host's next screen adds nothing.
    clips.append(shot("12_safe", REC1, 10.0, 14.7, box(1470, 1000, 1000), c, hold=1.3))

    end = card_png("end", [
        ("EraseAI Firewall", font(BOLD, 76), "white", 110),
        ("Free on the Chrome Web Store", font(BOLD, 44), (167, 139, 250), 80),
        ("Works in ChatGPT, Claude and Gemini  ·  Checks on your device, no account needed", font(REG, 32), MUTED, 60),
    ])
    clips.append(still("13_end", end, 4.5))

    listing = os.path.join(WORK, "concat.txt")
    with open(listing, "w") as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")
    silent = os.path.join(WORK, "silent.mp4")
    run(["-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", silent])

    total = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent],
        capture_output=True, text=True, check=True).stdout.strip())
    afilter = f"volume=0.8,afade=t=in:st=0:d=1,afade=t=out:st={total - 3}:d=3"
    run(["-i", silent, "-i", MUSIC, "-filter_complex", f"[1:a]{afilter}[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-shortest", "-movflags", "+faststart", FINAL])
    print(f"{FINAL}  ({total:.1f}s, {len(clips)} clips)")


if __name__ == "__main__":
    main()
