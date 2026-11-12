from django.test import TestCase, override_settings
from apps.jobs.models import Job
from apps.tutors.models import Tutor


@override_settings(FRONTEND_SHELL_URL='', SITE_URL='https://codinghubs.in')
class DirectorySeoTests(TestCase):
    def setUp(self):
        self.tutor = Tutor.objects.create(full_name='Test Tutor', designation='Python tutor', bio='Learn Python with practical exercises.')
        self.job = Job.objects.create(title='Python Developer', company_name='Test Employer', location='Delhi', description='Build and maintain Python APIs.', is_published=True)

    def test_listings_expose_public_records_and_detail_links(self):
        Tutor.objects.create(full_name='Inactive Tutor', designation='Tutor', bio='Hidden', is_active=False)
        Job.objects.create(title='Draft Position', company_name='Employer', location='Delhi', description='Hidden', is_published=False)
        for path, title, link in [('/book-a-tutor/', 'Test Tutor', f'/book-a-tutor/{self.tutor.pk}'), ('/latest-jobs/', 'Python Developer', f'/latest-jobs/{self.job.slug}/')]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, title)
            self.assertContains(response, f'href="{link}"')
            self.assertNotContains(response, 'Inactive Tutor')
            self.assertNotContains(response, 'Draft Position')

    def test_details_are_self_canonical_and_readable_without_javascript(self):
        for path, title, body in [(f'/book-a-tutor/{self.tutor.pk}', self.tutor.full_name, self.tutor.bio), (f'/latest-jobs/{self.job.slug}/', self.job.title, self.job.description)]:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, f'<h1>{title}</h1>', html=True)
            self.assertContains(response, body)
            self.assertContains(response, f'rel="canonical" href="https://codinghubs.in{path}"')
            self.assertEqual(response.content.decode().count('rel="canonical"'), 1)

    def test_missing_and_unpublished_records_are_real_noindex_404s(self):
        self.tutor.is_active = False
        self.tutor.save()
        self.job.is_published = False
        self.job.save()
        for path in ['/book-a-tutor/not-a-number', '/book-a-tutor/999999', f'/book-a-tutor/{self.tutor.pk}', '/latest-jobs/unknown-job/', f'/latest-jobs/{self.job.slug}/']:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertIn('noindex', response.headers.get('X-Robots-Tag', ''))
            self.assertNotContains(response, 'rel="canonical"', status_code=404)

    def test_equivalent_variants_redirect_once_to_preferred_path(self):
        for source, target in [('/book-a-tutor', '/book-a-tutor/'), ('/latest-jobs', '/latest-jobs/'), (f'/book-a-tutor/{self.tutor.pk}/', f'/book-a-tutor/{self.tutor.pk}'), (f'/latest-jobs/{self.job.slug}', f'/latest-jobs/{self.job.slug}/')]:
            self.assertRedirects(self.client.get(source), target, status_code=301)

    def test_sitemap_contains_only_active_tutors_and_open_published_jobs(self):
        self.job.is_expired = True
        self.job.save()
        response = self.client.get('/sitemap-directory.xml')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, f'https://codinghubs.in/book-a-tutor/{self.tutor.pk}')
        self.assertNotContains(response, self.job.slug)

    def test_expired_job_keeps_informative_page_and_noindex(self):
        self.job.is_expired = True
        self.job.save()
        response = self.client.get(f'/latest-jobs/{self.job.slug}/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Applications closed')
        self.assertContains(response, 'noindex, follow')

    def test_public_text_is_escaped(self):
        self.tutor.bio = '<script>alert(1)</script>'
        self.tutor.save()
        response = self.client.get(f'/book-a-tutor/{self.tutor.pk}')
        self.assertContains(response, '&lt;script&gt;alert(1)&lt;/script&gt;')
        self.assertNotContains(response, '<script>alert(1)</script>')
