from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from apps.courses.models import LearningProgress
from .interview import catalog
from .models import InterviewState


class InterviewTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.one = get_user_model().objects.create_user(username='one')
        self.two = get_user_model().objects.create_user(username='two')
        self.url = '/api/auth/interview-state/resource/'
        self.resource = '/interview/guides/sliding-window/'

    def test_every_legacy_nested_route_preserves_destination_and_query(self):
        paths = ['', 'generative-ai/', 'generative-ai/levels/1/', 'generative-ai/levels/1/articles/ai-ml-deep-learning/', 'python-full-stack/levels/2/days/8/']
        for suffix in paths:
            response = self.api.get('/interview-prep/' + suffix + '?q=hello&page=2')
            self.assertEqual(response.status_code, 301)
            self.assertEqual(response['Location'], '/interview/' + suffix + '?q=hello&page=2')

    def test_all_catalogued_legacy_urls_map_to_their_individual_canonical_resource(self):
        for row in catalog():
            if row['kind'] == 'guide':
                continue
            old = row['url'].replace('/interview/', '/interview-prep/', 1)
            response = self.api.get(old + '?topic=kept')
            self.assertEqual(response.status_code, 301)
            self.assertEqual(response['Location'], row['url'] + '?topic=kept')

    def test_search_topics_full_text_and_reliable_filters(self):
        response = self.api.get('/api/interview/resources/?q=monotonicity&category=DSA&difficulty=Intermediate')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r['url'] for r in response.data['results']], [self.resource])
        self.assertNotIn('search', response.data['results'][0])
        none = self.api.get('/api/interview/resources/?q=nonexistentzzzzzzzz')
        self.assertEqual(none.data['count'], 0)
        self.assertGreater(len(catalog()), 200)
        self.assertEqual(sum(r['kind'] == 'guide' for r in catalog()), 8)

    def test_new_published_database_questions_are_searchable_with_a_direct_practice_link(self):
        from apps.courses.models import CourseQuestion
        row = CourseQuestion.objects.create(course_slug='generative-ai', course_name='Generative AI', level='advanced', topic='Transactions', question='How do you handle an uncertain commit?', answer='An opaquecommitmarker identifies a request.', explanation='Use a durable idempotency boundary.', is_published=True)
        response = self.api.get('/api/interview/resources/?q=opaquecommitmarker&difficulty=Advanced')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['url'], f'/interview/generative-ai/?question={row.pk}#practice')
        row.is_published = False
        row.save()
        self.assertEqual(self.api.get('/api/interview/resources/?q=opaquecommitmarker').data['count'], 0)

    def test_owner_scope_idempotence_and_private_cache(self):
        self.assertIn(self.api.put(self.url, {'resource': self.resource, 'bookmarked': True}).status_code, [401, 403])
        self.api.force_authenticate(self.one)
        for _ in range(2):
            result = self.api.put(self.url, {'resource': self.resource, 'bookmarked': True, 'completed': True}, format='json')
            self.assertEqual(result.status_code, 200)
        self.assertEqual(InterviewState.objects.count(), 1)
        self.assertIn('no-store', result['Cache-Control'])
        self.api.force_authenticate(self.two)
        self.assertEqual(self.api.get('/api/auth/interview-state/').data['count'], 0)
        self.assertEqual(self.api.put(self.url, {'resource': self.resource, 'bookmarked': False}, format='json').status_code, 200)
        self.assertTrue(InterviewState.objects.get(user=self.one).bookmarked)
        bad = self.api.put(self.url, {'resource': self.resource, 'user': self.one.pk, 'completed': True}, format='json')
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.api.put(self.url, {'resource': 'https://evil.example/x', 'completed': True}).status_code, 400)
        self.api.force_authenticate(self.one)
        self.api.put(self.url, {'resource': self.resource, 'viewed': True}, format='json')
        self.assertIsNotNone(InterviewState.objects.get(user=self.one).viewed_at)
        self.assertEqual(self.api.get('/api/auth/interview-state/?completed=true').data['count'], 1)
        self.assertEqual(self.api.get('/api/auth/me/export/').data['interview_activity'][0]['resource'], self.resource)

    def test_guest_import_unions_data_keeps_best_scores_and_never_crosses_accounts(self):
        self.api.force_authenticate(self.one)
        LearningProgress.objects.create(user=self.one, course_slug='generative-ai', completed_days=[1], quiz_scores={'1': 5}, current_day=2)
        url = '/api/courses/learning/progress/generative-ai/import/'
        payload = {'completed_days': [1, 2], 'quiz_scores': {'1': 3, '2': 4}, 'completed_theory': [2], 'completed_challenges': [2], 'current_day': 3}
        for _ in range(2):
            result = self.api.post(url, payload, format='json')
            self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['completed_days'], [1, 2])
        self.assertEqual(result.data['quiz_scores'], {'1': 5, '2': 4})
        self.assertEqual(result.data['current_day'], 3)
        self.assertFalse(LearningProgress.objects.filter(user=self.two).exists())
        self.assertEqual(self.api.post(url, {'user': self.two.pk}, format='json').status_code, 400)
        self.assertEqual(self.api.post('/api/courses/learning/progress/not-a-course/import/', payload, format='json').status_code, 404)

    def test_published_questions_on_known_alias_courses_are_not_lost_from_search(self):
        from apps.courses.models import CourseQuestion
        row = CourseQuestion.objects.create(course_slug='ai-engineering', course_name='AI Engineering', level='basic', topic='Evaluation', question='How do you compare evaluation boundaries?', answer='An aliassearchmarker preserves this published question.', explanation='Use the existing course question bank.', is_published=True)
        result = self.api.get('/api/interview/resources/?q=aliassearchmarker')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data['results'][0]['url'], f'/interview/ai-engineering/?question={row.pk}#practice')
