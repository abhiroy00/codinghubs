from django.contrib.auth import get_user_model
from django.test import TestCase
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
