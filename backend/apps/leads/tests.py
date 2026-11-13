from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Lead


class DemoRegistrationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = {
            'name': 'Test Learner', 'phone': '+919876543210',
            'course': 'Vibe Coding with AI', 'mode': 'demo', 'source_page': '/',
            'email': 'learner@example.com', 'education': 'Graduate',
            'whatsapp_consent': True,
        }

    def test_demo_saves_every_contact_field_and_preference(self):
        response = self.client.post('/api/leads/', self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get(pk=response.data['id'])
        self.assertEqual(lead.email, 'learner@example.com')
        self.assertEqual(lead.education, 'Graduate')
        self.assertTrue(lead.whatsapp_consent)
        self.assertEqual(lead.course, 'Vibe Coding with AI')

    def test_existing_contact_forms_need_no_new_fields(self):
        response = self.client.post('/api/leads/', {
            'name': 'Existing Learner', 'phone': '+919876543210', 'mode': 'expert',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get(pk=response.data['id'])
        self.assertEqual(lead.email, '')
        self.assertFalse(lead.whatsapp_consent)

    def test_invalid_email_is_rejected_without_creating_a_lead(self):
        response = self.client.post('/api/leads/', {**self.payload, 'email': 'invalid'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)
        self.assertFalse(Lead.objects.exists())

    def test_staff_can_read_and_export_registration_details(self):
        created = self.client.post('/api/leads/', self.payload, format='json')
        staff = get_user_model().objects.create_user('demo-staff', is_staff=True)
        self.client.force_authenticate(staff)
        response = self.client.get(f"/api/admin/leads/{created.data['id']}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], self.payload['email'])
        self.assertTrue(response.data['whatsapp_consent'])
        exported = self.client.get('/api/admin/leads/export/')
        self.assertEqual(exported.status_code, 200)
        self.assertIn('learner@example.com', exported.content.decode())
