"""Publishes the Delhi/NSP/Pitampura guides (seed_data/blog_posts/51-56) with their covers, and retitles the
"choose a coding institute" guide for "best coding institute in Delhi" searches.

Like 0006/0007, nothing edited in the admin panel is overwritten: posts are created only when their slug is missing,
covers are set only when a post has none, and the retitle applies only while the seeded title is unchanged.
"""
import importlib
from pathlib import Path

from django.db import migrations

NEW_POSTS = (
    'coding-classes-near-pitampura', 'coding-courses-in-nsp-delhi', 'software-development-course-delhi',
    'full-stack-developer-course-delhi', 'data-analytics-course-delhi', 'job-oriented-computer-courses-delhi',
)
RETITLE = {
    'slug': 'choose-coding-institute',
    'old_title': 'How to Choose the Right Coding Institute in Delhi NCR',
    'title': 'Best Coding Institute in Delhi: How to Choose the Right One',
    'seo_title': 'Best Coding Institute in Delhi: How to Choose the Right One',
}


def run(apps, schema_editor):
    seeded = importlib.import_module('apps.content.migrations.0006_publish_seo_blog_posts')
    covers = importlib.import_module('apps.content.migrations.0007_seed_blog_covers')
    from django.conf import settings
    if getattr(settings, 'TESTING', False):
        return

    seed_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_posts'
    files = [p for p in sorted(seed_dir.glob('*.html')) if seeded.parse(p.read_text(encoding='utf-8'))['slug'] in NEW_POSTS]
    seeded.publish_files(apps, schema_editor, files)
    covers.add_covers(apps, schema_editor)

    Blog = apps.get_model('content', 'Blog')
    Blog.objects.using(schema_editor.connection.alias).filter(slug=RETITLE['slug'], title=RETITLE['old_title']).update(
        title=RETITLE['title'], seo_title=RETITLE['seo_title'], og_title=RETITLE['seo_title'],
    )


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0008_view_count'),
    ]

    operations = [
        migrations.RunPython(run, migrations.RunPython.noop),
    ]
