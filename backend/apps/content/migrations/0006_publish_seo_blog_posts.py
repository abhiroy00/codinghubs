"""Publishes the first batch of Coding Hubs blog posts from seed_data/blog_posts/*.html.

Each file holds a small header (key: value lines), a line containing only `---`, the article HTML, and an optional FAQ
after a line containing only `===FAQ===` (pairs of `Q:` / `A:` lines). A post is created only when its slug does not exist,
so posts edited or deleted later in the admin panel are never overwritten or recreated by re-running this migration.
"""
import re
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db import migrations
from django.utils import timezone
from django.utils.text import slugify

AUTHOR = 'Coding Hubs Team'
_TAGS = re.compile(r'<[^>]+>')
_WORDS = re.compile(r"[\w'’-]+", re.UNICODE)


def parse(text):
    head, _, rest = text.partition('\n---\n')
    meta = {}
    for line in head.strip().splitlines():
        key, _, value = line.partition(':')
        meta[key.strip()] = value.strip()
    body, _, faq_text = rest.partition('\n===FAQ===\n')
    faq, question = [], None
    for line in faq_text.strip().splitlines():
        line = line.strip()
        if line.startswith('Q:'):
            question = line[2:].strip()
        elif line.startswith('A:') and question:
            faq.append({'q': question, 'a': f'<p>{line[2:].strip()}</p>'})
            question = None
    meta['content'] = body.strip()
    meta['faq'] = faq
    return meta


def publish_posts(apps, schema_editor):
    if getattr(settings, 'TESTING', False):
        return
    seed_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_posts'
    publish_files(apps, schema_editor, sorted(seed_dir.glob('*.html')))


def publish_files(apps, schema_editor, paths):
    """Creates each seeded post whose slug does not exist yet (also used by later migrations)."""
    from apps.content.sanitize import sanitize_html

    Blog = apps.get_model('content', 'Blog')
    BlogCategory = apps.get_model('content', 'BlogCategory')
    BlogTag = apps.get_model('content', 'BlogTag')
    db = schema_editor.connection.alias
    now = timezone.now()

    for index, path in enumerate(paths):
        post = parse(path.read_text(encoding='utf-8'))
        if Blog.objects.using(db).filter(slug=post['slug']).exists():
            continue
        category = None
        if post.get('category'):
            category = BlogCategory.objects.using(db).filter(name=post['category']).first()
            if category is None:
                category = BlogCategory.objects.using(db).create(name=post['category'], slug=slugify(post['category']))
        tags = []
        for name in filter(None, (t.strip() for t in post.get('tags', '').split(','))):
            tag = BlogTag.objects.using(db).filter(name=name).first()
            tags.append(tag or BlogTag.objects.using(db).create(name=name, slug=slugify(name)))

        content = sanitize_html(post['content'])
        words = len(_WORDS.findall(_TAGS.sub(' ', content)))
        blog = Blog.objects.using(db).create(
            title=post['title'],
            slug=post['slug'],
            excerpt=post['excerpt'],
            content=content,
            author_name=AUTHOR,
            category=category,
            reading_time=max(1, round(words / 200)),
            status='published',
            # One second apart, in file order, so the blog lists them in a stable order.
            published_at=now - timedelta(seconds=index),
            seo_title=post.get('seo_title', ''),
            meta_description=post.get('meta_description', ''),
            focus_keyword=post.get('focus_keyword', ''),
            og_title=post.get('seo_title', ''),
            og_description=post.get('meta_description', ''),
            search_intent=post.get('search_intent', ''),
            faq=post['faq'],
        )
        blog.tags.set(tags)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0005_testimonial_rating'),
    ]

    operations = [
        migrations.RunPython(publish_posts, migrations.RunPython.noop),
    ]
