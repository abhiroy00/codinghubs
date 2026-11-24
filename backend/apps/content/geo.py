"""Machine-readable entry points for search and answer engines: the blog RSS feed and /llms.txt.

Both list only published posts (the same queryset as the public blog) and use clean canonical URLs.
"""
from django.conf import settings
from django.contrib.syndication.views import Feed
from django.http import HttpResponse
from django.utils.feedgenerator import Rss201rev2Feed
from django.views.decorators.http import require_GET

from .sanitize import plain_text
from .views import public_blog_qs

SITE = settings.SITE_URL


class BlogFeed(Feed):
    """/blog/feed.xml: the 30 newest posts, so feed readers and AI crawlers find new articles quickly."""

    feed_type = Rss201rev2Feed
    title = 'Coding Hubs School of AI Blog'
    description = 'Guides on AI, machine learning, Python, web development and IT careers in India from Coding Hubs School of AI, Delhi.'
    language = 'en-IN'

    def link(self):
        return f'{SITE}/blog'

    def feed_url(self):
        return f'{SITE}/blog/feed.xml'

    def items(self):
        return public_blog_qs().order_by('-published_at', '-id')[:30]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return item.meta_description or item.excerpt or plain_text(item.content)[:300]

    def item_link(self, item):
        return f'{SITE}/blog/{item.slug}'

    def item_guid(self, item):
        return f'{SITE}/blog/{item.slug}'

    item_guid_is_permalink = True

    def item_pubdate(self, item):
        return item.published_at

    def item_updateddate(self, item):
        return item.updated_at

    def item_categories(self, item):
        return [item.category.name] if item.category_id else []

    def item_author_name(self, item):
        return item.author_name or 'Coding Hubs School of AI'


@require_GET
def llms_txt(request):
    """/llms.txt (llmstxt.org): a plain-Markdown map of the site for AI assistants, with every published article."""
    lines = [
        '# Coding Hubs School of AI',
        '',
        '> An AI and programming institute in Delhi, India, offering live classroom and online courses in AI, '
        'machine learning, data, full-stack development, cloud and cybersecurity, with free interview-preparation '
        'guides and a free 2-hour demo class.',
        '',
        'Facts on this site are written for students and career switchers in India. Salaries and fees in articles '
        'are approximate ranges, not guarantees.',
        '',
        '## Main pages',
        '',
        f'- [Courses]({SITE}/courses/): all courses with syllabus, tools and projects',
        f'- [Interview preparation]({SITE}/interview/): free topic-wise interview questions, answers and lessons',
        f'- [Blog]({SITE}/blog): guides on AI, coding and IT careers',
        f'- [Locations]({SITE}/locations/): classroom and online options across Delhi NCR and nearby cities',
        '',
        '## Blog articles',
        '',
    ]
    for post in public_blog_qs().order_by('-published_at', '-id'):
        summary = (post.meta_description or post.excerpt or '').replace('\n', ' ').strip()
        lines.append(f'- [{post.title}]({SITE}/blog/{post.slug})' + (f': {summary}' if summary else ''))
    response = HttpResponse('\n'.join(lines) + '\n', content_type='text/plain; charset=utf-8')
    response['Cache-Control'] = 'public, max-age=3600'
    return response
