from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Chapter, Concept, Module, Progress, Revision, empty_content
from .quality import validate_content
from .management.commands.seed_genai_pilot import pilot_content


class LearningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.staff = get_user_model().objects.create_user('editor', password='test', is_staff=True)
        self.user = get_user_model().objects.create_user('learner', password='test')
        self.other = get_user_model().objects.create_user('other', password='test')
        module = Module.objects.create(number=99, slug='foundations', title='Foundations')
        chapter = Chapter.objects.create(module=module, position=1, title='Vectors')
        self.concept = Concept.objects.create(chapter=chapter, slug='cosine', title='Cosine', position=1)
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def publish_fixture(self):
        # Deliberately small fixtures exercise transport/persistence. Separate tests enforce real publication gates.
        content = empty_content()
        content['concept']['blocks'] = [{'type': 'text', 'title': 'A < B', 'body': '<script>alert(1)</script>'}]
        content['assessment']['quiz'] = [{'question': 'Are parallel nonzero vectors aligned?', 'options': ['Yes', 'No'], 'answer': 0, 'explanation': 'Their angle is zero.'}]
        self.concept.published = {'title': 'Cosine', 'seo_description': 'Vector geometry', 'content': content, 'difficulty': 'beginner', 'outcomes': [], 'references': [], 'prerequisites': []}
        self.concept.version = 1
        self.concept.save()

    def test_seed_complete_idempotent_and_preserves_content(self):
        call_command('seed_genai', stdout=StringIO())
        count = Concept.objects.count()
        c = Concept.objects.get(slug='01-introduction-to-artificial-intelligence')
        c.title = 'Edited title'
        c.save()
        call_command('seed_genai', stdout=StringIO())
        c.refresh_from_db()
        self.assertEqual(c.title, 'Edited title')
        self.assertEqual(Concept.objects.count(), count)
        self.assertEqual(count, 271)  # includes this test's fixture
        self.assertEqual(Module.objects.count(), 19)
        self.assertTrue(all(set(c.content) == {'concept', 'practice', 'industry', 'assessment'} for c in Concept.objects.all()))

    def test_draft_hidden_preview_staff_only(self):
        url = '/api/learning/concepts/cosine/'
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertIn(self.client.get(url + '?preview=1').status_code, [401, 403])
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(url + '?preview=1').status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(url + '?preview=1').status_code, 403)
        self.staff.user_permissions.add(Permission.objects.get(codename='view_concept', content_type__app_label='learning'))
        self.staff = get_user_model().objects.get(pk=self.staff.pk)
        self.client.force_authenticate(self.staff)
        self.assertTrue(self.client.get(url + '?preview=1').json()['preview'])

    def test_publication_gate_rejects_incomplete_content(self):
        self.concept.status = 'approved'
        self.concept.code_verified = True
        self.concept.reviewed_by = self.staff
        self.concept.save()
        with self.assertRaises(ValidationError):
            self.concept.publish(self.staff)
        self.assertEqual(Revision.objects.count(), 0)

    def test_invalid_blocks_are_validation_errors(self):
        for bad in [None, [], {'concept': {}}, {**empty_content(), 'concept': {'blocks': [{'type': 'text', 'body': 2}]}}]:
            with self.assertRaises(ValidationError):
                validate_content(bad)

    def test_published_snapshot_survives_draft_edit_and_hides_answers(self):
        self.publish_fixture()
        self.concept.content['concept']['blocks'] = [{'type': 'text', 'body': 'Private draft'}]
        self.concept.save()
        response = self.client.get('/api/learning/concepts/cosine/').json()
        self.assertNotIn('Private draft', str(response))
        self.assertNotIn('answer', response['content']['assessment']['quiz'][0])
        self.assertNotIn('explanation', response['content']['assessment']['quiz'][0])

    def test_progress_is_private_and_cannot_forge_scores(self):
        self.publish_fixture()
        url = '/api/learning/concepts/cosine/progress/'
        self.assertEqual(self.client.patch(url, {}, format='json').status_code, 401)
        self.client.force_authenticate(self.user)
        r = self.client.patch(url, {'version': 1, 'parts': ['concept', 'practice', 'industry', 'assessment'], 'notes': 'Private', 'best_score': 100}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['completed'])
        self.assertEqual(r.json()['best_score'], 0)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/learning/progress/').json(), [])

    def test_quiz_grades_on_server_and_requires_correct_version(self):
        self.publish_fixture()
        self.client.force_authenticate(self.user)
        url = '/api/learning/concepts/cosine/quiz/'
        for answer in [True, -1, 2, '0']:
            self.assertEqual(self.client.post(url, {'version': 1, 'answers': [answer]}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'version': 2, 'answers': [0]}, format='json').status_code, 409)
        result = self.client.post(url, {'version': 1, 'answers': [0]}, format='json').json()
        self.assertEqual(result['score'], 100)
        result = self.client.post(url, {'version': 1, 'answers': [1]}, format='json').json()
        self.assertEqual(result['score'], 0)
        self.assertEqual(result['progress']['best_score'], 100)
        self.assertFalse(result['progress']['completed'])

    def test_new_version_requires_revision_without_losing_notes(self):
        self.publish_fixture()
        Progress.objects.create(user=self.user, concept=self.concept, version=0, parts=['concept'], notes='Keep me', best_score=100)
        self.client.force_authenticate(self.user)
        r = self.client.patch('/api/learning/concepts/cosine/progress/', {'version': 1, 'bookmark': True}, format='json')
        self.assertEqual(r.json()['parts'], [])
        self.assertEqual(r.json()['best_score'], 0)
        self.assertEqual(r.json()['notes'], 'Keep me')

    def test_seo_only_published_content_and_escaped_html(self):
        self.assertEqual(self.client.get('/learn/ai-engineering/cosine/').status_code, 404)
        self.assertNotIn('cosine/', self.client.get('/sitemap-learning.xml').content.decode())
        self.assertContains(self.client.get('/learn/'), 'content="noindex, follow"')
        self.assertNotIn('<loc>', self.client.get('/sitemap-learning.xml').content.decode())
        self.publish_fixture()
        response = self.client.get('/learn/ai-engineering/cosine/')
        self.assertContains(response, 'rel="canonical"')
        self.assertContains(response, '&lt;script&gt;')
        self.assertNotContains(response, '<script>alert(1)</script>')
        sitemap = self.client.get('/sitemap-learning.xml').content.decode()
        self.assertIn('cosine/', sitemap)
        self.assertIn('https://codinghubs.in/learn/</loc>', sitemap)
        self.assertContains(self.client.get('/learn/'), 'content="index, follow, max-image-preview:large"')
        self.assertNotIn('<lastmod>', sitemap)  # no published revision recorded, so no date is claimed
        self.assertIn('content="index, follow, max-image-preview:large"', response.content.decode())

    def test_learning_path_is_indexed_only_once_a_concept_is_published(self):
        from .models import LearningCourse
        LearningCourse.objects.get_or_create(slug='ai-engineering', defaults={'title': 'AI Engineering', 'summary': 'Path', 'is_active': True})
        LearningCourse.objects.filter(slug='ai-engineering').update(is_active=True)
        self.concept.chapter.module.course = LearningCourse.objects.get(slug='ai-engineering')
        self.concept.chapter.module.save()
        hub = self.client.get('/learn/ai-engineering/')
        self.assertContains(hub, 'content="noindex, follow"')
        self.assertNotContains(hub, 'rel="canonical"')
        self.publish_fixture()
        from .models import Revision
        Revision.objects.create(concept=self.concept, version=1, snapshot=self.concept.published)
        hub = self.client.get('/learn/ai-engineering/')
        self.assertContains(hub, 'content="index, follow, max-image-preview:large"')
        self.assertContains(hub, '<link rel="canonical" href="https://codinghubs.in/learn/ai-engineering/">')
        sitemap = self.client.get('/sitemap-learning.xml').content.decode()
        self.assertIn('/learn/ai-engineering/</loc><lastmod>', sitemap)
        self.assertIn('/learn/ai-engineering/cosine/</loc><lastmod>', sitemap)

    def test_publication_creates_immutable_history(self):
        self.concept.status = 'approved'
        self.concept.reviewed_by = self.staff
        self.concept.code_verified = True
        self.concept.references = [{'title': 'Reference', 'url': 'https://example.com'}]
        self.concept.outcomes = ['Explain the geometry']
        self.concept.seo_description = 'Geometry lesson'
        self.concept.save()
        with patch('apps.learning.models.validate_content'):
            self.concept.publish(self.staff)
        self.concept.refresh_from_db()
        self.assertEqual(self.concept.version, 1)
        self.assertEqual(Revision.objects.get().snapshot, self.concept.published)
        self.concept.slug = 'changed'
        with self.assertRaises(ValidationError):
            self.concept.full_clean()

    def test_pilot_passes_quality_and_its_code_runs(self):
        content = pilot_content()
        validate_content(content, publishing=True)
        code = next(b for b in content['practice']['blocks'] if b['type'] == 'code')
        output = StringIO()
        namespace = {'__name__': '__main__'}
        with redirect_stdout(output):
            exec(compile(code['body'], 'trusted-pilot-example', 'exec'), namespace)
        self.assertEqual(output.getvalue().strip(), code['expected_output'])
        cosine = namespace['cosine']
        for a, b in [([], []), ([1], [1, 0]), ([0, 0], [1, 0]), ([float('nan')], [1]), ([float('inf')], [1])]:
            with self.assertRaises(ValueError):
                cosine(a, b)
        self.assertAlmostEqual(cosine([1e-300, 0], [1, 0]), 1)

    def test_pilot_seed_stays_unpublished_and_is_repeatable(self):
        call_command('seed_genai_pilot', stdout=StringIO())
        c = Concept.objects.get(slug='08-cosine-similarity')
        self.assertEqual(c.status, 'in_review')
        self.assertFalse(c.version)
        first = c.content
        call_command('seed_genai_pilot', stdout=StringIO())
        c.refresh_from_db()
        self.assertEqual(c.content, first)

    def test_real_pilot_publication_and_curriculum_routes(self):
        call_command('seed_genai_pilot', stdout=StringIO())
        c = Concept.objects.get(slug='08-cosine-similarity')
        c.status, c.code_verified, c.reviewed_by = 'approved', True, self.staff
        c.save()
        c.publish(self.staff)
        curriculum = self.client.get('/api/learning/curriculum/').json()
        concepts = [c for m in curriculum for ch in m['chapters'] for c in ch['concepts']]
        self.assertEqual(len(concepts), 271)
        response = self.client.get('/api/learning/concepts/08-cosine-similarity/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()['content']), {'concept', 'practice', 'industry', 'assessment'})
        # This sweep verifies routing, not request-rate policy; avoid exhausting the shared throttle cache.
        with patch('apps.learning.views.ConceptView.throttle_classes', []):
            for c in concepts:
                result = self.client.get(f'/api/learning/concepts/{c["slug"]}/')
                self.assertEqual(result.status_code, 200 if c['available'] else 404)
