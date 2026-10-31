"""Shrink the images that were uploaded before uploads were resized (a raw 1 MB+ PNG cover is the usual cause of a slow page).

    python manage.py optimize_media            # dry run: lists what would change and how much it saves
    python manage.py optimize_media --apply    # writes a WebP next to each big image and points the database at it

The original files are kept (nothing is deleted), so the change can be undone by restoring the old paths.
Only files below MEDIA_ROOT/uploads are touched; private files are never read.
"""
import json
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import models, transaction
from PIL import Image

MAX_SIDE = 1600
MIN_BYTES = 150_000
EXTS = {'.png', '.jpg', '.jpeg'}


def _swap(value, mapping):
    """Replace old media URLs inside strings / lists / dicts; returns (new_value, changed)."""
    if isinstance(value, str):
        out = value
        for old, new in mapping.items():
            if old in out:
                out = out.replace(old, new)
        return out, out != value
    if isinstance(value, list):
        pairs = [_swap(v, mapping) for v in value]
        return [p[0] for p in pairs], any(p[1] for p in pairs)
    if isinstance(value, dict):
        pairs = {k: _swap(v, mapping) for k, v in value.items()}
        return {k: p[0] for k, p in pairs.items()}, any(p[1] for p in pairs.values())
    return value, False


class Command(BaseCommand):
    help = 'Convert large uploaded PNG/JPEG images to WebP (max 1600px) and update every reference in the database.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Write the WebP files and update the database (default: dry run).')

    def handle(self, *args, apply=False, **opts):
        root = Path(settings.MEDIA_ROOT) / 'uploads'
        if not root.is_dir():
            self.stdout.write(f'No uploads folder at {root}. Nothing to do.')
            return
        mapping, saved = {}, 0
        for path in sorted(root.rglob('*')):
            if path.suffix.lower() not in EXTS or not path.is_file() or path.stat().st_size < MIN_BYTES:
                continue
            target = path.with_suffix('.webp')
            try:
                with Image.open(path) as img:
                    img.load()
                    img.thumbnail((MAX_SIDE, MAX_SIDE * 4), Image.LANCZOS)
                    if apply:
                        img.save(target, 'WEBP', quality=82, method=4)
                        new_size = target.stat().st_size
                    else:
                        from io import BytesIO

                        buf = BytesIO()
                        img.save(buf, 'WEBP', quality=82, method=4)
                        new_size = buf.tell()
            except (OSError, Image.DecompressionBombError) as exc:
                self.stderr.write(f'skip {path.name}: {exc}')
                continue
            old_size = path.stat().st_size
            if new_size >= old_size * 0.8:
                if apply and target.exists():
                    target.unlink()
                continue
            rel = path.relative_to(Path(settings.MEDIA_ROOT)).as_posix()
            mapping[f'{settings.MEDIA_URL}{rel}'] = f'{settings.MEDIA_URL}{target.relative_to(Path(settings.MEDIA_ROOT)).as_posix()}'
            saved += old_size - new_size
            self.stdout.write(f'{rel}: {old_size // 1024} KB -> {new_size // 1024} KB')
        if not mapping:
            self.stdout.write('No large images found.')
            return
        self.stdout.write(f'{len(mapping)} image(s), about {saved // 1024} KB smaller.')
        if not apply:
            self.stdout.write('Dry run. Re-run with --apply to write the files and update the database.')
            return
        changed = 0
        with transaction.atomic():
            for app in ('content', 'shop'):
                for model in apps.get_app_config(app).get_models():
                    fields = [f for f in model._meta.get_fields() if isinstance(f, (models.CharField, models.TextField, models.JSONField)) and not f.primary_key]
                    if not fields:
                        continue
                    for obj in model.objects.all().iterator():
                        dirty = []
                        for f in fields:
                            new, did = _swap(getattr(obj, f.name), mapping)
                            if did:
                                setattr(obj, f.name, new)
                                dirty.append(f.name)
                        if dirty:
                            model.objects.filter(pk=obj.pk).update(**{n: getattr(obj, n) for n in dirty})
                            changed += 1
        self.stdout.write(self.style.SUCCESS(f'Updated {changed} database row(s). Originals were kept.'))
