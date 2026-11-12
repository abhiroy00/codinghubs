from io import BytesIO, StringIO
import tempfile
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from pypdf import PdfWriter
from rest_framework.test import APIClient
from .documents import ReferenceStorage
from .management.commands.seed_genai_pilot import pilot_content
from .models import Chapter, ClaimVerification, Concept, LearningCourse, Module, ReferenceDocument, ResearchSource
from .pdf_extraction import extract_document


class AcademyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = get_user_model().objects.create_user('researcher', is_staff=True)
        self.staff.user_permissions.set(Permission.objects.filter(content_type__app_label='learning'))
        self.learner = get_user_model().objects.create_user('student')
        self.course = LearningCourse.objects.create(slug='test-course', title='Test course', category='AI', summary='Original roadmap')
        module = Module.objects.create(number=9000, slug='test-module', title='Module', course=self.course)
        chapter = Chapter.objects.create(module=module, position=1, title='Chapter')
        self.concept = Concept.objects.create(chapter=chapter, position=1, slug='test-concept', title='Concept')

    def test_catalog_and_curriculum_are_course_scoped_and_do_not_leak_drafts(self):
        other = LearningCourse.objects.create(slug='hidden', title='Hidden', category='AI', summary='Hidden', is_active=False)
        m = Module.objects.create(course=other, number=9001, slug='hidden-module', title='Hidden module')
        c = Chapter.objects.create(module=m, position=1, title='Hidden chapter')
        Concept.objects.create(chapter=c, position=1, slug='hidden-concept', title='Hidden concept')
        catalog = self.client.get('/api/learning/courses/').json()
        self.assertEqual([r['slug'] for r in catalog], ['test-course'])
        self.assertEqual(catalog[0]['published_count'], 0)
        curriculum = self.client.get('/api/learning/curriculum/?course=test-course').json()
        self.assertEqual(len(curriculum), 1)
        self.assertFalse(curriculum[0]['chapters'][0]['concepts'][0]['available'])
        self.assertEqual(self.client.get('/api/learning/curriculum/?course=hidden').json(), [])
        self.assertEqual(self.client.get('/api/learning/concepts/test-concept/').status_code, 404)
        self.assertEqual(self.client.get('/api/learning/concepts/test-concept/?preview=1').status_code, 401)

    def test_course_seed_is_repeatable_and_preserves_editor_changes(self):
        call_command('seed_academy', stdout=StringIO())
        count = Concept.objects.count()
        python = LearningCourse.objects.get(slug='python')
        python.title = 'Edited Python curriculum'
        python.save()
        call_command('seed_academy', stdout=StringIO())
        self.assertEqual(Concept.objects.count(), count)
        self.assertEqual(LearningCourse.objects.get(slug='python').title, 'Edited Python curriculum')
        self.assertFalse(Concept.objects.filter(version__gt=0).exists())

    def reviewable(self):
        c = self.concept
        c.content = pilot_content()
        c.references = [{'title': 'Source', 'url': 'https://example.org/definition'}]
        c.outcomes, c.seo_description = ['Explain the definition'], 'Original concept description'
        c.status, c.code_verified, c.reviewed_by = 'approved', True, self.staff
        c.save()
        return c

    def test_publication_refuses_missing_stale_unverified_and_unsourced_claims(self):
        c = self.reviewable()
        with self.assertRaisesMessage(ValidationError, 'current verified claims'):
            c.publish(self.staff)
        claim = ClaimVerification.objects.create(concept=c, claim='The mathematical definition', status='VERIFIED', evidence='Independent derivation and edge-case checks', reviewed_by=self.staff, reviewed_at=timezone.now(), edit_version=0)
        with self.assertRaises(ValidationError):
            c.publish(self.staff)
        source = ResearchSource.objects.create(title='Primary source', url='https://example.org/definition', source_type='paper')
        claim.sources.add(source)
        claim.edit_version = 1
        claim.save()
        with self.assertRaises(ValidationError):
            c.publish(self.staff)
        claim.edit_version, claim.status = 0, 'NEEDS_REVIEW'
        claim.save()
        with self.assertRaises(ValidationError):
            c.publish(self.staff)
        claim.status = 'VERIFIED'
        claim.save()
        c.publish(self.staff)
        c.refresh_from_db()
        self.assertEqual(c.version, 1)
        self.assertEqual(c.published['verification'][0]['sources'][0]['title'], 'Primary source')
        # A wrong course URL cannot display the same published lesson.
        self.assertEqual(self.client.get('/api/learning/concepts/test-concept/?course=python').status_code, 404)

    def test_research_permissions_and_review_evidence_are_enforced(self):
        endpoint = '/api/admin/learning/research/claims/'
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.get(endpoint).status_code, 403)
        self.client.force_authenticate(self.staff)
        data = {'concept': self.concept.pk, 'claim': 'A definition', 'status': 'VERIFIED', 'sources': [], 'evidence': '', 'edit_version': 0}
        self.assertEqual(self.client.post(endpoint, data, format='json').status_code, 400)
        source = ResearchSource.objects.create(title='Primary', url='https://example.org', source_type='official_docs')
        data.update(sources=[source.pk], evidence='Checked the definition and its domain.')
        response = self.client.post(endpoint, data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['reviewed_by'], self.staff.pk)
        self.assertIn('no-store', response['Cache-Control'])

    def test_actual_interview_report_requires_source_but_practice_does_not_claim_report(self):
        from apps.adminpanel.views import CourseQuestionSerializer
        question = {'course_slug': 'python', 'course_name': 'Python', 'level': 'basic', 'topic': 'Iteration', 'question': 'When does an iterator stop?', 'answer': 'When iteration is exhausted.', 'explanation': 'A Python iterator signals exhaustion with StopIteration.', 'provenance': 'public_report'}
        serializer = CourseQuestionSerializer(data=question)
        self.assertFalse(serializer.is_valid())
        self.assertIn('source_url', serializer.errors)
        question.update(provenance='company_style', company_tags=['Google'], role='Software engineer', is_published=False)
        serializer = CourseQuestionSerializer(data=question)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        saved = serializer.save()
        self.assertFalse(saved.is_published)
        self.assertEqual(saved.provenance, 'company_style')


class ReferenceWorkflowTests(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.settings_context = override_settings(PRIVATE_MEDIA_ROOT=self.temp.name)
        self.settings_context.enable()
        self.field = ReferenceDocument._meta.get_field('file')
        self.old_storage = self.field.storage
        self.field.storage = ReferenceStorage()
        self.client = APIClient()
        self.staff = get_user_model().objects.create_user('librarian', is_staff=True)
        self.staff.user_permissions.set(Permission.objects.filter(content_type__app_label='learning'))
        self.client.force_authenticate(self.staff)

    def tearDown(self):
        self.field.storage = self.old_storage
        self.settings_context.disable()
        self.temp.cleanup()

    def upload(self, raw=None, rights='true'):
        if raw is None:
            stream = BytesIO()
            writer = PdfWriter()
            writer.add_blank_page(width=100, height=100)
            writer.add_metadata({'/Title': 'Test reference', '/Author': 'Test author'})
            writer.write(stream)
            raw = stream.getvalue()
        return self.client.post('/api/learning/documents/', {'file': SimpleUploadedFile('reference.pdf', raw, content_type='application/pdf'), 'title': 'Private reference', 'rights_confirmed': rights}, format='multipart')

    def test_upload_requires_rights_and_signature_and_deduplicates(self):
        self.assertEqual(self.upload(rights='false').status_code, 400)
        self.assertEqual(self.upload(raw=b'not a PDF').status_code, 400)
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'QUEUED')
        self.assertEqual(self.upload().status_code, 200)
        self.assertEqual(ReferenceDocument.objects.count(), 1)
        self.assertNotIn('file', response.data)

    def test_download_and_extracted_text_require_staff_model_permission(self):
        self.upload()
        doc = ReferenceDocument.objects.get()
        url = doc.file.url
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        user = get_user_model().objects.create_user('other')
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(f'/api/learning/documents/{doc.pk}/').status_code, 403)
        self.client.force_authenticate(self.staff)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('no-store', response['Cache-Control'])
        # Consume the stream so the test client's wrapper closes it safely.
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF-'))
        self.assertTrue(response.closed)
        self.assertEqual(ReferenceDocument.objects.count(), 1)

    def test_low_text_pages_are_not_claimed_complete_and_extraction_is_idempotent(self):
        self.upload()
        doc = ReferenceDocument.objects.get()
        self.assertEqual(extract_document(doc.pk), 'OCR_REQUIRED')
        doc.refresh_from_db()
        self.assertEqual(doc.page_count, 1)
        self.assertEqual(doc.author, 'Test author')
        self.assertEqual(doc.pages.get().status, 'OCR_REQUIRED')
        self.assertFalse(doc.extracted_concepts.exists())
        self.assertEqual(extract_document(doc.pk), 'OCR_REQUIRED')
        self.assertEqual(doc.pages.count(), 1)

    def test_parse_failure_is_visible_and_does_not_publish_anything(self):
        response = self.upload(raw=b'%PDF-invalid-reference')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(extract_document(response.data['id']), 'FAILED')
        self.assertFalse(Concept.objects.filter(version__gt=0).exists())

    def test_worker_timeout_marks_processing_job_failed(self):
        self.upload()
        doc = ReferenceDocument.objects.get()
        def timeout(*args, **kwargs):
            ReferenceDocument.objects.filter(pk=doc.pk).update(status='PROCESSING')
            import subprocess
            raise subprocess.TimeoutExpired('extract', 90)
        with patch('apps.learning.management.commands.process_learning_documents.subprocess.run', side_effect=timeout):
            call_command('process_learning_documents', once=True, stdout=StringIO())
        doc.refresh_from_db()
        self.assertEqual(doc.status, 'FAILED')
        self.assertIn('90-second', doc.error)
