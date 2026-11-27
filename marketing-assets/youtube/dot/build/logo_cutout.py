# Cuts the EraseAI shield out of the app icon: white corners and the navy tile become transparent,
# then the image is cropped tight to the shield. Usage: python3 logo_cutout.py <in.png> <out.png>
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        sat = max(r, g, b) - min(r, g, b)
        # the shield is cyan/blue (high saturation); white corners and the navy tile are not
        alpha = max(0, min(255, int((sat - 40) * 255 / 60)))
        px[x, y] = (r, g, b, min(a, alpha))
bbox = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
im.crop(bbox).save(dst)
print("cropped to", bbox, "->", im.crop(bbox).size)
