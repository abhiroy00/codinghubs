import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.db import migrations
from django.utils import timezone


SLUG = 'what-is-an-ai-engineer'


def publish_ai_engineer_article(apps, schema_editor):
    if getattr(settings, 'TESTING', False):
        return

    Blog = apps.get_model('content', 'Blog')
    BlogCategory = apps.get_model('content', 'BlogCategory')
    BlogTag = apps.get_model('content', 'BlogTag')
    db_alias = schema_editor.connection.alias
    blogs = Blog.objects.using(db_alias)
    if blogs.filter(slug=SLUG).exists():
        return

    seed_dir = Path(__file__).resolve().parent.parent / 'seed_data'
    article = json.loads((seed_dir / 'ai_engineer_article.json').read_text(encoding='utf-8'))

    def store_image(filename):
        path = f'blog/ai-engineer/{filename}'
        if not default_storage.exists(path):
            with (seed_dir / 'ai-engineer-images' / filename).open('rb') as image:
                path = default_storage.save(path, File(image, name=filename))
        return f'{settings.MEDIA_URL.rstrip("/")}/{path}'

    category, _ = BlogCategory.objects.using(db_alias).get_or_create(
        name=article['category']['name'],
        defaults={'slug': article['category']['slug']},
    )
    tags = []
    for data in article['tags']:
        tag, _ = BlogTag.objects.using(db_alias).get_or_create(
            name=data['name'],
            defaults={'slug': data['slug']},
        )
        tags.append(tag)

    featured_image = store_image(article['featured_image']['file'])
    gallery = [
        {'src': store_image(item['file']), 'alt': item['alt']}
        for item in article['gallery']
    ]
    blog = blogs.create(
        title=article['title'],
        slug=article['slug'],
        excerpt=article['excerpt'],
        content=article['content'],
        author_name=article['author_name'],
        author_title=article['author_title'],
        featured_image=featured_image,
        featured_image_alt=article['featured_image']['alt'],
        gallery=gallery,
        category=category,
        reading_time=article['reading_time'],
        status='published',
        published_at=timezone.now(),
        seo_title=article['seo_title'],
        meta_description=article['meta_description'],
        focus_keyword=article['focus_keyword'],
        og_title=article['og_title'],
        og_description=article['og_description'],
        og_image=featured_image,
        search_intent=article['search_intent'],
        faq=article['faq'],
    )
    blog.tags.set(tags)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_blog_gallery'),
    ]

    operations = [
        migrations.RunPython(publish_ai_engineer_article, migrations.RunPython.noop),
    ]
