from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .tokens import revoke_all_tokens


@override_settings(GOOGLE_CLIENT_IDS='test-client', DEBUG=False)
class PersistentSessionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('learner', email='learner@gmail.com', password='Strong-password-123')
        self.client = APIClient()
        self.client.credentials(HTTP_X_REQUESTED_WITH='XMLHttpRequest')

    def login(self):
        return self.client.post('/api/auth/login/', {'username': 'learner', 'password': 'Strong-password-123', 'persistent': True}, format='json')

    def test_cookie_restores_without_refresh_token(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('refresh', response.data)
        cookie = response.cookies['ch_session']
        self.assertTrue(cookie['httponly'])
        self.assertTrue(cookie['secure'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertGreater(int(cookie['max-age']), 0)
        restored = self.client.post('/api/auth/session/', {}, format='json')
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.data['user']['id'], self.user.pk)

    def test_session_has_no_idle_expiry_and_stores_only_hash(self):
        from .models import LoginSession
        self.login()
        session = LoginSession.objects.get(user=self.user)
        self.assertNotEqual(session.token_hash, self.client.cookies['ch_session'].value)
        LoginSession.objects.filter(pk=session.pk).update(created_at=timezone.now() - timedelta(days=800))
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json').status_code, 200)

    def test_logout_revokes_cookie_and_prevents_replay(self):
        self.login()
        previous = self.client.cookies['ch_session'].value
        self.assertEqual(self.client.post('/api/auth/logout/', {}, format='json').status_code, 204)
        self.client.cookies['ch_session'] = previous
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json').status_code, 401)

    def test_reset_and_disabled_accounts_end_sessions(self):
        self.login()
        revoke_all_tokens(self.user)
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json').status_code, 401)
        self.login()
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json').status_code, 401)

    def test_cookie_endpoints_reject_cross_site_and_form_requests(self):
        self.login()
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json', HTTP_ORIGIN='https://evil.example').status_code, 403)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/auth/session/', {}).status_code, 403)
        self.assertEqual(self.client.post('/api/auth/logout/', {}).status_code, 403)

    def test_legacy_clients_keep_jwt_pairs(self):
        self.client.credentials()
        response = self.client.post('/api/auth/login/', {'username': 'learner', 'password': 'Strong-password-123'}, format='json')
        self.assertIn('refresh', response.data)
        self.assertNotIn('ch_session', response.cookies)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': response.data['refresh']}, format='json').status_code, 200)

    def test_google_photo_is_saved_and_restored_only_from_google_hosts(self):
        claims = {'aud': 'test-client', 'sub': 'subject', 'email': self.user.email, 'email_verified': True, 'picture': 'https://lh3.googleusercontent.com/a/test-photo'}
        with mock.patch('apps.accounts.views._google_token_info', return_value=claims):
            response = self.client.post('/api/auth/google/', {'credential': 'verified', 'persistent': True}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['avatar_url'], claims['picture'])
        self.assertEqual(self.client.post('/api/auth/session/', {}, format='json').data['user']['avatar_url'], claims['picture'])
        with mock.patch('apps.accounts.views._google_token_info', return_value={**claims, 'picture': 'https://evil.example/a'}):
            response = self.client.post('/api/auth/google/', {'credential': 'verified'}, format='json')
        self.assertEqual(response.data['user']['avatar_url'], '')
