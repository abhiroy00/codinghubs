"""Publishes the guide "AI Engineering Course: What You Learn, Projects and Career Path" (seed_data/blog_posts/68).

Same rules as 0013: created only when the slug is missing; the cover is set only when the post has none.
"""
import importlib

from django.db import migrations

publish = importlib.import_module('apps.content.migrations.0013_publish_what_is_machine_learning').publish


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0013_publish_what_is_machine_learning'),
    ]

    operations = [
        migrations.RunPython(publish(('ai-engineering-course',)), migrations.RunPython.noop),
    ]
