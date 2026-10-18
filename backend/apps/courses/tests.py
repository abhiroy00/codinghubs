from django.test import TestCase
from rest_framework.test import APIClient

from .models import Course, CourseCategory


class CourseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = CourseCategory.objects.create(name='AI & Data', slug='ai-data', color='#4f46e5')
        self.course = Course.objects.create(
            category=self.category, name='Generative AI', slug='generative-ai',
            duration_display='4 months', placement_rate=90, price=4999,
        )

    def test_list_courses_public(self):
        resp = self.client.get('/api/courses/')
        self.assertEqual(resp.status_code, 200)
        names = [c['name'] for c in resp.data['results']] if 'results' in resp.data else [c['name'] for c in resp.data]
        self.assertIn('Generative AI', names)

    def test_list_categories_includes_nested_courses(self):
        resp = self.client.get('/api/courses/categories/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        self.assertEqual(data[0]['slug'], 'ai-data')
        self.assertEqual(data[0]['courses'][0]['name'], 'Generative AI')

    def test_course_detail_by_slug(self):
        resp = self.client.get('/api/courses/generative-ai/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['price'], 4999)
