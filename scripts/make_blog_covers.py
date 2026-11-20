"""Builds simple 1200x630 JPEG blog covers (title + category on a brand gradient) for the seeded posts.

Run from the repository root: python3 scripts/make_blog_covers.py
Output: backend/apps/content/seed_data/blog_covers/<slug>.jpg (applied by content migration 0007).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
SEED = REPO / 'backend/apps/content/seed_data/blog_posts'
OUT = REPO / 'backend/apps/content/seed_data/blog_covers'
FONTS = REPO / 'frontend/src/assets/fonts'
W, H = 1200, 630

ACCENT = {  # one accent per category, all readable on navy
    'Career Guides': (147, 197, 253),
    'Python': (250, 204, 21),
    'Java': (251, 146, 60),
    'Web Development': (45, 212, 191),
    'Artificial Intelligence': (167, 139, 250),
    'Interview Preparation': (74, 222, 128),
    'Learning to Code': (244, 114, 182),
}
GLYPH = {
    'Career Guides': '↗', 'Python': '>>>', 'Java': '{ }', 'Web Development': '</>',
    'Artificial Intelligence': 'AI', 'Interview Preparation': 'Q&A', 'Learning to Code': '01',
}


def font(weight, size):
    return ImageFont.truetype(str(FONTS / f'poppins-{weight}-latin.woff2'), size)


def wrap(draw, text, fnt, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def background(accent):
    img = Image.new('RGB', (W, H), (10, 26, 63))
    px = img.load()
    for y in range(H):  # vertical navy gradient
        t = y / H
        row = (int(10 - 4 * t), int(26 - 8 * t), int(63 - 20 * t))
        for x in range(W):
            px[x, y] = row
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((760, -220, 1420, 440), fill=tuple(int(c * 0.45) for c in accent))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.blend(img, Image.composite(glow, img, glow.convert('L')), 0.9)
    d = ImageDraw.Draw(img)
    for x in range(0, W, 40):  # faint dot grid
        for y in range(0, H, 40):
            d.point((x, y), fill=(40, 58, 100))
    return img


def cover(meta):
    accent = ACCENT.get(meta['category'], (147, 197, 253))
    img = background(accent)
    d = ImageDraw.Draw(img)
    d.text((1120, 300), GLYPH.get(meta['category'], '</>'), font=font(800, 165), fill=tuple(int(c * 0.14) + 16 for c in accent), anchor='rm')
    d.rectangle((72, 72, 80, 132), fill=accent)
    d.text((100, 102), meta['category'].upper(), font=font(600, 26), fill=accent, anchor='lm')
    size = 64
    while True:
        fnt = font(700, size)
        lines = wrap(d, meta['title'], fnt, 880)
        if len(lines) <= 4 or size <= 44:
            break
        size -= 4
    y = 175
    for line in lines[:4]:
        d.text((72, y), line, font=fnt, fill=(255, 255, 255))
        y += int(size * 1.22)
    d.line((72, 540, 1128, 540), fill=(45, 63, 110), width=2)
    d.text((72, 575), 'Coding Hubs School of AI', font=font(600, 26), fill=(255, 255, 255), anchor='lm')
    d.text((1128, 575), 'codinghubs.in', font=font(500, 24), fill=(170, 186, 220), anchor='rm')
    return img


OUT.mkdir(exist_ok=True)
total = 0
for path in sorted(SEED.glob('*.html')):
    head = path.read_text(encoding='utf-8').split('\n---\n', 1)[0]
    meta = dict(line.split(':', 1) for line in head.splitlines() if ':' in line)
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    target = OUT / f"{meta['slug']}.jpg"
    cover(meta).save(target, 'JPEG', quality=80, optimize=True, progressive=True)
    total += target.stat().st_size
print(f'{len(list(OUT.glob("*.jpg")))} covers, {total / 1024:.0f} KB total')
