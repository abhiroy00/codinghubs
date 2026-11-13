from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()
CLIENT = 'codinghubs-test.apps.googleusercontent.com'


@override_settings(GOOGLE_CLIENT_IDS=CLIENT)
class GoogleIdentityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.claims = {'aud': CLIENT, 'sub': 'google-subject-123', 'email': 'learner@gmail.com', 'email_verified': True, 'given_name': 'Asha'}

    def login(self, claims=None, **extra):
        with mock.patch('apps.accounts.views._google_token_info', return_value=claims or self.claims):
            return self.client.post('/api/auth/google/', {'credential': 'signed-google-token', **extra}, format='json')

    def test_new_google_user_is_linked_to_subject_without_elevated_permissions(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        user = User.objects.get(pk=response.data['user']['id'])
        self.assertEqual(user.google_sub, self.claims['sub'])
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_returning_google_identity_survives_a_changed_email(self):
        first = self.login()
        second = self.login({**self.claims, 'email': 'new-address@gmail.com'})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['user']['id'], second.data['user']['id'])
        self.assertEqual(User.objects.count(), 1)

    def test_missing_subject_is_rejected(self):
        claims = {key: value for key, value in self.claims.items() if key != 'sub'}
        self.assertEqual(self.login(claims).status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_third_party_email_cannot_take_over_an_existing_password_account(self):
        user = User.objects.create_user('existing', email='person@example.com', password='A-secure-password-123')
        response = self.login({**self.claims, 'email': user.email})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'account_link_required')
        user.refresh_from_db()
        self.assertIsNone(user.google_sub)

    def test_existing_third_party_account_can_be_linked_with_its_password(self):
        user = User.objects.create_user('existing', email='person@example.com', password='A-secure-password-123')
        response = self.login({**self.claims, 'email': user.email}, password='A-secure-password-123')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['id'], user.pk)
        user.refresh_from_db()
        self.assertEqual(user.google_sub, self.claims['sub'])

    def test_wrong_linking_password_does_not_grant_access(self):
        user = User.objects.create_user('existing', email='person@example.com', password='A-secure-password-123')
        response = self.login({**self.claims, 'email': user.email}, password='wrong')
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertIsNone(user.google_sub)

    def test_existing_gmail_owner_can_sign_in_without_a_separate_registration(self):
        user = User.objects.create_user('existing', email=self.claims['email'], password='A-secure-password-123')
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['id'], user.pk)
        user.refresh_from_db()
        self.assertEqual(user.google_sub, self.claims['sub'])

    def test_new_google_account_with_a_non_gmail_address_can_register(self):
        response = self.login({**self.claims, 'email': 'new-user@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.get().google_sub, self.claims['sub'])

    def test_disabled_google_user_cannot_sign_in(self):
        user = User.objects.create_user('disabled', email=self.claims['email'], is_active=False)
        response = self.login()
        self.assertEqual(response.status_code, 403)
        user.refresh_from_db()
        self.assertIsNone(user.google_sub)

    def test_an_email_cannot_be_relinked_to_a_different_google_identity(self):
        first = self.login()
        response = self.login({**self.claims, 'sub': 'different-google-subject'})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().pk, first.data['user']['id'])


@override_settings(GOOGLE_CLIENT_IDS=CLIENT)
class SignedGoogleTokenTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from google.auth import crypt
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private = cls.key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        cls.signer = crypt.RSASigner.from_string(private)
        cls.public = cls.key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()

    def verify(self, **overrides):
        import json
        import time
        from types import SimpleNamespace
        from google.auth import jwt
        from apps.accounts.google import verify_google_token
        now = int(time.time())
        payload = {'iss': 'https://accounts.google.com', 'aud': CLIENT, 'sub': 'signed-subject', 'email': 'signed@gmail.com', 'email_verified': True, 'iat': now, 'exp': now + 3600, **overrides}
        credential = jwt.encode(self.signer, payload, key_id='test-key').decode()
        transport = mock.Mock(return_value=SimpleNamespace(status=200, data=json.dumps({'test-key': self.public}).encode()))
        with mock.patch('apps.accounts.google.Request', return_value=transport):
            result = verify_google_token(credential)
        self.assertEqual(transport.call_args.kwargs['timeout'], 6)
        return result

    def test_signed_google_claims_are_verified(self):
        self.assertEqual(self.verify()['sub'], 'signed-subject')

    def test_expired_token_is_rejected(self):
        import time
        from apps.accounts.google import GoogleTokenError
        with self.assertRaises(GoogleTokenError):
            self.verify(iat=int(time.time()) - 7200, exp=int(time.time()) - 3600)

    def test_wrong_issuer_is_rejected(self):
        from apps.accounts.google import GoogleTokenError
        with self.assertRaises(GoogleTokenError):
            self.verify(iss='https://attacker.example.com')

    def test_wrong_audience_is_rejected(self):
        from apps.accounts.google import GoogleTokenError
        with self.assertRaises(GoogleTokenError):
            self.verify(aud='attacker-client.apps.googleusercontent.com')

    def test_wrong_signing_key_is_rejected(self):
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from google.auth import crypt
        from apps.accounts.google import GoogleTokenError
        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private = other.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        with mock.patch.object(self, 'signer', crypt.RSASigner.from_string(private)):
            with self.assertRaises(GoogleTokenError):
                self.verify()
