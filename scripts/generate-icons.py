"""
Generate Lumen app icons (PNG) for installable PWA on Android.

Produces:
- /public/icons/icon-192.png  (192x192, standard)
- /public/icons/icon-512.png  (512x512, standard)
- /public/icons/maskable-192.png (192x192, maskable with safe padding)
- /public/icons/maskable-512.png (512x512, maskable with safe padding)
- /public/icons/apple-touch-icon.png (180x180, iOS)
- /public/icons/favicon-32.png
- /public/icons/favicon-16.png

The icon is a liquid-glass "L" gradient orb on a deep aurora background,
matching the app's design language.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math

OUT_DIR = '/home/z/my-project/public/icons'
os.makedirs(OUT_DIR, exist_ok=True)

# Brand palette (matches the app's CSS variables)
BRAND_1 = (109, 59, 209)      # oklch(0.62 0.24 285) ~ #6D3BD1
BRAND_2 = (199, 67, 156)      # oklch(0.66 0.22 330) ~ #C7439C
BRAND_3 = (94, 184, 220)      # oklch(0.72 0.15 195) ~ #5EB8DC
BG_TOP = (16, 12, 32)         # deep purple-black
BG_BOT = (28, 18, 52)         # slightly lighter
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_gradient_bg(size):
    """Vertical aurora gradient background."""
    img = Image.new('RGB', (size, size), BG_TOP)
    pixels = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        c = lerp(BG_TOP, BG_BOT, t)
        for x in range(size):
            pixels[x, y] = c
    return img


def draw_aurora_blobs(size, draw):
    """Soft aurora light blobs in the background."""
    # Blob 1 — top-left, brand-1
    blob1 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    b1 = ImageDraw.Draw(blob1)
    r = int(size * 0.55)
    cx, cy = int(size * 0.25), int(size * 0.20)
    b1.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRAND_1 + (90,))
    blob1 = blob1.filter(ImageFilter.GaussianBlur(size // 12))

    # Blob 2 — bottom-right, brand-2
    blob2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    b2 = ImageDraw.Draw(blob2)
    r = int(size * 0.55)
    cx, cy = int(size * 0.78), int(size * 0.82)
    b2.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRAND_2 + (80,))
    blob2 = blob2.filter(ImageFilter.GaussianBlur(size // 12))

    # Blob 3 — top-right, brand-3
    blob3 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    b3 = ImageDraw.Draw(blob3)
    r = int(size * 0.40)
    cx, cy = int(size * 0.80), int(size * 0.20)
    b3.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRAND_3 + (60,))
    blob3 = blob3.filter(ImageFilter.GaussianBlur(size // 14))

    return blob1, blob2, blob3


def draw_glass_orb(size):
    """The central liquid-glass circle that contains the L."""
    cx = cy = size // 2
    r = int(size * 0.34)

    # Glow halo behind the orb
    halo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    h = ImageDraw.Draw(halo)
    h.ellipse([cx - r - int(size * 0.04), cy - r - int(size * 0.04),
               cx + r + int(size * 0.04), cy + r + int(size * 0.04)],
              fill=BRAND_2 + (60,))
    halo = halo.filter(ImageFilter.GaussianBlur(size // 20))

    # Main orb — gradient fill
    orb = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    o = ImageDraw.Draw(orb)
    # Approximate the brand-1 → brand-3 diagonal gradient with horizontal bands
    for i in range(r * 2):
        t = i / max(1, r * 2 - 1)
        # Blend brand-1 → brand-3 vertically, with some brand-2 in the middle
        if t < 0.5:
            c = lerp(BRAND_1, BRAND_2, t * 2)
        else:
            c = lerp(BRAND_2, BRAND_3, (t - 0.5) * 2)
        o.line([(cx - r, cy - r + i), (cx + r, cy - r + i)], fill=c + (230,))
    # Mask to circle
    mask = Image.new('L', (size, size), 0)
    m = ImageDraw.Draw(mask)
    m.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    orb.putalpha(mask)

    # Inner glow (top-left specular highlight)
    spec = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    s = ImageDraw.Draw(spec)
    sx, sy = cx - int(r * 0.35), cy - int(r * 0.45)
    sr = int(r * 0.55)
    s.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=WHITE + (110,))
    spec = spec.filter(ImageFilter.GaussianBlur(size // 18))
    # Mask the spec to inside the orb
    spec.putalpha(Image.eval(mask, lambda v: int(v * 0.95)))

    # Subtle outer rim
    rim = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rr = ImageDraw.Draw(rim)
    rr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=WHITE + (60,), width=max(1, size // 128))

    return halo, orb, spec, rim, cx, cy, r


def draw_L(size, cx, cy, r):
    """Draw a clean geometric 'L' in white at the center."""
    L = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    # Stroke width scales with icon size
    sw = max(2, int(size * 0.085))
    # L dimensions: vertical stroke + horizontal foot
    h_half = int(r * 0.55)  # half-height of vertical
    w_half = int(r * 0.32)  # half-width of vertical stroke
    foot_len = int(r * 0.55)
    # Vertical stroke (centered horizontally on cx, top to cy + h_half)
    d.line([(cx - w_half // 2, cy - h_half), (cx - w_half // 2, cy + h_half)],
           fill=WHITE + (255,), width=sw)
    # Round cap top
    d.ellipse([cx - w_half // 2 - sw // 2, cy - h_half - sw // 2,
               cx - w_half // 2 + sw // 2, cy - h_half + sw // 2], fill=WHITE + (255,))
    # Foot (horizontal) — from vertical stroke bottom-left to foot_len right
    d.line([(cx - w_half // 2, cy + h_half), (cx - w_half // 2 + foot_len, cy + h_half)],
           fill=WHITE + (255,), width=sw)
    # Round cap right
    d.ellipse([cx - w_half // 2 + foot_len - sw // 2, cy + h_half - sw // 2,
               cx - w_half // 2 + foot_len + sw // 2, cy + h_half + sw // 2], fill=WHITE + (255,))
    # Corner joint smoothing
    d.ellipse([cx - w_half // 2 - sw // 2, cy + h_half - sw // 2,
               cx - w_half // 2 + sw // 2, cy + h_half + sw // 2], fill=WHITE + (255,))
    return L


def make_icon(size, maskable=False):
    """Render the icon at the given size. If maskable, add safe padding (~10%)."""
    img = Image.new('RGBA', (size, size), BG_TOP + (255,))
    # Background gradient
    bg = draw_gradient_bg(size).convert('RGBA')
    img = Image.alpha_composite(img, bg)

    # Aurora blobs (full bleed for maskable so background looks good after cropping)
    blob1, blob2, blob3 = draw_aurora_blobs(size, None)
    img = Image.alpha_composite(img, blob1)
    img = Image.alpha_composite(img, blob2)
    img = Image.alpha_composite(img, blob3)

    # For maskable: shrink the central orb + L into the safe zone (80% area)
    if maskable:
        # Render orb/L on a sub-canvas at 80% scale, then composite centered
        sub_size = int(size * 0.80)
        sub = make_orb_and_L(sub_size)
        # paste centered
        offset = (size - sub_size) // 2
        img.alpha_composite(sub, (offset, offset))
    else:
        sub = make_orb_and_L(size)
        img.alpha_composite(sub, (0, 0))

    return img.convert('RGB')  # final PNGs are RGB (no alpha needed for app icons)


def make_orb_and_L(size):
    """Render the orb + L on a transparent canvas of given size."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    halo, orb, spec, rim, cx, cy, r = draw_glass_orb(size)
    L = draw_L(size, cx, cy, r)
    canvas = Image.alpha_composite(canvas, halo)
    canvas = Image.alpha_composite(canvas, orb)
    canvas = Image.alpha_composite(canvas, spec)
    canvas = Image.alpha_composite(canvas, rim)
    canvas = Image.alpha_composite(canvas, L)
    return canvas


def main():
    targets = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-1024.png', 1024, False),  # high-res source for stores
        ('maskable-192.png', 192, True),
        ('maskable-512.png', 512, True),
        ('apple-touch-icon.png', 180, False),
        ('favicon-32.png', 32, False),
        ('favicon-16.png', 16, False),
    ]
    print(f"Generating {len(targets)} icons in {OUT_DIR}…")
    for name, size, maskable in targets:
        img = make_icon(size, maskable=maskable)
        path = os.path.join(OUT_DIR, name)
        img.save(path, 'PNG', optimize=True)
        print(f"  {name} ({size}x{size}{' maskable' if maskable else ''}) -> {path}")
    print("Done.")


if __name__ == '__main__':
    main()
