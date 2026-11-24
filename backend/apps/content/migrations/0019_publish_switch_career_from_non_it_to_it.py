"""Publishes the career guide "How to Switch Career from Non-IT to IT Without Experience" (seed_data/blog_posts/72).

Same rules as 0013: created only when the slug is missing; the cover is set only when the post has none.
"""
import importlib

from django.db import migrations

publish = importlib.import_module('apps.content.migrations.0013_publish_what_is_machine_learning').publish


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0018_restore_seeded_blog_posts'),
    ]

    operations = [
        migrations.RunPython(publish(('switch-career-from-non-it-to-it',)), migrations.RunPython.noop),
    ]
