from io import StringIO

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.leads.models import Lead

User = get_user_model()
NO_THROTTLE = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_THROTTLE_CLASSES': (),
    'DEFAULT_THROTTLE_RATES': {'anon': '1000/min', 'user': '1000/min'},
}


@override_settings(REST_FRAMEWORK=NO_THROTTLE)
class AdminPanelTests(TestCase):
    def setUp(self):
        cache.clear()  # the login throttle is cache-backed
        self.client = APIClient()
        self.staff = User.objects.create_user('boss', email='boss@example.com', password='S3cure-pass!', is_staff=True)
        self.student = User.objects.create_user('stu', email='stu@example.com', password='S3cure-pass!')
        Lead.objects.create(name='Asha', phone='+919999999999', course='Generative AI | from Laxmi Nagar', source_page='/locations/ai-course-in-laxmi-nagar-delhi/')
        Lead.objects.create(name='=cmd()', phone='+918888888888', mode='demo', source_page='/free-session')

    def login(self, email='boss@example.com', password='S3cure-pass!'):
        return self.client.post('/api/admin/login/', {'email': email, 'password': password}, format='json')

    def auth(self):
        token = self.login().data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_staff_can_log_in_with_email_case_insensitively(self):
        resp = self.login(email='BOSS@Example.com')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_wrong_password_and_non_staff_get_same_401(self):
        bad = self.login(password='nope')
        student = self.login(email='stu@example.com')
        missing = self.login(email='ghost@example.com')
        for r in (bad, student, missing):
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r.data, {'detail': 'Invalid email or password.'})

    def test_endpoints_require_staff(self):
        self.assertEqual(self.client.get('/api/admin/leads/').status_code, 401)
        token = self.client.post('/api/auth/login/', {'username': 'stu', 'password': 'S3cure-pass!'}, format='json').data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        for url in ('stats', 'leads', 'users', 'enrollments', 'orders', 'courses'):
            self.assertEqual(self.client.get(f'/api/admin/{url}/').status_code, 403, url)

    def test_stats_shape(self):
        self.auth()
        data = self.client.get('/api/admin/stats/').data
        self.assertEqual(data['leads']['total'], 2)
        self.assertEqual(data['leads']['today'], 2)
        self.assertEqual(len(data['leads_per_day']), 14)
        self.assertEqual(data['leads']['by_status']['new'], 2)

    def test_lead_search_filter_and_patch_only_status_and_notes(self):
        self.auth()
        found = self.client.get('/api/admin/leads/', {'q': 'laxmi'}).data
        self.assertEqual(found['count'], 1)
        lead = Lead.objects.get(name='Asha')
        resp = self.client.patch(f'/api/admin/leads/{lead.id}/', {'status': 'contacted', 'notes': 'Called', 'name': 'Hacked'}, format='json')
        self.assertEqual(resp.status_code, 200)
        lead.refresh_from_db()
        self.assertEqual((lead.status, lead.notes, lead.name), ('contacted', 'Called', 'Asha'))
        self.assertEqual(self.client.get('/api/admin/leads/', {'status': 'contacted'}).data['count'], 1)

    def test_csv_export_neutralises_formulas(self):
        self.auth()
        body = self.client.get('/api/admin/leads/export/').content.decode()
        self.assertIn("'=cmd()", body)
        self.assertNotIn(',=cmd()', body)

    def test_public_lead_form_cannot_set_status_or_notes(self):
        resp = APIClient().post('/api/leads/', {'name': 'X Y', 'phone': '+917777777777', 'status': 'converted', 'notes': 'hi'}, format='json')
        self.assertEqual(resp.status_code, 201)
        lead = Lead.objects.get(name='X Y')
        self.assertEqual((lead.status, lead.notes), ('new', ''))


class EnsureAdminCommandTests(TestCase):
    def run_cmd(self, **kwargs):
        out = StringIO()
        call_command('ensure_admin', stdout=out, **kwargs)
        return out.getvalue()

    def test_skips_without_credentials(self):
        with override_env(ADMIN_EMAIL='', ADMIN_PASSWORD=''):
            self.assertIn('skipping', self.run_cmd())
        self.assertFalse(User.objects.exists())

    def test_creates_then_updates_same_user(self):
        self.run_cmd(email='Owner@Example.com', password='first-Pass-1')
        user = User.objects.get(email='owner@example.com')
        self.assertTrue(user.is_staff and user.is_superuser)
        self.assertTrue(user.check_password('first-Pass-1'))
        self.run_cmd(email='owner@example.com', password='second-Pass-2')
        self.assertEqual(User.objects.count(), 1)
        user.refresh_from_db()
        self.assertTrue(user.check_password('second-Pass-2'))


class override_env:
    def __init__(self, **values):
        self.values = values

    def __enter__(self):
        import os
        self.old = {k: os.environ.get(k) for k in self.values}
        os.environ.update(self.values)

    def __exit__(self, *exc):
        import os
        for k, v in self.old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
