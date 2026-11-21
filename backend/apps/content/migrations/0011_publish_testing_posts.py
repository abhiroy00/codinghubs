"""Publishes the Software Testing guides (seed_data/blog_posts/57-66) with their covers.

Same rules as 0006/0007/0009: posts are created only when their slug is missing and covers are set only when a post
has none, so nothing edited in the admin panel is overwritten. They are dated now, so they appear first on the blog.
"""
import importlib
from pathlib import Path

from django.db import migrations

NEW_POSTS = (
    'what-is-automation-testing', 'manual-vs-automation-testing', 'selenium-tutorial-for-beginners', 'playwright-vs-selenium',
    'selenium-interview-questions', 'api-testing-tutorial', 'page-object-model', 'automation-testing-roadmap',
    'test-automation-framework', 'how-to-write-test-cases',
)


def run(apps, schema_editor):
    from django.conf import settings
    if getattr(settings, 'TESTING', False):
        return
    seeded = importlib.import_module('apps.content.migrations.0006_publish_seo_blog_posts')
    covers = importlib.import_module('apps.content.migrations.0007_seed_blog_covers')
    seed_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_posts'
    files = [p for p in sorted(seed_dir.glob('*.html')) if seeded.parse(p.read_text(encoding='utf-8'))['slug'] in NEW_POSTS]
    seeded.publish_files(apps, schema_editor, files)
    covers.add_covers(apps, schema_editor)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0010_search_console_status'),
    ]

    operations = [
        migrations.RunPython(run, migrations.RunPython.noop),
    ]
