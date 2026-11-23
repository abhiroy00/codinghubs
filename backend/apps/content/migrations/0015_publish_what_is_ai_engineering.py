"""Publishes the guide "What Is AI Engineering? AI Engineer vs ML Engineer vs Data Scientist" (seed_data/blog_posts/69).

Same rules as 0013: created only when the slug is missing; the cover is set only when the post has none.
"""
import importlib

from django.db import migrations

publish = importlib.import_module('apps.content.migrations.0013_publish_what_is_machine_learning').publish


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0014_publish_ai_engineering_course'),
    ]

    operations = [
        migrations.RunPython(publish(('what-is-ai-engineering',)), migrations.RunPython.noop),
    ]
