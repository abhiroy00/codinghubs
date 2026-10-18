import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.courses.models import Course, CourseCategory
from apps.enrollments.models import Enrollment

from .models import Order

User = get_user_model()


class PaymentFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='student1', password='pass12345')
        self.category = CourseCategory.objects.create(name='AI & Data', slug='ai-data')
        self.course = Course.objects.create(
            category=self.category, name='Generative AI', slug='generative-ai', price=4999,
        )
        self.client.force_authenticate(self.user)

    @patch('apps.payments.views.get_client')
    def test_create_order_happy_path(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.order.create.return_value = {'id': 'order_TEST123'}
        mock_get_client.return_value = mock_client

        resp = self.client.post('/api/payments/create-order/', {'course_id': self.course.id}, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['order_id'], 'order_TEST123')
        self.assertEqual(resp.data['amount'], 499900)
        self.assertTrue(Order.objects.filter(razorpay_order_id='order_TEST123').exists())

    @patch('apps.payments.views.get_client')
    def test_create_order_returns_clean_error_on_gateway_failure(self, mock_get_client):
        import razorpay

        mock_client = MagicMock()
        mock_client.order.create.side_effect = razorpay.errors.BadRequestError('Authentication failed')
        mock_get_client.return_value = mock_client

        resp = self.client.post('/api/payments/create-order/', {'course_id': self.course.id}, format='json')

        self.assertEqual(resp.status_code, 503)
        self.assertIn('detail', resp.data)
        self.assertFalse(Order.objects.filter(course=self.course).exists())

    @patch('apps.payments.views.get_client')
    def test_create_order_blocks_duplicate_enrollment(self, mock_get_client):
        Enrollment.objects.create(user=self.user, course=self.course)
        resp = self.client.post('/api/payments/create-order/', {'course_id': self.course.id}, format='json')
        self.assertEqual(resp.status_code, 400)

    @patch('apps.payments.views.get_client')
    def test_verify_payment_success_creates_enrollment(self, mock_get_client):
        order = Order.objects.create(
            user=self.user, course=self.course, razorpay_order_id='order_ABC', amount=499900,
        )
        mock_client = MagicMock()
        mock_client.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_client

        resp = self.client.post('/api/payments/verify/', {
            'razorpay_order_id': 'order_ABC',
            'razorpay_payment_id': 'pay_XYZ',
            'razorpay_signature': 'sig_123',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertTrue(Enrollment.objects.filter(user=self.user, course=self.course).exists())

    @patch('apps.payments.views.get_client')
    def test_verify_payment_bad_signature_fails(self, mock_get_client):
        import razorpay

        Order.objects.create(user=self.user, course=self.course, razorpay_order_id='order_BAD', amount=499900)
        mock_client = MagicMock()
        mock_client.utility.verify_payment_signature.side_effect = razorpay.errors.SignatureVerificationError('bad')
        mock_get_client.return_value = mock_client

        resp = self.client.post('/api/payments/verify/', {
            'razorpay_order_id': 'order_BAD',
            'razorpay_payment_id': 'pay_XYZ',
            'razorpay_signature': 'sig_wrong',
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Enrollment.objects.filter(user=self.user, course=self.course).exists())


@override_settings(RAZORPAY_WEBHOOK_SECRET='whsec_test')
class WebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='student2', password='pass12345')
        self.category = CourseCategory.objects.create(name='Full Stack', slug='full-stack')
        self.course = Course.objects.create(
            category=self.category, name='MERN Stack', slug='mern-stack', price=9999,
        )
        self.order = Order.objects.create(
            user=self.user, course=self.course, razorpay_order_id='order_WH1', amount=999900,
        )

    def _signed_post(self, payload):
        body = json.dumps(payload).encode()
        signature = hmac.new(b'whsec_test', body, hashlib.sha256).hexdigest()
        return self.client.post(
            '/api/payments/webhook/', data=body, content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE=signature,
        )

    def test_webhook_marks_order_paid(self):
        payload = {
            'event': 'payment.captured',
            'payload': {'payment': {'entity': {'order_id': 'order_WH1', 'id': 'pay_WH1'}}},
        }
        resp = self._signed_post(payload)
        self.assertEqual(resp.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.STATUS_PAID)
        self.assertTrue(Enrollment.objects.filter(user=self.user, course=self.course).exists())

    def test_webhook_rejects_bad_signature(self):
        body = json.dumps({'event': 'payment.captured', 'payload': {}}).encode()
        resp = self.client.post(
            '/api/payments/webhook/', data=body, content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='not-the-right-signature',
        )
        self.assertEqual(resp.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.STATUS_CREATED)
