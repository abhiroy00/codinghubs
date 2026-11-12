from copy import deepcopy
import json
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.db import transaction
from django.test import TestCase
from rest_framework.test import APIClient
from .editing import save_draft
from .forms import ConceptForm
from .management.commands.seed_genai_pilot import pilot_content
from .models import Chapter, Concept, DraftRevision, Module, Revision


class AuthoringTests(TestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.student = User.objects.create_user('student')
        self.staff = User.objects.create_user('unassigned-staff', is_staff=True)
        self.editor = User.objects.create_user('author', is_staff=True)
        self.viewer = User.objects.create_user('reader', is_staff=True)
        self.publisher = User.objects.create_user('reviewer', is_staff=True)
        for user, permissions in [(self.editor, ['view_concept', 'change_concept']), (self.viewer, ['view_concept']), (self.publisher, ['view_concept', 'change_concept', 'publish_concept'])]:
            user.user_permissions.set(Permission.objects.filter(content_type__app_label='learning', codename__in=permissions))
        module = Module.objects.create(number=1, title='Vectors', slug='vectors')
        chapter = Chapter.objects.create(module=module, position=1, title='Similarity')
        self.lesson = Concept.objects.create(chapter=chapter, title='Cosine similarity', slug='cosine', position=1)
        self.other = Concept.objects.create(chapter=chapter, title='Dot products', slug='dot', position=2)
        self.base = f'/api/admin/learning/concepts/{self.lesson.pk}/'
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def auth(self, user=None):
        self.client.force_authenticate(user or self.editor)

    def patch(self, values):
        return self.client.patch(self.base, values, format='json')

    def post(self, action, values):
        return self.client.post(self.base + action + '/', values, format='json')

    def seed_reviewable(self):
        self.lesson.content = pilot_content()
        self.lesson.outcomes = ['Derive the formula']
        self.lesson.references = [{'title': 'Python math', 'url': 'https://docs.python.org/3/library/math.html'}]
        self.lesson.seo_description = 'Geometry, Python and production retrieval.'
        self.lesson.status = 'in_review'
        self.lesson.save()

    def test_staff_and_model_permissions_are_required(self):
        self.assertEqual(self.client.get(self.base).status_code, 401)
        for user in [self.student, self.staff]:
            self.auth(user)
            self.assertEqual(self.client.get(self.base).status_code, 403)
            self.assertEqual(self.patch({'edit_version': 0, 'title': 'Denied'}).status_code, 403)
        self.auth(self.viewer)
        self.assertEqual(self.client.get(self.base).status_code, 200)
        self.assertEqual(self.patch({'edit_version': 0, 'title': 'Denied'}).status_code, 403)
        self.auth()
        self.assertEqual(self.post('approve', {'edit_version': 0, 'code_verified': True}).status_code, 403)
        self.assertEqual(self.post('publish', {'edit_version': 0}).status_code, 403)

    def test_saved_edits_preserve_previous_state_and_conflicts_do_not_write(self):
        self.auth()
        first = self.patch({'edit_version': 0, 'title': 'Updated title'})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()['edit_version'], 1)
        self.assertEqual(DraftRevision.objects.get().snapshot['title'], 'Cosine similarity')
        stale = self.patch({'edit_version': 0, 'title': 'Accidental overwrite'})
        self.assertEqual(stale.status_code, 409)
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.title, 'Updated title')
        self.assertEqual(DraftRevision.objects.count(), 1)

    def test_forged_review_and_publication_fields_are_rejected(self):
        self.auth()
        for values in [{'status': 'approved'}, {'code_verified': True}, {'reviewed_by_id': self.publisher.pk}, {'published': {'title': 'fake'}}, {'slug': 'rename'}, {'edit_version': -1}]:
            self.assertEqual(self.patch({'edit_version': 0, **values}).status_code, 400)
        self.assertEqual(DraftRevision.objects.count(), 0)

    def test_invalid_structure_and_urls_are_validation_errors(self):
        self.auth()
        content = deepcopy(self.lesson.content)
        content['concept']['blocks'] = [{'type': 'text', 'body': 'Fine', 'title': {}}]
        for values in [{'content': content}, {'references': [{'title': 'Unsafe', 'url': 'javascript:alert(1)'}]}, {'content': {**self.lesson.content, 'assessment': {'blocks': [], 'tasks': [1]}}}]:
            self.assertEqual(self.patch({'edit_version': 0, **values}).status_code, 400)
        self.assertEqual(DraftRevision.objects.count(), 0)

    def test_prerequisite_cycles_and_invalid_ids_are_rejected(self):
        self.auth()
        self.other.prerequisites.add(self.lesson)
        for prerequisites in [[self.lesson.pk], [self.other.pk], [999999], [self.other.pk, self.other.pk]]:
            self.assertEqual(self.patch({'edit_version': 0, 'prerequisites': prerequisites}).status_code, 400)
        self.assertEqual(DraftRevision.objects.count(), 0)

    def test_approval_and_publication_are_separate_and_conflict_checked(self):
        self.auth(self.publisher)
        self.assertEqual(self.post('approve', {'edit_version': 0, 'code_verified': True}).status_code, 400)
        self.seed_reviewable()
        self.assertEqual(self.post('approve', {'edit_version': 0, 'code_verified': False}).status_code, 400)
        response = self.post('approve', {'edit_version': 0, 'code_verified': True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['published_version'], 0)
        self.assertEqual(response.json()['status'], 'approved')
        self.assertEqual(self.post('publish', {'edit_version': 0}).status_code, 409)
        response = self.post('publish', {'edit_version': 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['published_version'], 1)
        self.assertEqual(response.json()['edit_version'], 2)
        self.assertEqual(Revision.objects.count(), 1)
        self.assertEqual(DraftRevision.objects.count(), 2)

    def test_metadata_edits_invalidate_review_and_keep_live_content(self):
        self.seed_reviewable()
        self.auth(self.publisher)
        self.post('approve', {'edit_version': 0, 'code_verified': True})
        self.post('publish', {'edit_version': 1})
        self.auth()
        response = self.patch({'edit_version': 2, 'title': 'New draft title'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'draft')
        self.assertFalse(response.json()['code_verified'])
        self.assertIsNone(response.json()['reviewed_by_id'])
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.published['title'], 'Cosine similarity')

    def test_restore_creates_new_unreviewed_draft_and_keeps_displaced_text(self):
        self.auth()
        self.patch({'edit_version': 0, 'title': 'Second state'})
        earlier = DraftRevision.objects.get()
        self.patch({'edit_version': 1, 'title': 'Third state'})
        self.assertEqual(self.post('restore', {'edit_version': 1, 'revision_id': earlier.pk}).status_code, 409)
        response = self.post('restore', {'edit_version': 2, 'revision_id': earlier.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], 'Cosine similarity')
        self.assertEqual(response.json()['edit_version'], 3)
        self.assertEqual(response.json()['status'], 'draft')
        self.assertFalse(response.json()['code_verified'])
        self.assertEqual(DraftRevision.objects.get(edit_version=2).snapshot['title'], 'Third state')

    def test_revision_ids_are_scoped_to_the_concept(self):
        self.auth()
        save_draft(self.other.pk, 0, self.editor, {'title': 'Other concept'})
        revision = DraftRevision.objects.get()
        self.assertEqual(self.client.get(self.base + f'history/{revision.pk}/').status_code, 404)
        self.assertEqual(self.post('restore', {'edit_version': 0, 'revision_id': revision.pk}).status_code, 404)

    def test_quality_counts_only_editorial_prose_and_history_is_paginated(self):
        self.seed_reviewable()
        self.auth()
        data = self.client.get(self.base).json()
        self.assertTrue(data['quality']['ready_for_review'])
        self.assertGreaterEqual(data['quality']['words']['concept'], 2000)
        for n in range(22):
            save_draft(self.lesson.pk, n, self.editor, {'title': f'Saved {n}'})
        response = self.client.get(self.base + 'history/').json()
        self.assertEqual(response['count'], 22)
        self.assertEqual(len(response['results']), 20)
        self.assertIsNotNone(response['next'])
        self.assertEqual(response['results'][0]['edit_version'], 21)

    def test_transaction_failure_rolls_back_archive_and_edit(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                save_draft(self.lesson.pk, 0, self.editor, {'title': 'Will roll back'})
                raise RuntimeError('Simulated later failure')
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.edit_version, 0)
        self.assertEqual(self.lesson.title, 'Cosine similarity')
        self.assertEqual(DraftRevision.objects.count(), 0)

    def test_django_form_rejects_stale_edit_version(self):
        self.auth()
        save_draft(self.lesson.pk, 0, self.editor, {'title': 'Already edited'})
        data = {'title': 'Stale form', 'slug': 'cosine', 'chapter': self.lesson.chapter_id,
                'position': 1, 'difficulty': 'beginner', 'status': 'draft', 'expected_edit_version': 0,
                **self.lesson.content}
        form = ConceptForm(data=data, instance=self.lesson)
        self.assertFalse(form.is_valid())
        self.assertIn('Another editor', str(form.errors))

    def test_django_admin_saves_share_history_and_stale_edit_protection(self):
        self.client.force_login(self.editor)
        url = f'/admin/learning/concept/{self.lesson.pk}/change/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = {'title': 'Saved through Django admin', 'slug': 'cosine', 'chapter': self.lesson.chapter_id,
                'position': 1, 'difficulty': 'beginner', 'status': 'draft', 'expected_edit_version': 0,
                'outcomes': '[]', 'references': '[]', 'seo_description': '',
                **{key: json.dumps(value) for key, value in self.lesson.content.items()}, '_save': 'Save'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 302, str(response.context and response.context['adminform'].form.errors))
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.edit_version, 1)
        self.assertEqual(DraftRevision.objects.get().snapshot['title'], 'Cosine similarity')
        data['title'] = 'Stale Django edit'
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Another editor')
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.title, 'Saved through Django admin')
        self.assertEqual(DraftRevision.objects.count(), 1)
