from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import CourseCertificate


class RoadmapProgressTests(APITestCase):
    url = '/api/courses/roadmap/generative-ai/progress/'

    def setUp(self):
        self.user = get_user_model().objects.create_user(username='roadmap', password='test-password')
        self.other = get_user_model().objects.create_user(username='roadmap-other', password='test-password')

    def test_requires_authentication(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_additive_progress_is_private_and_does_not_award_certificate(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.put(self.url, {'questions': ['genai-l1-001']}, format='json').status_code, 200)
        self.client.put(self.url, {'questions': ['genai-l2-001']}, format='json')
        data = self.client.put(self.url, {'questions': []}, format='json').data
        self.assertEqual(data['questions'], ['genai-l1-001', 'genai-l2-001'])
        self.assertFalse(CourseCertificate.objects.filter(user=self.user).exists())
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).data, {})

    def test_unknown_ids_and_payload_shapes_are_rejected(self):
        self.client.force_authenticate(self.user)
        for payload in ({'questions': ['fake']}, {'admin': []}, {'coding': 'bad'}, {'articles': [True]}):
            self.assertEqual(self.client.put(self.url, payload, format='json').status_code, 400)

    def test_course_progress_is_isolated_and_rejects_cross_course_ids(self):
        self.client.force_authenticate(self.user)
        python = '/api/courses/roadmap/python-full-stack/progress/'
        react = '/api/courses/roadmap/react-full-stack/progress/'
        response = self.client.put(python, {'articles': ['python-full-stack:article:1']}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(react).data, {})
        self.assertEqual(self.client.get(self.url).data, {})
        self.assertEqual(self.client.put(react, {'articles': ['python-full-stack:article:1']}, format='json').status_code, 400)
        self.assertEqual(self.client.get('/api/courses/roadmap/unknown-course/progress/').status_code, 404)

    def test_study_brief_completion_does_not_complete_existing_course_days(self):
        self.client.force_authenticate(self.user)
        url = '/api/courses/roadmap/cissp/progress/'
        response = self.client.put(url, {'assignments': ['cissp:assignment:30']}, format='json')
        self.assertEqual(response.status_code, 200)
        from .models import LearningProgress
        self.assertFalse(LearningProgress.objects.filter(user=self.user, course_slug='cissp').exists())
        self.assertFalse(CourseCertificate.objects.filter(user=self.user).exists())
