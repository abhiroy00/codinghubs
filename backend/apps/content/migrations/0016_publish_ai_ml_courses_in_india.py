"""Publishes the guide "AI ML Courses in India 2026: Types, Syllabus and How to Choose" (seed_data/blog_posts/70).

Same rules as 0013: created only when the slug is missing; the cover is set only when the post has none.
"""
import importlib

from django.db import migrations

publish = importlib.import_module('apps.content.migrations.0013_publish_what_is_machine_learning').publish


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0015_publish_what_is_ai_engineering'),
    ]

    operations = [
        migrations.RunPython(publish(('ai-ml-courses-in-india',)), migrations.RunPython.noop),
    ]
