"""Article cover (Medium / LinkedIn), 1920x1080, with the new EraseAI shield.

Left: logo, headline, supported apps. Right: a real capture of the extension's
warning panel (panel.png, made by running the extension against a test page;
see docs/marketing/covers/README.md).

  python3 build_cover.py PANEL_PNG OUT_PNG
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ICON = os.path.join(REPO, "artifacts", "ai-firewall-android", "store-assets", "icon-512.png")

FONT_DIRS = ["/System/Library/Fonts/Supplemental", "/usr/share/fonts/truetype/liberation"]
BOLD = ["Arial Bold.ttf", "LiberationSans-Bold.ttf"]
REG = ["Arial.ttf", "LiberationSans-Regular.ttf"]

BG = (11, 16, 32)
MUTED = (148, 163, 184)
CYAN = (34, 211, 238)
CYAN_DARK = (6, 182, 212)


def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main(panel_path, out_path):
    W, H, SPLIT = 1920, 1080, 860
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    # Right: the panel, scaled to fit with a margin, on a slightly lighter band.
    d.rectangle([SPLIT, 0, W, H], fill=(17, 24, 39))
    panel = Image.open(panel_path).convert("RGB")
    margin = 70
    box_w, box_h = W - SPLIT - 2 * margin, H - 2 * margin
    scale = box_w / panel.width
    panel = panel.resize((box_w, round(panel.height * scale)), Image.LANCZOS)
    panel = panel.crop((0, 0, box_w, min(panel.height, box_h)))
    # Fade the bottom edge so the cut-off looks intentional.
    fade = 140
    for i in range(fade):
        a = i / fade
        y = panel.height - fade + i
        row = panel.crop((0, y, box_w, y + 1))
        bg = Image.new("RGB", row.size, (17, 24, 39))
        panel.paste(Image.blend(row, bg, a), (0, y))
    im.paste(panel, (SPLIT + margin, margin))

    # Divider in brand cyan.
    for i in range(6):
        d.line([(SPLIT - 6 + i, 0), (SPLIT - 6 + i, H)], fill=CYAN if i < 3 else CYAN_DARK)

    # Left: logo + name.
    icon = Image.open(ICON).convert("RGBA").resize((88, 88), Image.LANCZOS)
    im.paste(icon, (90, 100), icon)
    d.text((90 + 88 + 22, 100 + 22), "EraseAI Firewall", font=font(BOLD, 42), fill="white")

    y = 330
    for line in ["Your team is pasting", "secrets into AI chats."]:
        d.text((90, y), line, font=font(BOLD, 68), fill="white")
        y += 86
    y += 40
    for line in ["EraseAI Firewall catches keys, passwords and", "personal data before you press Send."]:
        d.text((90, y), line, font=font(REG, 34), fill=MUTED)
        y += 48

    d.text((90, H - 170), "ChatGPT  ·  Claude  ·  Gemini", font=font(BOLD, 36), fill=CYAN)
    d.text((90, H - 115), "Chrome extension and Android app", font=font(REG, 30), fill=(226, 232, 240))
    im.save(out_path, optimize=True)
    print(out_path, im.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
