from datetime import date, timedelta
from io import BytesIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from pypdf import PdfReader
from rest_framework.test import APIClient

from . import services
from .models import Certificate, CertificateApplication, CertificateEvent, new_code, normalize_code

User = get_user_model()


def apply_body(**kw):
    data = {'full_name': 'Asha  Kumari Sharma', 'course_name': 'Data Science', 'batch': 'Weekend, Jan 2026',
            'completed_on': (timezone.localdate() - timedelta(days=10)).isoformat(), 'phone': '9876543210'}
    data.update(kw)
    return data


class CodeTests(TestCase):
    def test_codes_are_long_unambiguous_and_normalized(self):
        codes = {new_code() for _ in range(500)}
        self.assertEqual(len(codes), 500)
        code = codes.pop()
        self.assertRegex(code, r'^CH-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$')
        self.assertEqual(normalize_code(code.lower().replace('-', ' ')), code)
        self.assertEqual(normalize_code('CH-0000-1111-OOOO'), '')
        self.assertEqual(normalize_code('<script>'), '')


class LearnerFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('asha', 'asha@example.com', 'S3cure-pass!')
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'S3cure-pass!')
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_apply_needs_sign_in_and_blocks_duplicate_pending(self):
        self.assertIn(APIClient().post('/api/certificates/applications/', apply_body(), format='json').status_code, (401, 403))
        first = self.api.post('/api/certificates/applications/', apply_body(), format='json')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(first.json()['full_name'], 'Asha Kumari Sharma')
        self.assertEqual(first.json()['status'], 'pending')
        again = self.api.post('/api/certificates/applications/', apply_body(course_name='data science'), format='json')
        self.assertEqual(again.status_code, 400)
        self.assertIn('course_name', again.json())
        future = self.api.post('/api/certificates/applications/', apply_body(course_name='AWS', completed_on=(timezone.localdate() + timedelta(days=3)).isoformat()), format='json')
        self.assertIn('completed_on', future.json())
        self.assertEqual(CertificateEvent.objects.filter(action='applied').count(), 1)

    def test_nothing_is_issued_until_staff_approve(self):
        self.api.post('/api/certificates/applications/', apply_body(), format='json')
        self.assertEqual(Certificate.objects.count(), 0)
        mine = self.api.get('/api/certificates/mine/').json()
        self.assertEqual(mine['certificates'], [])
        self.assertEqual(mine['applications'][0]['status'], 'pending')

    def test_owner_downloads_through_a_short_lived_link(self):
        application = CertificateApplication.objects.create(user=self.user, full_name='Asha Sharma', course_name='Data Science', completed_on=date(2026, 1, 31))
        certificate = services.approve(application, self.admin)
        stranger = APIClient()
        stranger.force_authenticate(User.objects.create_user('ravi', 'ravi@example.com', 'S3cure-pass!'))
        self.assertEqual(stranger.post(f'/api/certificates/{certificate.code}/link/').status_code, 404)
        link = self.api.post(f'/api/certificates/{certificate.code}/link/').json()
        self.assertEqual(link['expires_in'], 600)
        response = APIClient().get(link['url'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('noindex', response['X-Robots-Tag'])
        text = PdfReader(BytesIO(response.content)).pages[0].extract_text()
        self.assertIn('Asha Sharma', text)
        self.assertIn(certificate.code, text)
        self.assertNotIn('SAMPLE', text)
        tampered = link['url'][:-3] + 'abc'
        self.assertEqual(APIClient().get(tampered).status_code, 410)

    def test_expired_link_is_refused(self):
        application = CertificateApplication.objects.create(user=self.user, full_name='Asha Sharma', course_name='Data Science', completed_on=date(2026, 1, 31))
        certificate = services.approve(application, self.admin)
        url = services.download_link(certificate, self.user)['url']
        later = timezone.now() + timedelta(seconds=services.LINK_MAX_AGE + 5)
        with mock.patch('time.time', return_value=later.timestamp()):
            self.assertEqual(APIClient().get(url).status_code, 410)

    def test_revoked_certificate_cannot_be_downloaded(self):
        application = CertificateApplication.objects.create(user=self.user, full_name='Asha Sharma', course_name='Data Science', completed_on=date(2026, 1, 31))
        certificate = services.approve(application, self.admin)
        url = services.download_link(certificate, self.user)['url']
        services.set_revoked(certificate, self.admin, True, 'Issued in error')
        self.assertEqual(APIClient().get(url).status_code, 410)
        self.assertEqual(self.api.post(f'/api/certificates/{certificate.code}/link/').status_code, 409)


class VerifyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'S3cure-pass!')
        self.cert = services.issue_direct(self.admin, recipient_name='Asha Kumari Sharma', course_name='Data Science', completed_on=date(2026, 1, 31))

    def verify(self, code):
        return APIClient().get('/api/certificates/verify/', {'id': code})

    def test_valid_result_shows_initials_only_and_is_noindex(self):
        response = self.verify(self.cert.code.lower())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertIn('noindex', response['X-Robots-Tag'])
        body = response.json()
        self.assertEqual(body['status'], 'valid')
        self.assertEqual(body['certificate']['initials'], 'A. K. S.')
        self.assertNotIn('Asha', str(body))
        self.assertNotIn('recipient_name', body['certificate'])

    def test_revoked_replaced_and_unknown(self):
        services.set_revoked(self.cert, self.admin, True, 'Mistake')
        self.assertEqual(self.verify(self.cert.code).json()['status'], 'revoked')
        services.set_revoked(self.cert, self.admin, False, 'Restored after check')
        new = services.reissue(self.cert, self.admin, note='Name spelling', recipient_name='Asha K Sharma')
        self.assertEqual(self.verify(self.cert.code).json()['status'], 'replaced')
        self.assertEqual(self.verify(new.code).json()['status'], 'valid')
        missing = self.verify('CH-2222-3333-4444')
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json(), {'status': 'not_found'})
        self.assertEqual(self.verify('junk').status_code, 404)

    def test_verification_is_rate_limited(self):
        codes = [self.verify('CH-2222-3333-4444').status_code for _ in range(21)]
        self.assertEqual(codes[:20], [404] * 20)
        self.assertEqual(codes[20], 429)

    def test_sample_pdf_is_marked_sample(self):
        response = APIClient().get('/api/certificates/sample.pdf')
        self.assertEqual(response.status_code, 200)
        self.assertIn('SAMPLE', PdfReader(BytesIO(response.content)).pages[0].extract_text())


class AdminTests(TestCase):
    def setUp(self):
        cache.clear()
        self.learner = User.objects.create_user('asha', 'asha@example.com', 'S3cure-pass!')
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'S3cure-pass!')
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.application = CertificateApplication.objects.create(user=self.learner, full_name='Asha Sharma', course_name='Data Science', completed_on=date(2026, 1, 31))

    def test_review_issue_reissue_revoke_with_history(self):
        pending = self.api.get('/api/admin/certificate-applications/', {'status': 'pending'}).json()
        rows = pending['results'] if isinstance(pending, dict) else pending
        self.assertEqual(rows[0]['user_email'], 'asha@example.com')
        issued = self.api.post(f'/api/admin/certificate-applications/{self.application.pk}/approve/', {'recipient_name': 'Asha R Sharma'}, format='json')
        self.assertEqual(issued.status_code, 201, issued.content)
        cert = issued.json()
        self.assertEqual(cert['recipient_name'], 'Asha R Sharma')
        self.assertEqual(self.api.post(f'/api/admin/certificate-applications/{self.application.pk}/approve/', {}, format='json').status_code, 400)
        self.assertEqual(self.api.post(f'/api/admin/certificates/{cert["id"]}/reissue/', {}, format='json').status_code, 400)
        new = self.api.post(f'/api/admin/certificates/{cert["id"]}/reissue/', {'course_name': 'Data Science with Python', 'note': 'Course title fix'}, format='json').json()
        self.assertEqual(new['replaces_code'], cert['code'])
        revoked = self.api.post(f'/api/admin/certificates/{new["id"]}/revoke/', {'note': 'Fee dispute'}, format='json').json()
        self.assertEqual(revoked['status'], 'revoked')
        actions = [e['action'] for e in revoked['events']]
        self.assertEqual(actions[0], 'revoked')
        self.assertIn('issued', actions)
        listing = self.api.get('/api/admin/certificates/', {'q': cert['code']}).json()
        old = (listing['results'] if isinstance(listing, dict) else listing)[0]
        self.assertEqual(old['status'], 'replaced')
        self.assertEqual(old['replaced_by_code'], new['code'])

    def test_reject_needs_a_reason_and_learner_sees_it(self):
        self.assertEqual(self.api.post(f'/api/admin/certificate-applications/{self.application.pk}/reject/', {}, format='json').status_code, 400)
        self.api.post(f'/api/admin/certificate-applications/{self.application.pk}/reject/', {'note': 'No attendance record for this batch.'}, format='json')
        learner = APIClient()
        learner.force_authenticate(self.learner)
        app = learner.get('/api/certificates/mine/').json()['applications'][0]
        self.assertEqual((app['status'], app['staff_note']), ('rejected', 'No attendance record for this batch.'))

    def test_direct_issue_links_an_account_by_email(self):
        response = self.api.post('/api/admin/certificates/', {'recipient_name': 'Ravi Kumar', 'course_name': 'AWS', 'completed_on': '2025-12-01', 'user_email': 'ASHA@example.com'}, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Certificate.objects.get(code=response.json()['code']).user, self.learner)
        bad = self.api.post('/api/admin/certificates/', {'recipient_name': 'X Y', 'course_name': 'AWS', 'completed_on': '2025-12-01', 'user_email': 'nobody@example.com'}, format='json')
        self.assertIn('user_email', bad.json())

    def test_permissions(self):
        staff = User.objects.create_user('ed', 'ed@example.com', 'S3cure-pass!', is_staff=True)
        client = APIClient()
        client.force_authenticate(staff)
        self.assertEqual(client.get('/api/admin/certificates/').status_code, 403)
        staff.user_permissions.add(Permission.objects.get(codename='view_certificate'))
        staff = User.objects.get(pk=staff.pk)
        client.force_authenticate(staff)
        self.assertEqual(client.get('/api/admin/certificates/').status_code, 200)
        self.assertEqual(client.post('/api/admin/certificates/', {}, format='json').status_code, 403)
        learner = APIClient()
        learner.force_authenticate(self.learner)
        self.assertEqual(learner.get('/api/admin/certificate-applications/').status_code, 403)
