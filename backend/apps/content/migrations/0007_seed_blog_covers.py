"""Gives the seeded blog posts a simple title cover (seed_data/blog_covers/<slug>.jpg, built by scripts/make_blog_covers.py).

Only posts that still have no cover are changed, so covers chosen later in the admin panel are never replaced.
"""
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.db import migrations


def add_covers(apps, schema_editor):
    if getattr(settings, 'TESTING', False):
        return
    Blog = apps.get_model('content', 'Blog')
    db = schema_editor.connection.alias
    cover_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_covers'
    for cover in sorted(cover_dir.glob('*.jpg')):
        blog = Blog.objects.using(db).filter(slug=cover.stem, featured_image='').first()
        if blog is None:
            continue
        path = f'blog/covers/{cover.name}'
        if not default_storage.exists(path):
            with cover.open('rb') as fh:
                path = default_storage.save(path, File(fh, name=cover.name))
        url = f'{settings.MEDIA_URL.rstrip("/")}/{path}'
        # og_image stays empty: social cards fall back to the cover, so a cover changed in the admin also changes them.
        Blog.objects.using(db).filter(pk=blog.pk).update(
            featured_image=url,
            featured_image_alt=f'Cover image with the title "{blog.title}"'[:200],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0006_publish_seo_blog_posts'),
    ]

    operations = [
        migrations.RunPython(add_covers, migrations.RunPython.noop),
    ]
