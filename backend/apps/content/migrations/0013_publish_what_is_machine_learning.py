"""Publishes the AI/ML guide "What Is ML (Machine Learning)?" (seed_data/blog_posts/67) with its cover.

Same rules as 0011: the post is created only when its slug is missing and the cover is set only when a post has none,
so nothing edited or deleted in the admin panel is overwritten or brought back.
"""
import importlib
from pathlib import Path

from django.db import migrations

NEW_POSTS = ('what-is-machine-learning',)


def publish(new_posts):
    def run(apps, schema_editor):
        from django.conf import settings
        if getattr(settings, 'TESTING', False):
            return
        seeded = importlib.import_module('apps.content.migrations.0006_publish_seo_blog_posts')
        covers = importlib.import_module('apps.content.migrations.0007_seed_blog_covers')
        seed_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_posts'
        files = [p for p in sorted(seed_dir.glob('*.html')) if seeded.parse(p.read_text(encoding='utf-8'))['slug'] in new_posts]
        seeded.publish_files(apps, schema_editor, files)
        covers.add_covers(apps, schema_editor)
    return run


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0012_blog_image_caption_prompt'),
    ]

    operations = [
        migrations.RunPython(publish(NEW_POSTS), migrations.RunPython.noop),
    ]
