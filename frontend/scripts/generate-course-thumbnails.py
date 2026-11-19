"""Render original course artwork from catalog.ts (requires Pillow; no remote assets)."""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/courses'
OUT.mkdir(parents=True, exist_ok=True)
ROWS = re.findall(r"^  \['([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\],?$", (ROOT / 'src/learning/catalog.ts').read_text(), re.M)
PALETTE = {
    'ai': ('#102752', '#9ec5ff', 'AI & INTELLIGENT SYSTEMS'),
    'development': ('#102c47', '#85dcf4', 'BUILD WITH CODE'),
    'data': ('#103a3d', '#8be0cf', 'DATA & DISCOVERY'),
    'cloud': ('#15365b', '#a0d7ff', 'CLOUD & INFRASTRUCTURE'),
    'security': ('#24314a', '#bacfff', 'SECURITY & TRUST'),
    'program': ('#123c38', '#a3e2c8', 'PROJECTS & PRACTICE'),
    'design': ('#3d2b22', '#ffcf98', 'DESIGN & EXPERIENCE'),
    'marketing': ('#382a42', '#edc2ed', 'GROWTH & STRATEGY'),
}
FONT_DIR = Path('/System/Library/Fonts/Supplemental')


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ('Arial Bold.ttf' if bold else 'Arial.ttf')), size)


def artwork(slug, name, category, track, focus):
    bg, accent, label = PALETTE[track]
    im = Image.new('RGB', (960, 540), bg)
    d = ImageDraw.Draw(im)
    for x in range(30, 960, 40):
        for y in range(26, 540, 40):
            d.ellipse((x, y, x + 2, y + 2), fill='#41536a')
    d.rounded_rectangle((40, 36, 48, 59), radius=4, fill=accent)
    d.text((62, 36), label, font=font(20, True), fill=accent)
    # Distinct topic titles come directly from the existing catalogue.
    for size in (62, 56, 50, 44):
        f = font(size, True)
        lines, line = [], ''
        for word in name.split():
            candidate = f'{line} {word}'.strip()
            if d.textlength(candidate, font=f) > 525 and line:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
        if len(lines) <= 4:
            break
    y = 130 if len(lines) < 4 else 102
    for line in lines:
        d.text((40, y), line, font=f, fill='#ffffff')
        y += size + 9
    d.line((40, 423, 920, 423), fill='#506075', width=1)
    d.text((40, 450), category.upper(), font=font(19, True), fill=accent)
    d.text((40, 482), 'CODING HUBS  /  SCHOOL OF AI', font=font(16), fill='#c7d4e4')
    d.text((740, 468), 'LEARN. BUILD.', font=font(19, True), fill=accent)
    # Original, topic-specific diagrams; no logos or third-party imagery.
    d.rounded_rectangle((600, 110, 920, 390), radius=24, fill='#f1f6fc')
    ink = bg
    if track == 'ai':
        nodes = [(650, 174), (650, 256), (650, 338), (758, 210), (758, 300), (868, 256)]
        for a, b in [(0, 3), (1, 3), (1, 4), (2, 4), (3, 5), (4, 5)]:
            d.line((*nodes[a], *nodes[b]), fill='#96b4d2', width=4)
        for x, y in nodes:
            d.ellipse((x-14, y-14, x+14, y+14), fill=ink)
            d.ellipse((x-5, y-5, x+5, y+5), fill=accent)
    elif track == 'development':
        d.rounded_rectangle((622, 144, 898, 355), radius=12, fill=ink)
        for x in (642, 658, 674):
            d.ellipse((x, 160, x+6, 166), fill=accent)
        d.text((655, 206), '</>', font=font(66, True), fill=accent)
        for y, width in [(305, 150), (323, 105)]:
            d.rounded_rectangle((649, y, 649+width, y+5), radius=2, fill='#9eb5ce')
    elif track in ('data', 'marketing'):
        d.line((638, 160, 638, 346, 888, 346), fill='#99b1c7', width=3)
        for x, height in [(660, 64), (716, 104), (772, 88), (828, 154)]:
            d.rounded_rectangle((x, 342-height, x+34, 342), radius=5, fill=ink)
        d.line((652, 255, 732, 216, 790, 232, 874, 166), fill='#4178a8', width=5)
        for x, y in [(652, 255), (732, 216), (790, 232), (874, 166)]:
            d.ellipse((x-6, y-6, x+6, y+6), fill='#4178a8')
    elif track == 'cloud':
        d.ellipse((686, 149, 812, 275), fill=ink)
        d.ellipse((644, 198, 738, 288), fill=ink)
        d.ellipse((784, 195, 876, 288), fill=ink)
        d.rectangle((689, 225, 832, 288), fill=ink)
        d.line((760, 288, 760, 319, 660, 319, 860, 319), fill='#7496b8', width=4)
        for x in (660, 760, 860):
            d.rounded_rectangle((x-20, 310, x+20, 345), radius=5, fill=ink)
    elif track == 'security':
        d.polygon([(760, 143), (859, 180), (844, 285), (817, 326), (760, 358), (703, 326), (676, 285), (661, 180)], fill=ink)
        d.arc((731, 211, 789, 274), 180, 360, fill=accent, width=9)
        d.rounded_rectangle((719, 242, 801, 299), radius=8, fill=accent)
        d.ellipse((754, 259, 766, 271), fill=ink)
        d.rectangle((757, 267, 763, 283), fill=ink)
    elif track == 'program':
        for x, label in [(626, '01'), (722, '02'), (818, '03')]:
            d.rounded_rectangle((x, 149, x+76, 351), radius=8, outline='#a3b6c6', width=2)
            d.text((x+16, 168), label, font=font(23, True), fill=ink)
            for y in range(218, 320, 38):
                d.rounded_rectangle((x+10, y, x+66, y+24), radius=4, fill=ink)
    else:
        d.rounded_rectangle((630, 147, 890, 353), radius=10, outline=ink, width=4)
        d.rectangle((645, 163, 875, 182), fill=ink)
        d.rounded_rectangle((645, 201, 749, 301), radius=6, fill='#e5c8a3')
        for y, width in [(206, 100), (233, 76), (260, 92)]:
            d.rounded_rectangle((766, y, 766+width, y+8), radius=3, fill=ink)
        d.rounded_rectangle((766, 287, 850, 315), radius=6, fill=ink)
    im.save(OUT / f'{slug}.webp', 'WEBP', quality=86, method=6)


for row in ROWS:
    artwork(*row)
for track, (_, _, label) in PALETTE.items():
    artwork(f'track-{track}', label.title(), 'Practical learning', track, '')
manifest = {slug: f'/assets/courses/{slug}.webp' for slug, *_ in ROWS}
(ROOT / 'src/learning/course-thumbnails.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated {len(ROWS)} course thumbnails and {len(PALETTE)} track fallbacks.')
