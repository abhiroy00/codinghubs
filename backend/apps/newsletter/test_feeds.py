from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from . import feeds

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=dt_timezone.utc)
RSS_SOURCE = feeds.Source('rss-test', 'RSS Test', 'https://news.example.com/feed', 'https://news.example.com/', ('news.example.com',))
ATOM_SOURCE = feeds.Source('atom-test', 'Atom Test', 'https://blog.example.org/atom', 'https://blog.example.org/', ('example.org',))

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>News</title>
<item><title>Fine-tuning small language models for code review</title>
  <link>https://news.example.com/posts/fine-tuning?utm_source=rss&amp;utm_medium=feed&amp;id=7#comments</link>
  <description>&lt;p&gt;How a team evaluated an &lt;b&gt;LLM&lt;/b&gt; for pull request review.&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;</description>
  <pubDate>Mon, 16 Nov 2026 09:30:00 +0000</pubDate></item>
<item><title>Cricket world cup final draws record crowd</title>
  <link>https://news.example.com/sport/final</link><description>Sports news.</description>
  <pubDate>Mon, 16 Nov 2026 10:00:00 +0000</pubDate></item>
<item><title>Black Friday deals on laptops for developers</title>
  <link>https://news.example.com/deals</link><description>Discounts.</description>
  <pubDate>Mon, 16 Nov 2026 11:00:00 +0000</pubDate></item>
<item><title>A quiet week</title>
  <link>https://news.example.com/quiet</link><description>Team notes about Python and other things.</description>
  <pubDate>Mon, 16 Nov 2026 11:00:00 +0000</pubDate></item>
<item><title>Postgres 19 adds faster SQL joins</title>
  <link>https://news.example.com/postgres-19</link><description>Database release notes.</description>
  <pubDate>Tue, 17 Nov 2026 08:00:00 +0000</pubDate></item>
<item><title>Off-site link about Kubernetes</title>
  <link>https://evil.example.net/kubernetes</link><description>Cloud.</description>
  <pubDate>Tue, 17 Nov 2026 08:00:00 +0000</pubDate></item>
<item><title>Kubernetes item with no date</title><link>https://news.example.com/k8s</link></item>
<item><title>JavaScript item with a broken date</title><link>https://news.example.com/js</link><pubDate>not a date</pubDate></item>
<item><title>Docker article from the future</title><link>https://news.example.com/future</link><pubDate>Mon, 01 Jan 2029 00:00:00 +0000</pubDate></item>
<item><title>Docker article from long ago</title><link>https://news.example.com/old</link><pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate></item>
<item><title>javascript: link test for React</title><link>javascript:alert(1)</link><pubDate>Mon, 16 Nov 2026 09:30:00 +0000</pubDate></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Blog</title>
<entry><title>Fine-tuning small language models for code review</title>
  <link rel="alternate" href="https://blog.example.org/copy-of-same-story"/>
  <updated>2026-11-15T09:00:00Z</updated><summary>Duplicate headline from another publisher.</summary></entry>
<entry><title type="html">Deploying AI agents on serverless cloud functions</title>
  <link rel="self" href="https://blog.example.org/self.xml"/><link rel="alternate" href="https://www.example.org/agents"/>
  <published>2026-11-17T12:00:00+05:30</published><summary type="html">&lt;em&gt;Step by step&lt;/em&gt; guide.</summary></entry>
</feed>"""


class ParsingTests(TestCase):
    def test_rss_keeps_only_valid_on_topic_items(self):
        items = feeds.parse_feed(RSS, RSS_SOURCE, NOW)
        self.assertEqual([item['title'] for item in items], ['Fine-tuning small language models for code review', 'Postgres 19 adds faster SQL joins'])
        first = items[0]
        self.assertEqual(first['url'], 'https://news.example.com/posts/fine-tuning?id=7')
        self.assertEqual(first['summary'], 'How a team evaluated an LLM for pull request review.')
        self.assertNotIn('<', first['summary'])
        self.assertEqual(first['published_at'], '2026-11-16T09:30:00Z')
        self.assertEqual(first['categories'][0], 'ai')
        self.assertEqual(items[1]['categories'], ['data'])
        self.assertEqual(first['source_name'], 'RSS Test')

    def test_atom_uses_alternate_link_and_normalises_timezone(self):
        items = feeds.parse_feed(ATOM, ATOM_SOURCE, NOW)
        agents = next(item for item in items if 'agents' in item['url'])
        self.assertEqual(agents['url'], 'https://www.example.org/agents')
        self.assertEqual(agents['published_at'], '2026-11-17T06:30:00Z')
        self.assertIn('ai', agents['categories'])
        self.assertIn('cloud', agents['categories'])

    def test_malformed_and_unsafe_documents_raise(self):
        for body in [b'<rss><channel><item>', b'not xml at all', b'<html><body>Oops</body></html>',
                     b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><rss><channel/></rss>', b'x' * (feeds.MAX_BYTES + 1)]:
            with self.subTest(body=body[:30]), self.assertRaises(feeds.FeedError):
                feeds.parse_feed(body, RSS_SOURCE, NOW)

    def test_doctype_inside_article_markup_is_not_a_dtd(self):
        body = RSS.replace(b'<description>Database release notes.</description>', b'<description><![CDATA[<!DOCTYPE html><p>Database release notes.</p>]]></description>')
        self.assertIn('Postgres 19 adds faster SQL joins', [item['title'] for item in feeds.parse_feed(body, RSS_SOURCE, NOW)])

    def test_classification_rejects_ambiguous_and_off_topic(self):
        self.assertEqual(feeds.classify('Election night results', 'Python dashboards'), [])
        self.assertEqual(feeds.classify('A quiet week', 'notes on Python'), [])  # summary-only mention is ambiguous
        self.assertEqual(feeds.classify('Students return to campus', 'A new term begins'), [])  # education alone is not tech
        self.assertEqual(feeds.classify('Learn Python testing for beginners', ''), ['software', 'education'])


@override_settings(TECH_FEED_TTL=1800, TECH_FEED_REFRESH_ON_REQUEST=True)
class RefreshTests(TestCase):
    def setUp(self):
        cache.clear()
        self.sources = (RSS_SOURCE, ATOM_SOURCE)

    def fake(self, failing=()):
        def fetch(source):
            if source.id in failing:
                raise TimeoutError('provider timed out')
            return {'rss-test': RSS, 'atom-test': ATOM}[source.id]
        return fetch

    def test_merge_deduplicates_and_sorts_newest_first(self):
        with patch('django.utils.timezone.now', return_value=NOW):
            data = feeds.refresh(self.sources, self.fake())
        titles = [item['title'] for item in data['items']]
        self.assertEqual(titles, ['Postgres 19 adds faster SQL joins', 'Deploying AI agents on serverless cloud functions', 'Fine-tuning small language models for code review'])
        self.assertEqual(titles.count('Fine-tuning small language models for code review'), 1)

    def test_failed_provider_keeps_last_validated_items(self):
        with patch('django.utils.timezone.now', return_value=NOW):
            feeds.refresh(self.sources, self.fake())
            data = feeds.refresh(self.sources, self.fake(failing={'rss-test'}))
        self.assertFalse(data['sources']['rss-test']['ok'])
        self.assertIn('TimeoutError', data['sources']['rss-test']['error'])
        self.assertIn('Postgres 19 adds faster SQL joins', [item['title'] for item in data['items']])

    def test_malformed_response_counts_as_failure_without_losing_previous_items(self):
        with patch('django.utils.timezone.now', return_value=NOW):
            feeds.refresh(self.sources, self.fake())
            data = feeds.refresh(self.sources, lambda source: b'<rss><broken')
        self.assertFalse(any(state['ok'] for state in data['sources'].values()))
        self.assertEqual(len(data['items']), 3)

    def test_no_cache_and_all_providers_failing_is_an_honest_empty_feed(self):
        with patch('django.utils.timezone.now', return_value=NOW), patch.object(feeds, 'SOURCES', self.sources), patch.object(feeds, 'fetch', self.fake(failing={'rss-test', 'atom-test'})):
            response = APIClient().get('/api/newsletter/feed/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['items'], [])
        self.assertEqual(response.data['categories'], [])
        self.assertTrue(all(not source['ok'] for source in response.data['sources']))

    def test_api_filters_by_category_and_rejects_unknown_category(self):
        with patch('django.utils.timezone.now', return_value=NOW), patch.object(feeds, 'SOURCES', self.sources), patch.object(feeds, 'fetch', self.fake()):
            client = APIClient()
            everything = client.get('/api/newsletter/feed/')
            data_only = client.get('/api/newsletter/feed/?category=data')
            bad = client.get('/api/newsletter/feed/?category=sports')
        self.assertEqual(everything.status_code, 200)
        self.assertIn('no-store', everything['Cache-Control'])  # site-wide API policy
        self.assertEqual([item['title'] for item in data_only.data['items']], ['Postgres 19 adds faster SQL joins'])
        self.assertEqual({c['id'] for c in everything.data['categories']} >= {'ai', 'data', 'cloud'}, True)
        self.assertEqual(bad.status_code, 400)

    def test_fresh_cache_is_served_without_refetching(self):
        calls = []
        def fetch(source):
            calls.append(source.id)
            return {'rss-test': RSS, 'atom-test': ATOM}[source.id]
        with patch('django.utils.timezone.now', return_value=NOW), patch.object(feeds, 'SOURCES', self.sources), patch.object(feeds, 'fetch', fetch):
            APIClient().get('/api/newsletter/feed/')
            APIClient().get('/api/newsletter/feed/')
        self.assertEqual(sorted(calls), ['atom-test', 'rss-test'])
