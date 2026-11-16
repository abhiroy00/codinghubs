import re
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts import views

User = get_user_model()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_tokens(self):
        resp = self.client.post('/api/auth/register/', {
            'username': 'newstudent', 'email': 'new@student.com', 'phone': '+919999999999',
            'password': 'StrongPass123',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertEqual(resp.data['user']['username'], 'newstudent')

    def test_login_then_me(self):
        User.objects.create_user(username='existing', password='StrongPass123')
        resp = self.client.post('/api/auth/login/', {
            'username': 'existing', 'password': 'StrongPass123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        access = resp.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['username'], 'existing')

    def test_me_requires_auth(self):
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)

    def login(self):
        User.objects.create_user(username='session', password='StrongPass123')
        resp = self.client.post('/api/auth/login/', {'username': 'session', 'password': 'StrongPass123'}, format='json')
        self.assertEqual(resp.status_code, 200)
        return resp.data['refresh']

    def test_logout_blacklists_the_refresh_token(self):
        refresh = self.login()
        out = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        self.assertEqual(out.status_code, 204)
        again = self.client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(again.status_code, 401)

    def test_refresh_rotates_and_blacklists_the_previous_token(self):
        refresh = self.login()
        rotated = self.client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(rotated.status_code, 200)
        self.assertIn('refresh', rotated.data)
        self.assertNotEqual(rotated.data['refresh'], refresh)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': refresh}, format='json').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': rotated.data['refresh']}, format='json').status_code, 200)

    def test_logout_with_an_invalid_token_is_still_a_no_content(self):
        resp = self.client.post('/api/auth/logout/', {'refresh': 'not-a-token'}, format='json')
        self.assertEqual(resp.status_code, 204)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', SITE_URL='https://codinghubs.in')
class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()  # the reset endpoint is throttled per IP (5/hour), and tests share an IP
        mail.outbox = []
        self.user = User.objects.create_user(username='forgetful', email='forgetful@example.com', password='OldStrongPass123')

    def request_link(self):
        response = self.client.post('/api/auth/password-reset/', {'email': self.user.email}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        match = re.search(r'/reset-password\?uid=([^&\s]+)&token=([^\s]+)', body)
        self.assertIsNotNone(match, body)
        return match.group(1), match.group(2)

    def test_reset_link_changes_the_password_and_cannot_be_reused(self):
        uid, token = self.request_link()
        changed = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': uid, 'token': token, 'password': 'NewStrongPass456',
        }, format='json')
        self.assertEqual(changed.status_code, 200, changed.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPass456'))
        reused = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': uid, 'token': token, 'password': 'AnotherPass789',
        }, format='json')
        self.assertEqual(reused.status_code, 400)

    def test_unknown_email_gets_the_same_response_without_sending_mail(self):
        response = self.client.post('/api/auth/password-reset/', {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mail.outbox, [])

    def test_invalid_token_is_rejected(self):
        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': 'MQ', 'token': 'not-a-token', 'password': 'NewStrongPass456',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_weak_password_is_rejected(self):
        uid, token = self.request_link()
        response = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': uid, 'token': token, 'password': '123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldStrongPass123'))


class AccountDataTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='owner', email='owner@example.com', password='StrongPass123')
        self.client.force_authenticate(self.user)

    def test_export_returns_the_accounts_own_data(self):
        response = self.client.get('/api/auth/me/export/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['profile']['username'], 'owner')
        self.assertNotIn('store_orders', response.data)

    def test_delete_requires_the_password_and_removes_the_account(self):
        wrong = self.client.post('/api/auth/me/delete/', {'password': 'nope'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

        deleted = self.client.post('/api/auth/me/delete/', {'password': 'StrongPass123'}, format='json')
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_profile_update_changes_only_editable_fields(self):
        response = self.client.patch('/api/auth/me/', {
            'first_name': ' Asha ', 'last_name': 'Sharma', 'phone': '+91 98765 43210',
            'email': 'hijack@example.com', 'username': 'someone-else',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual((self.user.first_name, self.user.last_name, self.user.phone), ('Asha', 'Sharma', '+91 98765 43210'))
        self.assertEqual((self.user.email, self.user.username), ('owner@example.com', 'owner'))
        self.assertEqual(response.data['first_name'], 'Asha')

    def test_profile_update_rejects_an_invalid_phone(self):
        response = self.client.patch('/api/auth/me/', {'phone': 'call me maybe'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('phone', response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, '')

    def test_profile_update_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.patch('/api/auth/me/', {'first_name': 'X'}, format='json').status_code, 401)

    def test_course_payment_orders_are_kept_without_the_account_link(self):
        from apps.courses.models import Course, CourseCategory
        from apps.payments.models import Order

        category = CourseCategory.objects.create(name='AI', slug='ai')
        course = Course.objects.create(category=category, name='AI', slug='ai', price=100)
        order = Order.objects.create(
            user=self.user, course=course, razorpay_order_id='order_KEEP', amount=10000, status=Order.STATUS_PAID,
        )

        deleted = self.client.post('/api/auth/me/delete/', {'password': 'StrongPass123'}, format='json')
        self.assertEqual(deleted.status_code, 204)
        order.refresh_from_db()
        self.assertIsNone(order.user)
        self.assertEqual(order.status, Order.STATUS_PAID)


class GoogleLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @override_settings(GOOGLE_CLIENT_IDS='client-abc.apps.googleusercontent.com')
    def test_config_exposes_the_client_id(self):
        resp = self.client.get('/api/auth/google/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['client_id'], 'client-abc.apps.googleusercontent.com')

    @override_settings(GOOGLE_CLIENT_IDS='')
    def test_login_is_disabled_without_a_client_id(self):
        resp = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(self.client.get('/api/auth/google/').data['client_id'], '')

    @override_settings(GOOGLE_CLIENT_IDS='client-abc.apps.googleusercontent.com')
    def test_valid_credential_creates_the_account_and_returns_tokens(self):
        claims = {
            'aud': 'client-abc.apps.googleusercontent.com',
            'sub': 'google-existing-test-subject',
            'email': 'Learner@Example.com',
            'email_verified': 'true',
            'given_name': 'Asha',
            'family_name': 'Verma',
        }
        with mock.patch('apps.accounts.views._google_token_info', return_value=claims):
            resp = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        user = User.objects.get(email='learner@example.com')
        self.assertEqual(user.first_name, 'Asha')
        self.assertFalse(user.has_usable_password())
        self.assertEqual(resp.data['user']['username'], user.username)

        with mock.patch('apps.accounts.views._google_token_info', return_value=claims):
            again = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')
        self.assertEqual(again.status_code, 200)
        self.assertEqual(User.objects.filter(email__iexact='learner@example.com').count(), 1)

    @override_settings(GOOGLE_CLIENT_IDS='client-abc.apps.googleusercontent.com')
    def test_foreign_audience_and_unverified_email_are_rejected(self):
        with mock.patch('apps.accounts.views._google_token_info', return_value={
            'aud': 'other-client.apps.googleusercontent.com', 'email': 'x@example.com', 'email_verified': 'true',
        }):
            resp = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')
        self.assertEqual(resp.status_code, 400)

        with mock.patch('apps.accounts.views._google_token_info', return_value={
            'aud': 'client-abc.apps.googleusercontent.com', 'email': 'x@example.com', 'email_verified': 'false',
        }):
            resp = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(email='x@example.com').exists())

    @override_settings(GOOGLE_CLIENT_IDS='client-abc.apps.googleusercontent.com')
    def test_broken_credential_is_rejected(self):
        with mock.patch('apps.accounts.views._google_token_info', side_effect=views.GoogleTokenError('nope')):
            resp = self.client.post('/api/auth/google/', {'credential': 'token'}, format='json')
        self.assertEqual(resp.status_code, 400)
