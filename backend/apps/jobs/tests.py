from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Job

User = get_user_model()


def make_job(**overrides):
    values = {
        'title': 'Python Developer',
        'company_name': 'Acme Labs',
        'location': 'Noida',
        'description': 'Build APIs.',
        'application_url': 'https://example.com/apply',
        'is_published': True,
    }
    values.update(overrides)
    return Job.objects.create(**values)


class PublicJobApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_list_shows_only_open_published_jobs_newest_first(self):
        older = make_job(title='Older')
        newer = make_job(title='Newer')
        Job.objects.filter(pk=older.pk).update(published_at=timezone.now() - timedelta(days=3))
        make_job(title='Draft', is_published=False)
        make_job(title='Marked expired', is_expired=True)
        make_job(title='Past deadline', application_deadline=timezone.localdate() - timedelta(days=1))
        make_job(title='Deadline today', application_deadline=timezone.localdate())

        resp = self.client.get('/api/jobs/')
        self.assertEqual(resp.status_code, 200)
        titles = [job['title'] for job in resp.data]
        self.assertEqual(titles[-1], 'Older')
        self.assertCountEqual(titles, ['Older', 'Newer', 'Deadline today'])
        self.assertIn(newer.slug, [job['slug'] for job in resp.data])

    def test_detail_hides_drafts_and_flags_expired_jobs(self):
        draft = make_job(is_published=False)
        expired = make_job(application_deadline=timezone.localdate() - timedelta(days=1))
        self.assertEqual(self.client.get(f'/api/jobs/{draft.slug}/').status_code, 404)
        resp = self.client.get(f'/api/jobs/{expired.slug}/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['is_open'])

    def test_slugs_are_unique_and_stable(self):
        first = make_job()
        second = make_job()
        self.assertNotEqual(first.slug, second.slug)
        first.title = 'Renamed'
        first.save()
        first.refresh_from_db()
        self.assertEqual(first.slug, 'python-developer-acme-labs')


class AdminJobApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.staff = User.objects.create_user(username='staff', password='pw', is_staff=True)
        self.payload = {
            'title': 'Data Analyst Intern',
            'company_name': 'Acme Labs',
            'location': 'Remote',
            'work_mode': 'remote',
            'job_type': 'internship',
            'experience_level': 'fresher',
            'description': 'Analyse data.',
            'skills': ['SQL', ' SQL ', 'Python', ''],
            'application_email': 'jobs@example.com',
            'is_published': True,
        }

    def test_non_staff_cannot_manage_jobs(self):
        self.assertEqual(self.client.post('/api/admin/jobs/', self.payload, format='json').status_code, 401)
        self.client.force_authenticate(User.objects.create_user(username='learner', password='pw'))
        self.assertEqual(self.client.post('/api/admin/jobs/', self.payload, format='json').status_code, 403)

    def test_staff_can_create_edit_unpublish_expire_and_delete(self):
        self.client.force_authenticate(self.staff)
        created = self.client.post('/api/admin/jobs/', self.payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['skills'], ['SQL', 'Python'])
        self.assertIsNotNone(created.data['published_at'])
        job_id, slug = created.data['id'], created.data['slug']
        self.assertEqual(len(self.client.get('/api/jobs/').data), 1)

        self.client.patch(f'/api/admin/jobs/{job_id}/', {'salary': '₹15,000/month'}, format='json')
        self.assertEqual(self.client.get(f'/api/jobs/{slug}/').data['salary'], '₹15,000/month')

        self.client.patch(f'/api/admin/jobs/{job_id}/', {'is_published': False}, format='json')
        self.assertEqual(self.client.get('/api/jobs/').data, [])
        self.client.patch(f'/api/admin/jobs/{job_id}/', {'is_published': True, 'is_expired': True}, format='json')
        self.assertEqual(self.client.get('/api/jobs/').data, [])
        self.assertFalse(self.client.get(f'/api/jobs/{slug}/').data['is_open'])

        self.assertEqual(self.client.delete(f'/api/admin/jobs/{job_id}/').status_code, 204)
        self.assertFalse(Job.objects.exists())

    def test_job_needs_a_way_to_apply(self):
        self.client.force_authenticate(self.staff)
        self.payload.pop('application_email')
        resp = self.client.post('/api/admin/jobs/', self.payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('application_url', resp.data)
        self.payload['application_url'] = 'javascript:alert(1)'
        self.assertEqual(self.client.post('/api/admin/jobs/', self.payload, format='json').status_code, 400)
