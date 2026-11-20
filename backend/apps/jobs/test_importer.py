from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.content.directory_seo import job_seo
from apps.jobs import importers
from apps.jobs.importers import Listing, clean_text, is_relevant, to_job_fields
from apps.jobs.models import Job


def listing(external_id, title='Software Engineer', company='Acme', location='Bengaluru, India', **extra):
    return Listing(source='greenhouse', external_id=external_id, title=title, company=company, location=location,
                   url=f'https://example.com/jobs/{external_id}', description='<p>Build things</p>', **extra)


def run_import(fetchers, **settings):
    out = StringIO()
    with mock.patch.dict(importers.FETCHERS, fetchers, clear=True), \
            mock.patch('apps.jobs.management.commands.import_jobs.FETCHERS', fetchers):
        with override_settings(JOBS_SOURCES=list(fetchers), **settings):
            call_command('import_jobs', stdout=out)
    return out.getvalue()


class FilterTests(TestCase):
    def test_keeps_early_career_tech_roles_in_india_or_remote(self):
        self.assertTrue(is_relevant(listing('1', 'Frontend Engineer')))
        self.assertTrue(is_relevant(listing('2', 'Software Development Engineer Intern')))
        self.assertTrue(is_relevant(listing('3', 'Python Developer', location='Remote', remote=True)))

    def test_drops_senior_non_tech_and_out_of_region_roles(self):
        self.assertFalse(is_relevant(listing('1', 'Senior Software Engineer')))
        self.assertFalse(is_relevant(listing('2', 'Backend - TL/STL')))
        self.assertFalse(is_relevant(listing('3', 'Business Analytics | Experience : 5-7 yrs')))
        self.assertFalse(is_relevant(listing('4', 'Credit Risk Analyst')))
        self.assertFalse(is_relevant(listing('5', 'Intern - Talent Acquisition')))
        self.assertFalse(is_relevant(listing('6', 'Software Engineer', location='Berlin, Germany')))

    def test_maps_internships_and_work_mode(self):
        fields = to_job_fields(listing('1', 'Data Science Intern', location='Hybrid in Gurugram, India'))
        self.assertEqual(fields['job_type'], Job.TYPE_INTERNSHIP)
        self.assertEqual(fields['experience_level'], 'fresher')
        self.assertEqual(fields['work_mode'], Job.MODE_HYBRID)

    def test_clean_text_turns_escaped_html_into_plain_text(self):
        self.assertEqual(clean_text('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;'),
                         'Hello & welcome\n• Python')


class ImportCommandTests(TestCase):
    def test_imports_publishes_and_deduplicates(self):
        fetch = {'greenhouse': lambda session: [listing('a'), listing('b', 'Data Analyst'), listing('c', 'Senior Engineer')]}
        out = run_import(fetch)
        self.assertIn('2 new jobs', out)
        self.assertEqual(Job.open_listings().count(), 2)
        job = Job.objects.get(external_id='a')
        self.assertEqual(job.application_url, 'https://example.com/jobs/a')
        self.assertTrue(job.is_imported)
        out = run_import(fetch)
        self.assertIn('0 new jobs, 2 refreshed', out)
        self.assertEqual(Job.objects.count(), 2)

    def test_caps_listings_per_company(self):
        fetch = {'greenhouse': lambda session: [listing(str(i), f'Software Engineer {i}') for i in range(10)]}
        run_import(fetch, JOBS_MAX_PER_COMPANY=3)
        self.assertEqual(Job.objects.count(), 3)

    def test_failing_source_never_expires_its_listings(self):
        run_import({'greenhouse': lambda session: [listing('a')]})
        Job.objects.update(last_seen_at=timezone.now() - timedelta(days=10))

        def broken(session):
            raise ConnectionError('down')
        out = run_import({'greenhouse': broken})
        self.assertIn('FAILED', out)
        self.assertFalse(Job.objects.get(external_id='a').is_expired)

    def test_listing_gone_from_a_working_source_expires(self):
        run_import({'greenhouse': lambda session: [listing('a'), listing('b', 'Data Analyst')]})
        Job.objects.update(last_seen_at=timezone.now() - timedelta(days=10))
        run_import({'greenhouse': lambda session: [listing('b', 'Data Analyst')]})
        self.assertTrue(Job.objects.get(external_id='a').is_expired)
        self.assertFalse(Job.objects.get(external_id='b').is_expired)

    def test_manual_jobs_are_never_touched(self):
        manual = Job.objects.create(title='Trainer', company_name='Coding Hub', location='Delhi', description='x', is_published=True)
        Job.objects.filter(pk=manual.pk).update(published_at=timezone.now() - timedelta(days=90))
        run_import({'greenhouse': lambda session: [listing('a')]})
        self.assertFalse(Job.objects.get(pk=manual.pk).is_expired)


class SeoTests(TestCase):
    def test_imported_jobs_are_noindex_and_left_out_of_the_sitemap(self):
        run_import({'greenhouse': lambda session: [listing('a')]})
        imported = Job.objects.get(external_id='a')
        manual = Job.objects.create(title='Python Trainer', company_name='Coding Hub', location='Delhi', description='Teach Python', is_published=True)
        self.assertIn('noindex', str(job_seo(imported)).lower())
        self.assertNotIn('noindex', str(job_seo(manual)).lower())
        sitemap = self.client.get('/sitemap-directory.xml').content.decode()
        self.assertIn(manual.slug, sitemap)
        self.assertNotIn(imported.slug, sitemap)

    def test_api_exposes_source_for_attribution(self):
        run_import({'greenhouse': lambda session: [listing('a')]})
        cache.clear()  # earlier tests may have used up the anonymous request throttle
        response = self.client.get('/api/jobs/')
        self.assertEqual(response.status_code, 200, response.content[:200])
        data = response.json()
        rows = data['results'] if isinstance(data, dict) else data
        self.assertEqual(rows[0]['source'], 'greenhouse')
        self.assertEqual(rows[0]['source_label'], 'Company careers page')
        self.assertTrue(rows[0]['is_imported'])
