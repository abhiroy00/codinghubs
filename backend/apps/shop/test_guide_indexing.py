from django.test import TestCase
from django.utils import timezone

from .models import ProjectGuide


class GuideIndexingTests(TestCase):
    def guide(self, **kwargs):
        return ProjectGuide.objects.create(title='Practice guide', slug='practice-guide', status='published', published_at=timezone.now(), **kwargs)

    def test_out_of_range_listing_pages_are_real_404s(self):
        self.guide()
        for path in ('/projects?page=9999', '/project-guides?page=9999'):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertIn('noindex', response['X-Robots-Tag'])

    def test_empty_published_guide_stays_readable_but_is_not_submitted_for_indexing(self):
        guide = self.guide(summary='Api failed.')
        response = self.client.get('/project-guides/practice-guide')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'noindex, follow')
        self.assertEqual(self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots'], 'noindex, follow')
        xml = self.client.get('/sitemap-shop.xml').content.decode()
        self.assertNotIn('/project-guides</loc>', xml)
        self.assertNotIn('/project-guides/practice-guide', xml)
        self.assertIn('noindex, follow', self.client.get('/project-guides').content.decode())
        self.assertFalse(self.client.get('/api/project-guides/').json()['indexable'])
        guide.refresh_from_db()
        self.assertEqual(guide.status, 'published')

    def test_enabled_public_instruction_restores_eligibility_and_the_listing(self):
        self.guide(sections=[{'key': 'setup', 'title': 'Setup', 'html': '<p>Run the example, inspect the output and explain the result.</p>', 'enabled': True}])
        xml = self.client.get('/sitemap-shop.xml').content.decode()
        self.assertIn('/project-guides</loc>', xml)
        self.assertIn('/project-guides/practice-guide</loc>', xml)
        self.assertTrue(self.client.get('/api/project-guides/').json()['indexable'])
        self.assertTrue(self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots'].startswith('index'))

    def test_error_summary_with_generic_section_requires_repair_before_indexing(self):
        guide = self.guide(summary='Api failed', sections=[{'key': 'guidance', 'title': 'Guidance', 'html': 'i have to improve my project', 'enabled': True}])
        self.assertEqual(self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots'], 'noindex, follow')
        self.assertContains(self.client.get('/project-guides/practice-guide'), 'noindex, follow')
        self.assertNotIn('/project-guides/practice-guide', self.client.get('/sitemap-shop.xml').content.decode())
        guide.summary = 'Practice setting up and testing a project.'
        guide.sections[0]['html'] = '<p>Run the example and compare its output with the expected result.</p>'
        guide.save()
        self.assertTrue(self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots'].startswith('index'))

    def test_private_disabled_or_placeholder_sections_do_not_qualify(self):
        guide = self.guide(access_type='account', sections=[{'key': 'code', 'title': 'Code', 'html': '<p>Private instructional content.</p>', 'enabled': True}])
        self.assertEqual(self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots'], 'noindex, follow')
        for section in [
            {'key': 'code', 'title': 'Code', 'html': '<p>Api failed.</p>', 'enabled': True, 'preview': True},
            {'key': 'code', 'title': 'Code', 'html': '<p>Actual instructions.</p>', 'enabled': False, 'preview': True},
            {'key': 'code', 'title': 'Code', 'html': '<p>Actual instructions.</p>', 'enabled': True, 'preview': True},
        ]:
            guide.sections = [section]
            guide.save()
            robots = self.client.get('/api/project-guides/practice-guide/').json()['seo']['robots']
            self.assertEqual(robots.startswith('index'), section['enabled'] and 'Actual instructions' in section['html'])
