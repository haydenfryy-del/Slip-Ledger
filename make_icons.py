"""Generates the app icons. Run: python3 make_icons.py"""
from PIL import Image, ImageDraw, ImageFont

BG = (18, 21, 20)
RED = (224, 73, 63)
INK = (236, 238, 234)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def draw(size):
    img = Image.new("RGB", (size, size), BG)  # full-bleed square, iOS rounds the corners itself
    d = ImageDraw.Draw(img)
    r = int(size * 0.34)  # kept inside the maskable safe zone
    c = size // 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=RED)
    f = ImageFont.truetype(FONT, int(size * 0.34))
    d.text((c, c), "$", font=f, fill=INK, anchor="mm")
    return img


for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
    draw(size).save("icons/" + name)
print("icons written")
