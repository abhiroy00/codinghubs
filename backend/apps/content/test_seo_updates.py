import importlib
import json
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from .models import Blog, ContentRevision
from .sanitize import sanitize_html

DATA = Path(__file__).parent / 'seed_data'
parse = importlib.import_module('apps.content.migrations.0006_publish_seo_blog_posts').parse


class SeoUpdateTests(TestCase):
    def setUp(self):
        self.entry = json.loads((DATA / 'seo_updates_20261128.json').read_text())['updates'][0]
        source = parse((DATA / 'blog_posts' / self.entry['source_file']).read_text())
        current = source['content'].removeprefix(self.entry['prepend_html']).strip()
        self.post = Blog.objects.create(title=source['title'], slug=source['slug'], status='published', published_at=timezone.now(),
                                        content=sanitize_html(current), seo_title=self.entry['fields']['seo_title']['from'], view_count=7)

    def run_update(self, apply=False):
        output = StringIO()
        call_command('apply_seo_updates', slug=self.post.slug, apply=apply, stdout=output)
        self.post.refresh_from_db()
        return output.getvalue()

    def test_dry_run_never_changes_content_metadata_or_revisions(self):
        before = self.post.content
        self.assertIn('ready', self.run_update())
        self.assertEqual(self.post.content, before)
        self.assertFalse(ContentRevision.objects.exists())

    def test_apply_preserves_slug_status_counters_and_a_restore_point(self):
        before = self.post.content
        self.assertIn('applied', self.run_update(apply=True))
        self.assertIn('What does RAG mean in practice?', self.post.content)
        self.assertEqual(self.post.seo_title, self.entry['fields']['seo_title']['to'])
        self.assertEqual((self.post.slug, self.post.status, self.post.view_count), (self.entry['slug'], 'published', 7))
        self.assertEqual(ContentRevision.objects.get().snapshot['content'], before)
        response = self.client.get(f'/blog/{self.post.slug}')
        self.assertContains(response, 'What does RAG mean in practice?')
        self.assertContains(response, '/resources/rag-retrieval-demo.py')
        self.assertContains(response, self.entry['fields']['seo_title']['to'])
        self.assertIn('already_applied', self.run_update(apply=True))
        self.assertEqual(ContentRevision.objects.count(), 1)

    def test_editor_changes_are_never_overwritten(self):
        self.post.content += '<p>New editorial work.</p>'
        self.post.seo_title = 'An editor-selected title'
        self.post.save()
        self.assertIn('editorial_content_changed', self.run_update(apply=True))
        self.assertEqual(self.post.seo_title, 'An editor-selected title')
        self.assertTrue(self.post.content.endswith('<p>New editorial work.</p>'))
        self.assertFalse(ContentRevision.objects.exists())

    def test_custom_metadata_and_drafts_are_preserved(self):
        self.post.seo_title = 'A custom SEO title'
        self.post.save()
        self.run_update(apply=True)
        self.assertEqual(self.post.seo_title, 'A custom SEO title')
        self.post.status = 'draft'
        self.post.save()
        self.assertIn('not_public_or_missing', self.run_update(apply=True))
