"""Google Play "Foreground service permissions" demo for the EraseAI Android app.

Cuts three emulator screen recordings (adb screenrecord, 1080x2400 portrait)
into one 1920x1080 video: phone on the left, numbered explanation on the right.
It shows FGS_SPECIAL_USE (EgressGateService, the Strict network gate) from
opt-in, through start, the ongoing notification, to stop.

Inputs (ERASEAI_FGS_MEDIA, default: this folder's build/fgs/):
  fgs_p1.mp4  Settings -> Strict network gate on -> notification permission -> VPN consent
  fgs_p2.mp4  ChatGPT: AWS key typed -> curtain + VPN key icon -> notification shade
  fgs_p3.mp4  curtain -> Sanitize & Send -> service stopped -> shade without notification
Output: <ERASEAI_VIDEO_OUT>/EraseAI - Play FGS demo.mp4

Upload the result to YouTube as Unlisted and paste the link into Play Console.
"""
import os
import subprocess
from PIL import Image, ImageDraw

import build_video as bv

MEDIA = os.environ.get("ERASEAI_FGS_MEDIA", os.path.join(bv.HERE, "build", "fgs"))
WORK = os.path.join(bv.HERE, "build", "play_fgs")
W, H = 1920, 1080
PHONE_H = 1020
PHONE_W = round(1080 * PHONE_H / 2400) // 2 * 2
PHONE_X, PHONE_Y = 170, (H - PHONE_H) // 2
TEXT_X = PHONE_X + PHONE_W + 130
TEXT_W = W - TEXT_X - 110
FPS = 30

# Account email in the Find Hub notification, in source pixels (x, y, w, h).
EMAIL_BOX = (380, 600, 290, 65)

# (source, start, end, speed, blur email, title, body)
SEGMENTS = [
    ("fgs_p1.mp4", 0.0, 4.5, 1.0, False, "Off by default",
     "The Strict network gate is optional. The user turns it on in EraseAI → Settings."),
    ("fgs_p1.mp4", 4.5, 21.0, 3.0, False, "Notification permission",
     "Android asks to allow notifications, so the foreground service can show its "
     "ongoing notification."),
    ("fgs_p1.mp4", 21.0, 37.0, 2.5, False, "VPN consent",
     "The user accepts Android's VPN connection request and the toggle turns on. "
     "Nothing runs yet."),
    ("fgs_p2.mp4", 3.5, 13.0, 1.0, False, "A risky prompt",
     "The user types an AWS access key into ChatGPT. EraseAI holds the send."),
    ("fgs_p2.mp4", 13.0, 20.5, 2.5, False, "Foreground service starts",
     "EraseAI starts EgressGateService (FGS_SPECIAL_USE). Its local VPN blocks only "
     "the protected AI apps. Note the VPN key icon in the status bar."),
    ("fgs_p2.mp4", 20.5, 35.0, 1.6, True, "Ongoing notification",
     "While the prompt is held the user sees “EraseAI is blocking AI app network”. "
     "Packets are dropped on the device, never inspected, logged or forwarded."),
    ("fgs_p3.mp4", 0.0, 10.0, 1.0, False, "The user decides",
     "The user taps the banner and chooses Sanitize & Send. The key is replaced "
     "with [REDACTED]."),
    ("fgs_p3.mp4", 10.0, 20.5, 2.0, False, "Service stops",
     "The prompt is released, so EraseAI stops the service immediately. The VPN "
     "key icon is gone."),
    ("fgs_p3.mp4", 20.5, 25.5, 1.0, True, "Notification removed",
     "The service runs only while a risky prompt is held, usually a few seconds."),
]


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def wrap(d, text, fnt, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if d.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def brand(im, d, x, y):
    icon = Image.open(bv.ICON).convert("RGBA").resize((52, 52), Image.LANCZOS)
    im.paste(icon, (x, y), icon)
    d.text((x + 68, y + 8), "EraseAI Firewall for Android", font=bv.font(bv.BOLD, 30), fill="white")


def panel(i, title, body):
    im = Image.new("RGB", (W, H), bv.BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([PHONE_X - 8, PHONE_Y - 8, PHONE_X + PHONE_W + 8, PHONE_Y + PHONE_H + 8],
                        radius=28, fill=(30, 41, 59))
    brand(im, d, TEXT_X, 90)
    d.text((TEXT_X, 175), "Foreground service: specialUse · Strict network gate",
           font=bv.font(bv.REG, 26), fill=bv.MUTED)
    bv.gradient_line(d, 230, 4, W)
    d.rectangle([0, 230, TEXT_X - 40, 234], fill=bv.BG)
    d.text((TEXT_X, 330), f"Step {i} of {len(SEGMENTS)}", font=bv.font(bv.BOLD, 30), fill=(167, 139, 250))
    y = 385
    tfont = bv.font(bv.BOLD, 62)
    for line in wrap(d, title, tfont, TEXT_W):
        d.text((TEXT_X, y), line, font=tfont, fill="white")
        y += 76
    y += 30
    bfont = bv.font(bv.REG, 38)
    for line in wrap(d, body, bfont, TEXT_W):
        d.text((TEXT_X, y), line, font=bfont, fill=(226, 232, 240))
        y += 54
    path = os.path.join(WORK, f"panel_{i}.png")
    im.save(path)
    return path


def card(name, lines):
    im = Image.new("RGB", (W, H), bv.BG)
    d = ImageDraw.Draw(im)
    total = sum(h for _, _, _, h in lines)
    y = (H - total) // 2
    for text, fnt, colour, h in lines:
        d.text(((W - d.textlength(text, font=fnt)) / 2, y), text, font=fnt, fill=colour)
        y += h
    bv.gradient_line(d, H - 6, 6, W)
    path = os.path.join(WORK, f"{name}.png")
    im.save(path)
    return path


def still(name, png, seconds):
    out = os.path.join(WORK, f"{name}.mp4")
    run(["-loop", "1", "-framerate", str(FPS), "-i", png, "-t", str(seconds),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), out])
    return out


def segment(i, src, start, end, speed, blur, title, body):
    out = os.path.join(WORK, f"seg_{i}.mp4")
    dur = (end - start) / speed
    x, y, w, h = EMAIL_BOX
    chain = f"[0:v]fps={FPS},tpad=stop_mode=clone:stop_duration=30,setpts=(PTS-STARTPTS)/{speed}"
    if blur:
        chain += (f",split[a][b];[b]crop={w}:{h}:{x}:{y},boxblur=14:3[bb];"
                  f"[a][bb]overlay={x}:{y}")
    chain += f",scale={PHONE_W}:{PHONE_H}[ph];[1:v][ph]overlay={PHONE_X}:{PHONE_Y},format=yuv420p[v]"
    run(["-ss", str(start), "-t", str(end - start + 1), "-i", os.path.join(MEDIA, src),
         "-loop", "1", "-framerate", str(FPS), "-i", panel(i, title, body),
         "-filter_complex", chain, "-map", "[v]", "-t", f"{dur:.3f}", "-r", str(FPS),
         "-c:v", "libx264", "-crf", "18", out])
    return out


def main():
    missing = [s for s in {seg[0] for seg in SEGMENTS} if not os.path.exists(os.path.join(MEDIA, s))]
    if missing:
        raise SystemExit(f"Missing recordings in {MEDIA}: {', '.join(sorted(missing))}")
    os.makedirs(WORK, exist_ok=True)

    clips = [still("title", card("title", [
        ("EraseAI Firewall for Android", bv.font(bv.BOLD, 76), "white", 110),
        ("Foreground service type: specialUse", bv.font(bv.BOLD, 44), (167, 139, 250), 70),
        ("Subtype ai_firewall_egress_gate · the optional Strict network gate",
         bv.font(bv.REG, 34), bv.MUTED, 60),
    ]), 4.0)]
    clips += [segment(i, *seg) for i, seg in enumerate(SEGMENTS, 1)]
    clips.append(still("end", card("end", [
        ("Why a foreground service", bv.font(bv.BOLD, 64), "white", 110),
        ("Starts the instant a risky prompt is held: a send happens in milliseconds",
         bv.font(bv.REG, 36), (226, 232, 240), 62),
        ("Cannot be deferred or paused, so WorkManager or a job would be too late",
         bv.font(bv.REG, 36), (226, 232, 240), 62),
        ("Opt-in, visible notification, stops as soon as the user decides",
         bv.font(bv.REG, 36), (226, 232, 240), 62),
        ("No packet is inspected, logged or sent anywhere", bv.font(bv.REG, 36), (226, 232, 240), 62),
    ]), 7.0))

    listing = os.path.join(WORK, "concat.txt")
    with open(listing, "w") as f:
        f.writelines(f"file '{c}'\n" for c in clips)
    final = os.path.join(bv.OUTDIR, "EraseAI - Play FGS demo.mp4")
    # Silent stereo track: some upload paths reject video-only files.
    run(["-f", "concat", "-safe", "0", "-i", listing,
         "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest",
         "-movflags", "+faststart", final])
    total = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", final], capture_output=True, text=True).stdout.strip()
    print(f"{final}  ({float(total):.1f}s)")


if __name__ == "__main__":
    main()
