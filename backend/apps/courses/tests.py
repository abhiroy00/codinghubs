from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from django.core.management import call_command

from .models import Course, CourseCategory, PrepCurriculum, PrepLesson


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

    def test_learning_progress_requires_authentication(self):
        resp = self.client.get('/api/courses/learning/progress/generative-ai/')
        self.assertEqual(resp.status_code, 401)

    def test_authenticated_learning_progress_can_be_saved_and_listed(self):
        user = get_user_model().objects.create_user(username='learner', password='test-password')
        self.client.force_authenticate(user=user)
        saved = self.client.put('/api/courses/learning/progress/generative-ai/', {
            'current_day': 4,
            'completed_days': [1, 2, 3],
            'quiz_scores': {'1': 4, '2': 5, '3': 3},
            'completed_challenges': [1, 2, 3],
            'completed_theory': [1, 2, 3],
        }, format='json')
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data['current_day'], 4)
        listed = self.client.get('/api/courses/learning/progress/')
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data[0]['course_slug'], 'generative-ai')
        self.assertEqual(listed.data[0]['completed_days'], [1, 2, 3])

    @override_settings(PREP_REQUIRE_SEQUENTIAL_UNLOCK=True)
    def test_learning_days_unlock_sequentially_per_user(self):
        first = get_user_model().objects.create_user(username='first', password='test-password')
        second = get_user_model().objects.create_user(username='second', password='test-password')
        self.client.force_authenticate(user=first)
        skipped = self.client.put('/api/courses/learning/progress/generative-ai/', {'completed_days': [1, 3]}, format='json')
        self.assertEqual(skipped.status_code, 400)
        unfinished = self.client.put('/api/courses/learning/progress/generative-ai/', {'completed_days': [1], 'completed_theory': [1], 'completed_challenges': [1], 'quiz_scores': {'1': 2}}, format='json')
        self.assertEqual(unfinished.status_code, 400)
        saved = self.client.put('/api/courses/learning/progress/generative-ai/', {'completed_days': [1], 'current_day': 5, 'completed_theory': [1], 'completed_challenges': [1], 'quiz_scores': {'1': 3}}, format='json')
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data['current_day'], 2)
        self.client.force_authenticate(user=second)
        other = self.client.get('/api/courses/learning/progress/generative-ai/')
        self.assertEqual(other.data['completed_days'], [])
        self.assertEqual(other.data['current_day'], 1)

    def test_learning_days_can_be_completed_out_of_order_while_unlocked(self):
        user = get_user_model().objects.create_user(username='open', password='test-password')
        self.client.force_authenticate(user=user)
        saved = self.client.put('/api/courses/learning/progress/generative-ai/', {
            'completed_days': [5], 'current_day': 5,
            'completed_theory': [5], 'completed_challenges': [5], 'quiz_scores': {'5': 4},
        }, format='json')
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data['completed_days'], [5])
        self.assertEqual(saved.data['current_day'], 5)


class PrepContentTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_seeded_lessons_are_served_and_admin_edits_survive_reseeding(self):
        call_command('seed_prep_content', verbosity=0)
        outline = self.client.get('/api/courses/prep/generative-ai/')
        self.assertEqual(outline.status_code, 200)
        self.assertEqual(outline.data['days'][0]['title'], 'Introduction to Generative AI: Definition, Working & Applications')
        lesson = self.client.get('/api/courses/prep/generative-ai/1/')
        self.assertEqual(lesson.status_code, 200)
        self.assertEqual(len(lesson.data['quiz']), 5)
        self.assertEqual(lesson.data['practice']['kind'], 'coding')
        self.assertEqual(self.client.get('/api/courses/prep/no-such-course/').status_code, 404)

        edited = PrepLesson.objects.get(curriculum__slug='generative-ai', day=1)
        edited.title = 'Edited title'
        edited.edited_in_admin = True
        edited.save()
        call_command('seed_prep_content', verbosity=0)
        edited.refresh_from_db()
        self.assertEqual(edited.title, 'Edited title')

    def test_curriculum_is_shared_by_its_courses(self):
        PrepCurriculum.objects.create(slug='aws-sa', title='AWS SA', course_slugs=['aws-solutions-architect', 'aws-certified-solutions-architect'])
        self.assertEqual(self.client.get('/api/courses/prep/aws-certified-solutions-architect/').data['curriculum'], 'aws-sa')
