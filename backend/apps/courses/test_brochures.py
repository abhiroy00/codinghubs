import tempfile
from pathlib import Path
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import Course, CourseCategory, CourseBrochure


def pdf(name='guide.pdf', content=b'%PDF-1.7\nexample\n%%EOF', mime='application/pdf'):
    return SimpleUploadedFile(name, content, content_type=mime)


class BrochureTests(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.override = override_settings(PRIVATE_MEDIA_ROOT=self.temp.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.category = CourseCategory.objects.create(name='AI', slug='ai')
        self.course = Course.objects.create(name='AI Foundations', slug='ai-foundations', category=self.category)
        self.other = Course.objects.create(name='Other', slug='other', category=self.category)
        self.staff = get_user_model().objects.create_user(username='staff', is_staff=True)
        self.student = get_user_model().objects.create_user(username='student')
        self.api = APIClient()
        self.url = f'/api/admin/courses/{self.course.pk}/brochure/'
        self.public = '/api/courses/brochures/ai-foundations/'

    def upload(self, **extra):
        self.api.force_authenticate(self.staff)
        return self.api.put(self.url, {'file': pdf(), 'title': 'AI course guide', **extra}, format='multipart')

    def test_admin_authorization_and_stable_course_mapping(self):
        for user in [None, self.student]:
            self.api.force_authenticate(user)
            for method in ['get', 'put', 'patch', 'delete']:
                self.assertIn(getattr(self.api, method)(self.url, {}).status_code, [401, 403])
        self.assertEqual(self.upload().status_code, 200)
        self.assertEqual(CourseBrochure.objects.get().course_id, self.course.pk)
        self.assertEqual(self.api.get(f'/api/admin/courses/{self.other.pk}/brochure/').status_code, 404)

    def test_extension_mime_signature_size_and_generated_storage_key(self):
        self.api.force_authenticate(self.staff)
        for invalid in [pdf('x.exe'), pdf(mime='text/html'), pdf(content=b'<script>bad</script>')]:
            self.assertEqual(self.api.put(self.url, {'file': invalid}, format='multipart').status_code, 400)
        with override_settings(BROCHURE_MAX_BYTES=10):
            self.assertEqual(self.api.put(self.url, {'file': pdf()}, format='multipart').status_code, 400)
        self.assertFalse(CourseBrochure.objects.exists())
        self.upload(download_name='../../learn.pdf')
        row = CourseBrochure.objects.get()
        self.assertRegex(row.storage_key, r'^brochures/[a-f0-9]{32}\.pdf$')
        self.assertEqual(row.download_name, 'learn.pdf')

    def test_publication_download_headers_and_unpublish(self):
        self.upload()
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(self.public).status_code, 404)
        self.api.force_authenticate(self.staff)
        self.api.patch(self.url, {'is_published': True}, format='json')
        self.api.force_authenticate(None)
        response = self.api.get(self.public)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('storage_key', response.data)
        result = self.api.get(self.public + 'download/')
        self.assertEqual(result['Content-Type'], 'application/pdf')
        self.assertIn('attachment;', result['Content-Disposition'])
        self.assertEqual(result['X-Content-Type-Options'], 'nosniff')
        self.assertIn('sandbox', result['Content-Security-Policy'])
        self.assertIn('no-store', result['Cache-Control'])
        self.assertTrue(b''.join(result.streaming_content).startswith(b'%PDF-'))
        self.api.force_authenticate(self.staff)
        self.api.patch(self.url, {'is_published': False}, format='json')
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(self.public + 'download/').status_code, 404)

    def test_failed_replacement_preserves_old_file_and_cleans_new_file(self):
        self.upload(is_published=True)
        row = CourseBrochure.objects.get()
        old_key = row.storage_key
        with patch.object(CourseBrochure, 'save', side_effect=RuntimeError('database unavailable')):
            with self.assertRaises(RuntimeError):
                self.upload()
        row.refresh_from_db()
        self.assertEqual(row.storage_key, old_key)
        self.assertTrue((Path(self.temp.name) / old_key).exists())
        self.assertEqual(len(list(Path(self.temp.name).rglob('*.pdf'))), 1)

    def test_successful_replace_retires_old_only_after_commit(self):
        self.upload()
        old = CourseBrochure.objects.get().storage_key
        with self.captureOnCommitCallbacks(execute=True):
            self.upload()
            self.assertTrue((Path(self.temp.name) / old).exists())
        self.assertFalse((Path(self.temp.name) / old).exists())
        self.assertEqual(len(list(Path(self.temp.name).rglob('*.pdf'))), 1)
        with self.captureOnCommitCallbacks(execute=True):
            self.api.delete(self.url)
        self.assertFalse(list(Path(self.temp.name).rglob('*.pdf')))
