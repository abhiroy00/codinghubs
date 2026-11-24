"""SEO, answer-engine and generative-engine signals on the blog: schema, breadcrumbs, freshness, RSS and llms.txt."""
import json
import re
from datetime import timedelta
from xml.etree import ElementTree

from django.utils import timezone

from .models import Blog, BlogCategory
from .tests import ContentBase


def json_ld_nodes(html):
    nodes = []
    for blob in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        data = json.loads(blob)
        nodes += data.get('@graph', [data])
    return nodes


class BlogGeoSeoTests(ContentBase):
    def publish(self, title='Sigmoid vs Softmax', **kw):
        category = BlogCategory.objects.get_or_create(name='Artificial Intelligence', slug='artificial-intelligence')[0]
        b = self.make_blog(title, excerpt='When to use sigmoid and when softmax.', category=category.pk,
                           focus_keyword='sigmoid vs softmax', secondary_keywords=['softmax function'], tag_names=['Deep Learning'],
                           content='<p><strong>Sigmoid squashes one score; softmax turns many scores into probabilities.</strong></p><h2>Formula</h2><p>More text.</p>',
                           faq=[{'q': 'Is softmax a probability?', 'a': 'Yes, its outputs sum to one.'}], **kw)
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        return b

    def test_article_schema_breadcrumb_and_open_graph_article_tags(self):
        b = self.publish()
        html = self.as_user(None).get(f'/blog/{b["slug"]}').content.decode()
        nodes = {n['@type']: n for n in json_ld_nodes(html)}
        post = nodes['BlogPosting']
        url = f'https://codinghubs.in/blog/{b["slug"]}'
        self.assertEqual(post['url'], url)
        self.assertEqual(post['articleSection'], 'Artificial Intelligence')
        self.assertEqual(post['keywords'], 'sigmoid vs softmax, softmax function, Deep Learning')
        self.assertGreater(post['wordCount'], 5)
        self.assertRegex(post['timeRequired'], r'^PT\d+M$')
        self.assertEqual(post['isPartOf']['@type'], 'Blog')
        self.assertIn('.ins-prose > p:first-of-type', post['speakable']['cssSelector'])
        crumbs = [i['name'] for i in nodes['BreadcrumbList']['itemListElement']]
        self.assertEqual(crumbs, ['Home', 'Blog', 'Artificial Intelligence', 'Sigmoid vs Softmax'])
        self.assertIn('FAQPage', nodes)
        # The breadcrumb in the schema is also visible on the page.
        self.assertIn('<nav class="ins-crumbs" aria-label="Breadcrumb"><a href="/">Home</a>', html)
        self.assertIn('<meta property="article:section" content="Artificial Intelligence">', html)
        self.assertIn('<meta property="article:tag" content="Deep Learning">', html)
        self.assertIn('<meta property="article:published_time"', html)
        self.assertIn('<link rel="alternate" type="application/rss+xml" title="Coding Hubs School of AI Blog" href="https://codinghubs.in/blog/feed.xml">', html)

    def test_updated_date_shows_only_after_a_real_later_edit(self):
        b = self.publish()
        anon = self.as_user(None)
        self.assertNotIn('Updated <time', anon.get(f'/blog/{b["slug"]}').content.decode())
        Blog.objects.filter(pk=b['id']).update(published_at=timezone.now() - timedelta(days=10))
        html = anon.get(f'/blog/{b["slug"]}').content.decode()
        self.assertIn('Updated <time datetime="', html)

    def test_blog_listing_has_an_item_list_of_its_posts(self):
        b = self.publish()
        html = self.as_user(None).get('/blog').content.decode()
        page = next(n for n in json_ld_nodes(html) if n['@type'] == 'CollectionPage')
        items = page['mainEntity']['itemListElement']
        self.assertEqual(items[0], {'@type': 'ListItem', 'position': 1, 'url': f'https://codinghubs.in/blog/{b["slug"]}', 'name': 'Sigmoid vs Softmax'})
        self.assertIn('application/rss+xml', html)

    def test_rss_feed_lists_published_posts_only(self):
        live = self.publish()
        self.make_blog('Unpublished draft')
        response = self.as_user(None).get('/blog/feed.xml')
        self.assertEqual(response.status_code, 200)
        root = ElementTree.fromstring(response.content)
        links = [i.findtext('link') for i in root.iter('item')]
        self.assertEqual(links, [f'https://codinghubs.in/blog/{live["slug"]}'])
        self.assertEqual(root.find('channel/language').text, 'en-IN')

    def test_llms_txt_maps_the_site_and_published_articles(self):
        live = self.publish()
        self.make_blog('Unpublished draft')
        response = self.as_user(None).get('/llms.txt')
        text = response.content.decode()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response['Content-Type'].startswith('text/plain'))
        self.assertTrue(text.startswith('# Coding Hubs School of AI\n'))
        self.assertIn(f'- [Sigmoid vs Softmax](https://codinghubs.in/blog/{live["slug"]})', text)
        self.assertNotIn('Unpublished draft', text)
