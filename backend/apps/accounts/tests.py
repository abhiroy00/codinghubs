import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

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
        self.assertIn('store_orders', response.data)

    def test_delete_requires_the_password_and_removes_the_account(self):
        wrong = self.client.post('/api/auth/me/delete/', {'password': 'nope'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

        deleted = self.client.post('/api/auth/me/delete/', {'password': 'StrongPass123'}, format='json')
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

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
