import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.courses.management.commands.validate_prep_content import CONTENT_DIR
from apps.courses.models import PrepCurriculum, PrepLesson


class AdminPrepApiTests(TestCase):
    def setUp(self):
        cache.clear()
        call_command('seed_prep_content', verbosity=0)
        self.client = APIClient()
        self.client.force_authenticate(get_user_model().objects.create_user(username='staff', password='pw', is_staff=True))
        self.curriculum = PrepCurriculum.objects.get(slug='generative-ai')
        self.lesson = json.loads((CONTENT_DIR / 'generative-ai' / 'day-01.json').read_text(encoding='utf-8'))

    def test_non_staff_are_refused(self):
        self.client.force_authenticate(get_user_model().objects.create_user(username='learner', password='pw'))
        self.assertEqual(self.client.get('/api/admin/prep/').status_code, 403)

    def test_edit_validates_and_marks_lesson_as_edited(self):
        url = f'/api/admin/prep/{self.curriculum.pk}/lessons/1/'
        bad = dict(self.lesson, quiz=self.lesson['quiz'][:2])
        self.assertEqual(self.client.put(url, bad, format='json').status_code, 400)
        changed = dict(self.lesson, title='Generative AI basics')
        resp = self.client.put(url, changed, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(PrepLesson.objects.get(curriculum=self.curriculum, day=1).edited_in_admin)
        self.assertEqual(self.client.get('/api/courses/prep/generative-ai/1/').data['title'], 'Generative AI basics')
        reset = self.client.post(f'{url}reset/')
        self.assertEqual(reset.data['title'], self.lesson['title'])
        self.assertFalse(reset.data['edited_in_admin'])

    def test_add_swap_and_delete_days(self):
        url = f'/api/admin/prep/{self.curriculum.pk}/lessons/29/'
        PrepLesson.objects.filter(curriculum=self.curriculum, day=29).delete()
        self.assertEqual(self.client.put(url, dict(self.lesson, title='A new topic'), format='json').status_code, 201)
        swapped = self.client.post(f'/api/admin/prep/{self.curriculum.pk}/swap/', {'day_a': 1, 'day_b': 29}, format='json')
        self.assertEqual(swapped.status_code, 200)
        self.assertEqual(PrepLesson.objects.get(curriculum=self.curriculum, day=1).title, 'A new topic')
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_course_links_cannot_overlap_and_pdf_upload_checks_type(self):
        other = self.client.post('/api/admin/prep/', {'slug': 'x', 'title': 'X', 'course_slugs': ['generative-ai']}, format='json')
        self.assertEqual(other.status_code, 400)
        from django.core.files.uploadedfile import SimpleUploadedFile
        not_pdf = SimpleUploadedFile('a.pdf', b'hello', content_type='application/pdf')
        self.assertEqual(self.client.post(f'/api/admin/prep/{self.curriculum.pk}/upload-pdf/', {'file': not_pdf}).status_code, 400)
