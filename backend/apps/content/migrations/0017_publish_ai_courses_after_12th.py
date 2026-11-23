"""Publishes the guide "AI Courses After 12th and Graduation: Which One Fits You" (seed_data/blog_posts/71).

Same rules as 0013: created only when the slug is missing; the cover is set only when the post has none.
"""
import importlib

from django.db import migrations

publish = importlib.import_module('apps.content.migrations.0013_publish_what_is_machine_learning').publish


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0016_publish_ai_ml_courses_in_india'),
    ]

    operations = [
        migrations.RunPython(publish(('ai-courses-after-12th-and-graduation',)), migrations.RunPython.noop),
    ]
