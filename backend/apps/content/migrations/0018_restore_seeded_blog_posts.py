"""Restores the seeded blog posts 01-66 (seed_data/blog_posts) that are missing from the database.

Same rule as 0006: a post is created only when its slug does not exist, so posts that are live or edited in the
admin panel are never changed. Restored posts are dated just before the oldest existing post, in file order, so the
posts published most recently stay at the top of the blog. Covers are added only to posts without one (0007).
"""
import importlib
from datetime import timedelta
from pathlib import Path

from django.db import migrations
from django.utils import timezone

LAST_SEEDED_BATCH = 66  # files 67+ are published by their own migrations


def restore(apps, schema_editor):
    from django.conf import settings
    if getattr(settings, 'TESTING', False):
        return
    seeded = importlib.import_module('apps.content.migrations.0006_publish_seo_blog_posts')
    covers = importlib.import_module('apps.content.migrations.0007_seed_blog_covers')
    Blog = apps.get_model('content', 'Blog')
    db = schema_editor.connection.alias
    seed_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_posts'
    files = [p for p in sorted(seed_dir.glob('*.html')) if p.name[:2].isdigit() and int(p.name[:2]) <= LAST_SEEDED_BATCH]
    slugs = [seeded.parse(p.read_text(encoding='utf-8'))['slug'] for p in files]
    existing = set(Blog.objects.using(db).filter(slug__in=slugs).values_list('slug', flat=True))
    oldest = Blog.objects.using(db).exclude(published_at=None).order_by('published_at').values_list('published_at', flat=True).first()

    seeded.publish_files(apps, schema_editor, files)

    anchor = oldest or timezone.now()
    restored = [s for s in slugs if s not in existing]
    for index, slug in enumerate(restored, start=1):
        Blog.objects.using(db).filter(slug=slug).update(published_at=anchor - timedelta(minutes=index))
    covers.add_covers(apps, schema_editor)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0017_publish_ai_courses_after_12th'),
    ]

    operations = [
        migrations.RunPython(restore, migrations.RunPython.noop),
    ]
