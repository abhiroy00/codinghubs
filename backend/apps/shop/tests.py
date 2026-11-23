import json
import shutil
import tempfile
from io import BytesIO
from zipfile import ZipFile
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.courses.models import Course, CourseCategory
from apps.enrollments.models import Enrollment
from .models import (
    Project, ProjectGuide, ProjectQuestion,
)


User = get_user_model()
NO_THROTTLE = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_THROTTLE_CLASSES': (),
    'DEFAULT_THROTTLE_RATES': {'anon': '1000/min', 'user': '1000/min'},
}
PRIVATE = tempfile.mkdtemp()
MEDIA = tempfile.mkdtemp()


def pdf_bytes():
    return b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


def zip_bytes(names=('readme.txt',)):
    buf = BytesIO()
    with ZipFile(buf, 'w') as archive:
        for name in names:
            archive.writestr(name, 'hello')
    return buf.getvalue()


@override_settings(
    REST_FRAMEWORK=NO_THROTTLE, PRIVATE_MEDIA_ROOT=PRIVATE, MEDIA_ROOT=MEDIA,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', SITE_URL='https://codinghubs.in',
)
class ShopBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(PRIVATE, ignore_errors=True)
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.boss = User.objects.create_user('boss', email='boss@example.com', password='S3cure-pass!', is_staff=True, is_superuser=True)
        self.editor = User.objects.create_user('ed', email='ed@example.com', password='S3cure-pass!', is_staff=True)
        self.alice = User.objects.create_user('alice', email='alice@example.com', password='S3cure-pass!')
        self.bob = User.objects.create_user('bob', email='bob@example.com', password='S3cure-pass!')
        self.api = APIClient()
        self.api.force_authenticate(self.boss)
        self.anon = APIClient()

    def as_user(self, user):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c



# ====================== auth & permissions ======================


# ====================== products ======================


# ====================== pricing, cart, coupons ======================


# ====================== checkout, stock ======================


# ====================== payments ======================


# ====================== refunds, fulfilment ======================


# ====================== downloads & ownership ======================


def asset_events():
    from .models import DownloadEvent

    return DownloadEvent.objects.count()


# ====================== uploads ======================


# ====================== projects & guides ======================
class ProjectGuideTests(ShopBase):
    def new_project(self, **kw):
        body = {'title': 'Library App', 'summary': 'A small app.', 'difficulty': 'beginner', 'technologies': ['Django', 'django', 'React'],
                'features': [{'title': f'F{i}', 'description': 'd'} for i in range(14)], **kw}
        r = self.api.post('/api/admin/projects/', body, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_project_lifecycle_and_dynamic_features(self):
        p = self.new_project()
        self.assertEqual(p['technologies'], ['Django', 'React'])
        self.assertEqual(len(p['features']), 14)  # not limited to a fixed number
        self.assertEqual(self.anon.get(f'/api/projects/{p["slug"]}/').status_code, 404)
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        d = self.anon.get(f'/api/projects/{p["slug"]}/').json()
        self.assertEqual(len(d['features']), 14)
        self.api.post(f'/api/admin/projects/{p["id"]}/unpublish/')
        self.assertEqual(self.anon.get('/api/projects/').json()['count'], 0)

    def test_create_published_project_appears_in_public_cards(self):
        response = self.api.post(
            '/api/admin/projects/',
            {'title': 'Published on submit', 'summary': 'A project card.', 'status': 'published'},
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        cards = self.anon.get('/api/projects/').json()
        self.assertEqual(cards['count'], 1)
        self.assertEqual(cards['results'][0]['title'], 'Published on submit')

    def test_project_cards_carry_their_published_guide(self):
        proj = self.api.post('/api/admin/projects/', {'title': 'With guide', 'summary': 'A project.', 'status': 'published'}, format='json').json()
        draft = self.api.post('/api/admin/project-guides/', {'title': 'Draft guide', 'summary': 'x', 'project': proj['id']}, format='json')
        live = self.api.post('/api/admin/project-guides/', {'title': 'Live guide', 'summary': 'y', 'project': proj['id'], 'status': 'published'}, format='json')
        self.assertEqual((draft.status_code, live.status_code), (201, 201), (draft.content, live.content))
        card = self.anon.get('/api/projects/').json()['results'][0]
        self.assertEqual(card['guide']['title'], 'Live guide')
        self.assertEqual(card['guide']['slug'], 'live-guide')

    def test_project_questions_are_private_until_answered_and_never_expose_email(self):
        project = self.new_project()
        self.api.post(f'/api/admin/projects/{project["id"]}/publish/')
        submission = self.anon.post(
            f'/api/projects/{project["slug"]}/questions/',
            {'name': 'Learner', 'email': 'learner@example.com', 'question': 'How should I start?'},
            format='json',
        )
        self.assertEqual(submission.status_code, 201, submission.content)
        question = ProjectQuestion.objects.get(pk=submission.json()['id'])
        self.assertEqual(question.project_id, project['id'])
        self.assertEqual(self.anon.get(f'/api/projects/{project["slug"]}/').json()['questions'], [])
        self.assertEqual(self.anon.get('/api/admin/project-questions/').status_code, 404)
        self.assertEqual(self.api.patch(f'/api/admin/project-questions/{question.id}/', {'answer': 'Removed'}, format='json').status_code, 404)
        question.answer = 'Start by defining the project requirements.'
        question.save(update_fields=['answer'])

        public = self.anon.get(f'/api/projects/{project["slug"]}/')
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()['questions'][0]['question'], 'How should I start?')
        self.assertEqual(public.json()['questions'][0]['answer'], 'Start by defining the project requirements.')
        self.assertNotIn('email', public.content.decode().lower())

    def test_project_question_admin_routes_are_removed(self):
        self.assertEqual(self.api.get('/api/admin/project-questions/').status_code, 404)
        self.assertEqual(self.api.patch('/api/admin/project-questions/1/', {'answer': 'Removed'}, format='json').status_code, 404)

    def test_questions_cannot_be_submitted_for_unpublished_projects(self):
        project = self.new_project()
        response = self.anon.post(
            f'/api/projects/{project["slug"]}/questions/',
            {'name': 'Learner', 'email': 'learner@example.com', 'question': 'Question'},
            format='json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(ProjectQuestion.objects.count(), 0)

    def test_filters(self):
        for t, diff, tech, cat in (('A', 'beginner', ['Python'], 'Web'), ('B', 'advanced', ['Go'], 'Data'), ('C', 'beginner', ['Python', 'Go'], 'Web')):
            p = self.new_project(title=t, difficulty=diff, technologies=tech, category=cat)
            self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        g = self.anon.get
        self.assertEqual(g('/api/projects/?difficulty=beginner').json()['count'], 2)
        self.assertEqual(g('/api/projects/?technology=go').json()['count'], 2)
        self.assertEqual(g('/api/projects/?category=data').json()['count'], 1)
        self.assertEqual(g('/api/projects/?q=C').json()['count'], 1)
        self.assertEqual(sorted(g('/api/projects/').json()['categories']), ['Data', 'Web'])

    def test_validation(self):
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'difficulty': 'godlike'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'repo_url': 'http://insecure.example.com'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'screenshots': [{'src': 'javascript:1', 'alt': ''}]}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'overview': '<p>a</p><script>alert(1)</script>'}, format='json')
        self.assertNotIn('<script', r.json()['overview'])

    def test_project_and_guide_accept_empty_category_as_null(self):
        project = self.api.post('/api/admin/projects/', {'title': 'Uncategorised project', 'category': None}, format='json')
        self.assertEqual(project.status_code, 201, project.content)
        self.assertEqual(project.json()['category'], '')

        guide = self.api.post('/api/admin/project-guides/', {'title': 'Uncategorised guide', 'category': None}, format='json')
        self.assertEqual(guide.status_code, 201, guide.content)
        self.assertEqual(guide.json()['category'], '')

    def test_private_repo_is_never_exposed(self):
        p = self.new_project(repo_url='https://github.com/acme/private', demo_url='https://demo.example.com')
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        body = self.anon.get(f'/api/projects/{p["slug"]}/').content.decode()
        self.assertNotIn('github.com/acme/private', body)
        self.assertIn('demo.example.com', body)
        self.api.patch(f'/api/admin/projects/{p["id"]}/', {'repo_public': True}, format='json')
        self.assertIn('github.com/acme/private', self.anon.get(f'/api/projects/{p["slug"]}/').content.decode())


    def test_free_project_files_are_open(self):
        p = self.new_project()
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        aid = self.api.post(f'/api/admin/projects/{p["id"]}/assets/', {'file': SimpleUploadedFile('s.zip', zip_bytes())}, format='multipart').json()['id']
        r = self.anon.post(f'/api/projects/{p["slug"]}/files/{aid}/link/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.anon.get(r.json()['url']).status_code, 200)

    # ---- guides ----
    def new_guide(self, **kw):
        sections = [{'key': 'introduction', 'title': 'Introduction', 'html': '<p>Free intro.</p>', 'enabled': True, 'preview': True},
                    {'key': 'implementation', 'title': 'Step-by-step implementation', 'html': '<p>SECRET STEPS</p><pre><code>print(1)</code></pre>', 'enabled': True},
                    {'key': 'testing', 'title': 'Testing', 'html': '<p>Hidden</p>', 'enabled': False}]
        body = {'title': 'Build a library app', 'summary': 'Step by step.', 'sections': sections, **kw}
        r = self.api.post('/api/admin/project-guides/', body, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_guide_sections_are_configurable_and_sanitised(self):
        g = self.new_guide(sections=[{'key': 'x', 'title': 'Only one', 'html': '<p>ok</p><script>alert(1)</script>', 'enabled': True}])
        self.assertEqual(len(g['sections']), 1)
        self.assertNotIn('<script', g['sections'][0]['html'])
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        d = self.anon.get(f'/api/project-guides/{g["slug"]}/').json()
        self.assertEqual([s['key'] for s in d['sections']], ['x'])

    def test_submit_simple_project_guidance_publishes_it(self):
        project = self.new_project()
        response = self.api.post(
            '/api/admin/project-guides/',
            {
                'title': 'Help with the library app',
                'summary': 'How should I set up the database?',
                'project': project['id'],
                'sections': [{'key': 'guidance', 'title': 'Guidance', 'html': '<p>Start with the book model.</p>', 'enabled': True}],
                'status': 'published',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        public = self.anon.get(f'/api/project-guides/{response.json()["slug"]}/').json()
        self.assertEqual(public['project']['title'], project['title'])
        self.assertEqual(public['sections'][0]['title'], 'Guidance')
        self.assertIn('Start with the book model.', public['sections'][0]['html'])

    def test_free_guide_is_open_and_disabled_sections_hidden(self):
        g = self.new_guide()
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        d = self.anon.get(f'/api/project-guides/{g["slug"]}/').json()
        self.assertTrue(d['unlocked'])
        self.assertEqual([s['key'] for s in d['sections']], ['introduction', 'implementation'])  # 'testing' is disabled
        self.assertIn('SECRET STEPS', json.dumps(d))

    def test_account_only_guide(self):
        g = self.new_guide(access_type='account')
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        self.assertNotIn('SECRET STEPS', self.anon.get(f'/api/project-guides/{g["slug"]}/').content.decode())
        self.assertIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())


    def test_retired_paid_mode_cannot_be_created(self):
        r = self.api.post('/api/admin/project-guides/', {'title': 'x', 'access_type': 'paid'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('access_type', r.json())

    def test_guide_included_with_a_course(self):
        cat = CourseCategory.objects.create(name='AI', slug='ai')
        course = Course.objects.create(category=cat, name='Gen AI', slug='gen-ai')
        g = self.new_guide(access_type='included', included_course_ids=[course.id])
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        self.assertNotIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())
        Enrollment.objects.create(user=self.alice, course=course)
        self.assertIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())

    def test_guide_files_follow_the_guide_access_rules(self):
        g = self.new_guide(access_type='account')
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        aid = self.api.post(f'/api/admin/project-guides/{g["id"]}/assets/', {'file': SimpleUploadedFile('r.pdf', pdf_bytes()), 'label': 'Report'}, format='multipart').json()['id']
        link = f'/api/project-guides/{g["slug"]}/files/{aid}/link/'
        self.assertEqual(self.anon.post(link, {}, format='json').status_code, 403)
        r = self.as_user(self.alice).post(link, {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['url'].startswith('/api/resources/download/'))
        self.assertEqual(b''.join(self.as_user(self.alice).get(r.json()['url']).streaming_content), pdf_bytes())
        ProjectGuide.objects.filter(pk=g['id']).update(access_type='restricted')
        self.assertEqual(self.anon.get(r.json()['url']).status_code, 404)
        self.assertEqual(self.as_user(self.alice).post(link, {}, format='json').status_code, 403)

    def test_guide_preview_needs_a_signed_token_and_is_noindex(self):
        g = self.new_guide()
        self.assertEqual(self.anon.get(f'/api/project-guides/{g["slug"]}/?preview=bad').status_code, 404)
        url = self.api.post(f'/api/admin/project-guides/{g["id"]}/preview/').json()['url']
        r = self.anon.get(f'/project-guides/{g["slug"]}?preview={url.split("preview=")[1]}')
        self.assertEqual(r.status_code, 200)
        self.assertIn('noindex', r['X-Robots-Tag'])

    def test_live_guide_preview_is_its_public_url(self):
        g = self.new_guide()
        draft_url = self.api.post(f'/api/admin/project-guides/{g["id"]}/preview/').json()['url']
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        live = self.api.post(f'/api/admin/project-guides/{g["id"]}/preview/').json()
        self.assertEqual(live['url'], f'https://codinghubs.in/project-guides/{g["slug"]}')
        old = self.anon.get(draft_url)
        self.assertEqual(old.status_code, 301)
        self.assertEqual(old['Location'], f'/project-guides/{g["slug"]}')


# ====================== inventory / coupons / settings / stats ======================


# ====================== SEO ======================
class SeoTests(ShopBase):
    def ld(self, html):
        return json.loads(html.split('<script type="application/ld+json">')[1].split('</script>')[0])


    def test_unknown_and_draft_pages_are_real_404s(self):
        for u in ('/store/nope', '/projects/nope', '/project-guides/nope'):
            r = self.anon.get(u)
            self.assertEqual(r.status_code, 404, u)
            self.assertIn('noindex', r['X-Robots-Tag'])


    def test_sitemap_excludes_retired_store_and_noncanonical_resources(self):
        own_url = 'https://codinghubs.in/store/retired-notes'
        self.assertNotIn(own_url, self.anon.get('/sitemap-shop.xml').content.decode())
        project = Project.objects.create(title='Syndicated project', slug='syndicated-project', status='published', published_at=timezone.now(), canonical_url='https://codinghubs.in/projects/primary-project')
        guide = ProjectGuide.objects.create(title='Syndicated guide', slug='syndicated-guide', status='published', published_at=timezone.now(), canonical_url='https://example.org/original-guide')
        xml = self.anon.get('/sitemap-shop.xml').content.decode()
        for url in (own_url, '/projects/' + project.slug, '/project-guides/' + guide.slug):
            self.assertNotIn(url, xml)

    def test_project_pages_have_article_data_and_no_hidden_breadcrumb_markup(self):
        pr = self.api.post('/api/admin/projects/', {'title': 'Chat app', 'summary': 'Realtime chat.'}, format='json').json()
        self.api.post(f'/api/admin/projects/{pr["id"]}/publish/')
        html = self.anon.get(f'/projects/{pr["slug"]}').content.decode()
        types = [n['@type'] for n in self.ld(html)['@graph']]
        self.assertEqual(types, ['Article'])  # no breadcrumb is shown on the page, so no BreadcrumbList markup either
        self.assertEqual(html.count('<h1'), 1)
        self.assertIn(f'href="https://codinghubs.in/projects/{pr["slug"]}"', html)

    def test_restricted_guide_structured_data_says_not_free(self):
        g = self.api.post('/api/admin/project-guides/', {'title': 'Restricted guide', 'access_type': 'restricted'}, format='json').json()
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        node = self.ld(self.anon.get(f'/project-guides/{g["slug"]}').content.decode())['@graph'][0]
        self.assertFalse(node['isAccessibleForFree'])
