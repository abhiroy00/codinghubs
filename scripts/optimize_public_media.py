"""Compress website media, keeping only smaller valid results and backing up every original.

Requires Pillow and ffmpeg. Dry run by default:
python scripts/optimize_public_media.py --ffmpeg /path/to/ffmpeg
Add --apply --backup-dir /outside/repo/media-originals to write the results.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil
import subprocess
import tempfile
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / 'frontend/public'


def optimize(source, options):
    before = source.stat().st_size
    relative = source.relative_to(ROOT)
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / source.name
        if source.suffix == '.mp4':
            # Background clips need no audio; demo classes keep their spoken audio and full duration.
            background = 'assets/hero/video' in relative.as_posix()
            command = [options.ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                       '-map', '0:v:0', '-map', '0:a?', '-vf',
                       "scale='min(iw,960)':-2,fps=20" if background else "scale='min(iw,720)':-2,fps=24",
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '29' if background else '27',
                       '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart', '-map_metadata', '-1']
            command += ['-an'] if background else ['-c:a', 'aac', '-b:a', '80k']
            subprocess.run(command + [str(target)], check=True, capture_output=True)
            # Decode the entire candidate before accepting it; no shortened clips or corrupt frames.
            subprocess.run([options.ffmpeg, '-nostdin', '-v', 'error', '-xerror', '-i', str(target),
                            '-f', 'null', '-'], check=True, capture_output=True)
        else:
            with Image.open(source) as original:
                image = ImageOps.exif_transpose(original)
                if source.suffix.lower() in ('.jpg', '.jpeg'):
                    image.convert('RGB').save(target, 'JPEG', quality=80, optimize=True, progressive=True)
                elif source.suffix == '.webp':
                    image.save(target, 'WEBP', quality=78, method=6)
                else:
                    image.save(target, 'PNG', optimize=True)
            with Image.open(target) as check:
                check.verify()
        after = target.stat().st_size
        keep = after < before * .9
        if keep and options.apply:
            backup = options.backup_dir / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            # Never overwrite an earlier original when rerunning.
            if not backup.exists():
                shutil.copy2(source, backup)
            shutil.copyfile(target, source)
    return {'path': relative.as_posix(), 'before': before, 'after': after if keep else before,
            'kept': keep, 'applied': keep and options.apply}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup-dir', type=Path)
    parser.add_argument('--report', type=Path, default=Path('/tmp/codinghubs-media-report.json'))
    parser.add_argument('--kind', choices=['all', 'images', 'videos'], default='all')
    options = parser.parse_args()
    if options.apply and (not options.backup_dir or options.backup_dir.resolve().is_relative_to(ROOT.resolve())):
        parser.error('--apply requires a backup directory outside frontend/public')
    extensions = {'.jpg', '.jpeg', '.webp', '.png', '.mp4'}
    files = [p for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in extensions
             and (options.kind == 'all' or (p.suffix == '.mp4') == (options.kind == 'videos'))]
    rows = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        for row in pool.map(lambda source: optimize(source, options), files):
            rows.append(row)
            if row['kept']:
                print(f"{row['path']}: {row['before']} -> {row['after']} bytes", flush=True)
    options.report.parent.mkdir(parents=True, exist_ok=True)
    options.report.write_text(json.dumps(rows, indent=2) + '\n')
    before, after = sum(r['before'] for r in rows), sum(r['after'] for r in rows)
    print(f'{len(rows)} files: {before:,} -> {after:,} bytes ({(1-after/before)*100:.1f}% smaller)')


if __name__ == '__main__':
    main()
