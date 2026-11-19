"""Make Android launcher and splash assets from the existing LMSK logo."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dist/assets/lmsk-logo.jpg"
RES = ROOT / "android/app/src/main/res"
PREVIEW = ROOT / "art/previews/android-app-icon.png"
LOGO = Image.open(SOURCE).convert("RGB")


def background(size):
    canvas = Image.new("RGB", size, "#06172d")
    pixels = canvas.load()
    width, height = size
    for y in range(height):
        for x in range(width):
            radius = ((x - width / 2) / max(width, 1)) ** 2 + ((y - height / 2) / max(height, 1)) ** 2
            glow = max(0, 1 - radius * 3.5)
            pixels[x, y] = (int(6 + glow * 9), int(23 + glow * 28), int(45 + glow * 46))
    return canvas


def place_logo(canvas, fraction):
    width, height = canvas.size
    target_width = int(min(width * fraction, height * fraction * LOGO.width / LOGO.height))
    target_height = round(target_width * LOGO.height / LOGO.width)
    image = LOGO.resize((target_width, target_height), Image.Resampling.LANCZOS)
    mask = Image.new("L", image.size, 0)
    inset = max(2, round(target_width * .045))
    ImageDraw.Draw(mask).rectangle((inset, inset, target_width - inset, target_height - inset), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(max(2, round(target_width * .03))))
    canvas.paste(image, ((width - target_width) // 2, (height - target_height) // 2), mask)


for density, icon_size, foreground_size in [
    ("mdpi", 48, 108), ("hdpi", 72, 162), ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324), ("xxxhdpi", 192, 432),
]:
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = background((icon_size, icon_size))
    place_logo(icon, .93)
    icon.save(folder / "ic_launcher.png", optimize=True)

    round_icon = icon.convert("RGBA")
    mask = Image.new("L", (icon_size, icon_size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, icon_size - 1, icon_size - 1), fill=255)
    round_icon.putalpha(mask)
    round_icon.save(folder / "ic_launcher_round.png", optimize=True)

    foreground = Image.new("RGBA", (foreground_size, foreground_size), (0, 0, 0, 0))
    place_logo(foreground, .68)
    foreground.save(folder / "ic_launcher_foreground.png", optimize=True)

for splash in RES.glob("drawable*/splash.png"):
    original = Image.open(splash)
    output = background(original.size)
    place_logo(output, .72)
    output.save(splash, optimize=True)

preview = background((512, 512))
place_logo(preview, .93)
PREVIEW.parent.mkdir(parents=True, exist_ok=True)
preview.save(PREVIEW, optimize=True)
print(f"Wrote Android launcher and splash branding from {SOURCE.name}")
