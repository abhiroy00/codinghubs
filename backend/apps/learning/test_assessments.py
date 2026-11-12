from copy import deepcopy
import uuid
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from .models import AssignmentReview, AssignmentSubmission, Chapter, Concept, Module, Progress, QuizAttempt, empty_content


class AssessmentTests(TestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.learner = User.objects.create_user('learner')
        self.other = User.objects.create_user('other')
        self.staff = User.objects.create_user('staff', is_staff=True)
        self.grader = User.objects.create_user('grader', is_staff=True)
        self.viewer = User.objects.create_user('viewer', is_staff=True)
        self.grader.user_permissions.add(Permission.objects.get(content_type__app_label='learning', codename='grade_assignmentsubmission'))
        self.viewer.user_permissions.add(Permission.objects.get(content_type__app_label='learning', codename='view_assignmentsubmission'))
        module = Module.objects.create(number=1, slug='foundations', title='Foundations')
        chapter = Chapter.objects.create(module=module, title='First chapter', position=1)
        self.concept = Concept.objects.create(chapter=chapter, title='Example', slug='example', position=1)
        self.unpublished = Concept.objects.create(chapter=chapter, title='Not ready', slug='unpublished', position=2)
        content = empty_content()
        content['assessment']['quiz'] = [{'question': 'Choose the correct option', 'options': ['Correct', 'Incorrect'], 'answer': 0, 'explanation': 'The first option is correct in this fixture.'}]
        content['assessment']['assignment'] = {'problem': 'Implement an exact function', 'requirements': 'Return expected values', 'acceptance_criteria': 'Pass all required tests', 'rubric': 'At least 80 and all required tests'}
        self.concept.published = {'title': 'Published example', 'content': content}
        self.concept.version = 1
        self.concept.save()
        self.client = APIClient()
        self.base = '/api/learning/concepts/example/'

    def tearDown(self):
        cache.clear()

    def auth(self, user=None):
        self.client.force_authenticate(user or self.learner)

    def submit(self, **changes):
        payload = {'request_key': str(uuid.uuid4()), 'version': 1,
                   'response': 'My implementation and independently verified test results.', 'repository_url': ''}
        payload.update(changes)
        return self.client.post(self.base + 'submissions/', payload, format='json')

    def grade(self, pk, **changes):
        payload = {'review_version': 0, 'score': 90, 'acceptance_confirmed': True,
                   'feedback': 'The submitted implementation meets all required acceptance checks.'}
        payload.update(changes)
        return self.client.post(f'/api/admin/learning/submissions/{pk}/', payload, format='json')

    def test_submissions_require_authentication_and_a_published_assignment(self):
        self.assertEqual(self.submit().status_code, 401)
        self.auth()
        self.assertEqual(self.client.post('/api/learning/concepts/unpublished/submissions/', {'request_key': str(uuid.uuid4()), 'version': 1, 'response': 'Long enough implementation response'}, format='json').status_code, 404)
        self.concept.published['content']['assessment'].pop('assignment')
        self.concept.save()
        self.assertEqual(self.submit().status_code, 400)
        self.assertEqual(AssignmentSubmission.objects.count(), 0)

    def test_submission_is_ungraded_and_captures_immutable_assignment_context(self):
        self.auth()
        result = self.submit()
        self.assertEqual(result.status_code, 201)
        row = AssignmentSubmission.objects.get()
        self.assertEqual(row.status, 'submitted')
        self.assertIsNone(row.score)
        self.assertFalse(row.acceptance_confirmed)
        self.assertFalse(result.json()['passed'])
        self.concept.published['content']['assessment']['assignment']['rubric'] = 'Changed later'
        self.concept.save()
        row.refresh_from_db()
        self.assertNotEqual(row.assignment_snapshot['assignment']['rubric'], 'Changed later')

    def test_idempotent_retry_and_duplicate_pending_submissions(self):
        self.auth()
        key = str(uuid.uuid4())
        first = self.submit(request_key=key)
        retry = self.submit(request_key=key)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(first.json()['id'], retry.json()['id'])
        self.assertEqual(self.submit(request_key=key, response='Different implementation and different evidence.').status_code, 409)
        self.assertEqual(self.submit().status_code, 409)
        self.assertEqual(AssignmentSubmission.objects.count(), 1)

    def test_invalid_input_cannot_forge_a_grade_or_trigger_url_fetching(self):
        self.auth()
        for payload in [{'score': 100}, {'status': 'reviewed'}, {'reviewer': self.grader.pk}, {'repository_url': 'http://example.com/repo'}, {'repository_url': 'javascript:alert(1)'}, {'response': 'short'}, {'request_key': 'not-a-uuid'}]:
            self.assertEqual(self.submit(**payload).status_code, 400)
        self.assertEqual(AssignmentSubmission.objects.count(), 0)

    def test_submission_and_quiz_history_are_account_scoped(self):
        self.auth()
        own = self.submit()
        self.assertEqual(own.status_code, 201)
        self.client.post(self.base + 'quiz/', {'version': 1, 'answers': [0]}, format='json')
        self.auth(self.other)
        self.assertEqual(self.client.get(self.base + 'submissions/').json()['count'], 0)
        self.assertEqual(self.client.get(self.base + 'quiz-attempts/').json()['count'], 0)
        self.assertEqual(self.client.get(f'/api/admin/learning/submissions/{own.json()["id"]}/').status_code, 403)
        # Request keys are scoped per account, not a way to retrieve another learner's record.
        key = str(AssignmentSubmission.objects.get().request_key)
        self.assertEqual(self.submit(request_key=key).status_code, 201)

    def test_only_permitted_reviewers_can_grade_and_self_grading_is_forbidden(self):
        self.auth()
        pk = self.submit().json()['id']
        for user in [self.learner, self.staff, self.viewer]:
            self.auth(user)
            self.assertEqual(self.grade(pk).status_code, 403)
        self.auth(self.viewer)
        self.assertEqual(self.client.get(f'/api/admin/learning/submissions/{pk}/').status_code, 200)
        self.auth(self.grader)
        own_pk = self.submit().json()['id']
        self.assertEqual(self.grade(own_pk).status_code, 403)
        self.assertEqual(self.grade(pk).status_code, 200)

    def test_passing_grade_requires_explicit_acceptance_confirmation(self):
        self.auth()
        pk = self.submit().json()['id']
        self.auth(self.grader)
        for values in [{'score': 101}, {'score': -1}, {'feedback': 'OK'}, {'score': 90, 'acceptance_confirmed': False}, {'reviewer': self.learner.pk}]:
            self.assertEqual(self.grade(pk, **values).status_code, 400)
        self.assertEqual(AssignmentReview.objects.count(), 0)
        result = self.grade(pk, score=60, acceptance_confirmed=False)
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()['passed'])
        self.assertEqual(AssignmentReview.objects.count(), 1)

    def test_review_revisions_preserve_history_and_reject_stale_writes(self):
        self.auth()
        pk = self.submit().json()['id']
        self.auth(self.grader)
        self.assertEqual(self.grade(pk).status_code, 200)
        self.assertEqual(self.grade(pk, score=40, acceptance_confirmed=False).status_code, 409)
        result = self.grade(pk, review_version=1, score=70, acceptance_confirmed=False, feedback='Additional review found a missing required boundary check.')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['review_version'], 2)
        self.assertEqual(list(AssignmentReview.objects.order_by('version').values_list('score', flat=True)), [90, 70])

    def test_revised_failing_grade_retracts_mastery_without_erasing_evidence(self):
        self.auth()
        pk = self.submit().json()['id']
        Progress.objects.create(user=self.learner, concept=self.concept, version=1, parts=['concept', 'practice', 'industry', 'assessment'], best_score=100)
        self.auth(self.grader)
        self.grade(pk)
        self.auth()
        self.assertEqual(self.client.get('/api/learning/summary/').json()['mastered_concepts'], 1)
        self.auth(self.grader)
        self.grade(pk, review_version=1, score=70, acceptance_confirmed=False)
        self.auth()
        self.assertEqual(self.client.get('/api/learning/summary/').json()['mastered_concepts'], 0)
        self.assertEqual(AssignmentReview.objects.count(), 2)
        self.assertEqual(Progress.objects.get().best_score, 100)

    def test_private_responses_and_pending_status_do_not_depend_on_page_contents(self):
        self.auth()
        self.submit()
        response = self.client.get(self.base + 'submissions/')
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        self.assertTrue(response.json()['pending_current'])
        self.assertEqual(self.client.get('/api/learning/summary/')['Cache-Control'], 'private, no-store')

    def test_new_attempt_allowed_after_review_but_current_mastery_uses_verified_evidence(self):
        self.auth()
        pk = self.submit().json()['id']
        Progress.objects.create(user=self.learner, concept=self.concept, version=1, parts=['concept', 'practice', 'industry', 'assessment'], best_score=100)
        self.assertFalse(self.client.get('/api/learning/progress/').json()[0]['mastered'])
        self.auth(self.grader)
        self.grade(pk)
        self.auth()
        data = self.client.get('/api/learning/progress/').json()[0]
        self.assertTrue(data['mastered'])
        self.assertEqual(data['assignment_score'], 90)
        self.assertEqual(self.submit().status_code, 201)
        summary = self.client.get('/api/learning/summary/').json()
        self.assertEqual(summary['total_concepts'], 2)
        self.assertEqual(summary['published_concepts'], 1)
        self.assertEqual(summary['percent_mastered'], 50)
        self.assertFalse(summary['certificate_eligible'])

    def test_new_lesson_version_does_not_reuse_old_assignment_grade(self):
        self.auth()
        pk = self.submit().json()['id']
        self.auth(self.grader)
        self.grade(pk)
        self.concept.version = 2
        self.concept.save()
        Progress.objects.create(user=self.learner, concept=self.concept, version=2, parts=['concept', 'practice', 'industry', 'assessment'], best_score=100)
        self.auth()
        self.assertFalse(self.client.get('/api/learning/progress/').json()[0]['mastered'])
        self.assertFalse(self.client.get(self.base + 'submissions/').json()['results'][0]['is_current_version'])
        self.assertEqual(self.submit().status_code, 409)
        self.assertEqual(self.submit(version=2).status_code, 201)

    def test_quiz_attempts_keep_all_scores_and_invalid_requests_write_nothing(self):
        self.auth()
        for answers in [[0], [1], [0]]:
            self.assertEqual(self.client.post(self.base + 'quiz/', {'version': 1, 'answers': answers}, format='json').status_code, 200)
        self.assertEqual(list(QuizAttempt.objects.order_by('pk').values_list('score', flat=True)), [100, 0, 100])
        self.assertEqual(Progress.objects.get().best_score, 100)
        for payload in [{'version': True, 'answers': [0]}, {'version': 2, 'answers': [0]}, {'version': 1, 'answers': [True]}]:
            self.assertIn(self.client.post(self.base + 'quiz/', payload, format='json').status_code, [400, 409])
        self.assertEqual(QuizAttempt.objects.count(), 3)
        history = self.client.get(self.base + 'quiz-attempts/').json()
        self.assertEqual(history['count'], 3)
        self.assertNotIn('answers', history['results'][0])

    def test_submission_database_constraints_guard_against_invalid_state(self):
        self.auth()
        self.submit()
        submission = AssignmentSubmission.objects.get()
        with self.assertRaises(IntegrityError), transaction.atomic():
            AssignmentSubmission.objects.filter(pk=submission.pk).update(status='reviewed', score=100)
        submission.refresh_from_db()
        self.assertEqual(submission.status, 'submitted')
