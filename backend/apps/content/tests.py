import json
import shutil
import tempfile
from datetime import timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from . import ssr
from .models import Blog, BlogCategory, CaseStudy, SlugRedirect, Testimonial
from .sanitize import add_heading_ids, sanitize_html, word_count

User = get_user_model()
NO_THROTTLE = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_THROTTLE_CLASSES': (),
    'DEFAULT_THROTTLE_RATES': {'anon': '1000/min', 'user': '1000/min'},
}
MEDIA = tempfile.mkdtemp()


def png_bytes(size=(20, 20), fmt='PNG'):
    buf = BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(buf, fmt)
    return buf.getvalue()


@override_settings(REST_FRAMEWORK=NO_THROTTLE, MEDIA_ROOT=MEDIA, STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class ContentBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        ssr._shell.update(html=None, at=0.0)
        self.boss = User.objects.create_user('boss', email='boss@example.com', password='S3cure-pass!', is_staff=True, is_superuser=True)
        self.editor = User.objects.create_user('ed', email='ed@example.com', password='S3cure-pass!', is_staff=True)  # staff, no model perms
        self.student = User.objects.create_user('stu', email='stu@example.com', password='S3cure-pass!')
        self.api = APIClient()
        self.api.force_authenticate(self.boss)

    def as_user(self, user):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def make_blog(self, title='Hello AI', **kw):
        r = self.api.post('/api/admin/blogs/', {'title': title, 'content': '<p>Body text here.</p>', **kw}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()


class AuthTests(ContentBase):
    def test_admin_api_requires_login(self):
        for url in ('/api/admin/blogs/', '/api/admin/case-studies/', '/api/admin/content/stats/', '/api/admin/blog-categories/'):
            self.assertEqual(self.as_user(None).get(url).status_code, 401, url)

    def test_blog_taxonomy_is_read_only_and_tag_management_route_is_removed(self):
        category = BlogCategory.objects.create(name='AI')
        response = self.api.get('/api/admin/blog-categories/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]['name'], 'AI')
        self.assertEqual(self.api.post('/api/admin/blog-categories/', {'name': 'New'}, format='json').status_code, 405)
        self.assertEqual(self.api.get(f'/api/admin/blog-categories/{category.id}/').status_code, 404)
        self.assertEqual(self.api.get('/api/admin/blog-tags/').status_code, 404)

    def test_non_staff_cannot_use_admin_api(self):
        self.assertEqual(self.as_user(self.student).get('/api/admin/blogs/').status_code, 403)
        self.assertEqual(self.as_user(self.student).post('/api/admin/blogs/', {'title': 'x'}, format='json').status_code, 403)

    def test_staff_without_permissions_cannot_write_publish_or_delete(self):
        b = self.make_blog()
        ed = self.as_user(self.editor)
        self.assertEqual(ed.get('/api/admin/blogs/').status_code, 200)  # read-only view
        self.assertEqual(ed.post('/api/admin/blogs/', {'title': 'x'}, format='json').status_code, 403)
        self.assertEqual(ed.patch(f'/api/admin/blogs/{b["id"]}/', {'title': 'y'}, format='json').status_code, 403)
        self.assertEqual(ed.post(f'/api/admin/blogs/{b["id"]}/publish/').status_code, 403)
        self.assertEqual(ed.delete(f'/api/admin/blogs/{b["id"]}/').status_code, 403)
        self.assertEqual(ed.post('/api/admin/media/', {'file': SimpleUploadedFile('a.png', png_bytes())}, format='multipart').status_code, 403)

    def test_existing_admin_login_still_works(self):
        c = APIClient()
        r = c.post('/api/admin/login/', {'email': 'boss@example.com', 'password': 'S3cure-pass!'}, format='json')
        self.assertEqual(r.status_code, 200)
        bad = c.post('/api/admin/login/', {'email': 'boss@example.com', 'password': 'nope'}, format='json')
        self.assertEqual(bad.status_code, 401)


class BlogWorkflowTests(ContentBase):
    def test_create_draft_edit_and_slug(self):
        b = self.make_blog('My First  Post!')
        self.assertEqual(b['slug'], 'my-first-post')
        self.assertEqual(b['status'], 'draft')
        r = self.api.patch(f'/api/admin/blogs/{b["id"]}/', {'excerpt': 'Short.', 'tag_names': ['AI', 'ai', 'Python']}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(sorted(r.json()['tags']), ['AI', 'Python'])  # duplicate tag collapsed, case-insensitively
        self.assertEqual(Blog.objects.get(pk=b['id']).reading_time, 1)

    def test_duplicate_slug_gets_safe_alternative(self):
        a = self.make_blog('Same title')
        b = self.make_blog('Same title')
        c = self.make_blog('Other', slug='same-title')
        self.assertEqual((a['slug'], b['slug'], c['slug']), ('same-title', 'same-title-2', 'same-title-3'))

    def test_validation_errors(self):
        r = self.api.post('/api/admin/blogs/', {'title': '   '}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/blogs/', {'title': 'x', 'featured_image': 'javascript:alert(1)'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('featured_image', r.json())
        r = self.api.post('/api/admin/blogs/', {'title': 'x', 'og_image': 'data:image/png;base64,AAAA'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/blogs/', {'title': 'x', 'status': 'scheduled'}, format='json')
        self.assertEqual(r.status_code, 400)  # scheduling needs a future date

    def test_publish_unpublish_visibility(self):
        b = self.make_blog('Visible post')
        pub = self.as_user(None)
        self.assertEqual(pub.get('/api/blogs/').json()['count'], 0)
        self.assertEqual(pub.get(f'/api/blogs/{b["slug"]}/').status_code, 404)  # draft stays private
        r = self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'published')
        listing = pub.get('/api/blogs/').json()
        self.assertEqual([x['slug'] for x in listing['results']], [b['slug']])
        self.assertNotIn('content', listing['results'][0])
        detail = pub.get(f'/api/blogs/{b["slug"]}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIn('Body text here.', detail.json()['content_html'])
        self.api.post(f'/api/admin/blogs/{b["id"]}/unpublish/')
        self.assertEqual(pub.get(f'/api/blogs/{b["slug"]}/').status_code, 404)
        self.assertEqual(pub.get('/api/blogs/').json()['count'], 0)

    def test_scheduled_goes_live_only_when_time_arrives(self):
        b = self.make_blog('Later')
        future = (timezone.now() + timedelta(days=2)).isoformat()
        r = self.api.post(f'/api/admin/blogs/{b["id"]}/publish/', {'published_at': future}, format='json')
        self.assertEqual(r.json()['status'], 'scheduled')
        pub = self.as_user(None)
        self.assertEqual(pub.get(f'/api/blogs/{b["slug"]}/').status_code, 404)
        Blog.objects.filter(pk=b['id']).update(published_at=timezone.now() - timedelta(minutes=1))  # time passes
        self.assertEqual(pub.get(f'/api/blogs/{b["slug"]}/').status_code, 200)

    def test_archived_is_not_public(self):
        b = self.make_blog('Old')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        self.api.post(f'/api/admin/blogs/{b["id"]}/archive/')
        self.assertEqual(self.as_user(None).get(f'/api/blogs/{b["slug"]}/').status_code, 404)

    def test_delete(self):
        b = self.make_blog('Gone')
        self.assertEqual(self.api.delete(f'/api/admin/blogs/{b["id"]}/').status_code, 204)
        self.assertFalse(Blog.objects.filter(pk=b['id']).exists())

    def test_search_category_filter_and_pagination(self):
        cat = BlogCategory.objects.create(name='AI')
        for i in range(11):
            b = self.make_blog(f'Post number {i}', category=cat.id)
            self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        pub = self.as_user(None)
        r = pub.get('/api/blogs/').json()
        self.assertEqual((r['count'], len(r['results'])), (11, 9))
        self.assertEqual(len(pub.get('/api/blogs/?page=2').json()['results']), 2)
        self.assertEqual(pub.get('/api/blogs/?q=number 3').json()['count'], 1)
        self.assertEqual(pub.get('/api/blogs/?category=ai').json()['count'], 11)
        self.assertEqual(pub.get('/api/blogs/?category=nope').json()['count'], 0)
        self.assertEqual(pub.get('/api/blog-categories/').json()[0]['blog_count'], 11)

    def test_search_matches_category_names(self):
        cat = BlogCategory.objects.create(name='Python')
        b = self.make_blog('Category search', category=cat.id, excerpt='A short tutorial.')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        data = self.as_user(None).get('/api/blogs/?q=python').json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['slug'], b['slug'])

    def test_blog_detail_includes_word_count(self):
        b = self.make_blog('Roadmap', content='<h2>Overview</h2><p>Learn Python and build full stack apps.</p>')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        data = self.as_user(None).get(f'/api/blogs/{b["slug"]}/').json()
        self.assertEqual(data['word_count'], word_count(Blog.objects.get(pk=b['id']).content))

    def test_blog_gallery_is_saved_and_public(self):
        gallery = [
            {'src': '/media/uploads/one.png', 'alt': 'Python roadmap'},
            {'src': 'https://example.com/two.png', 'alt': 'Workflow'},
            {'src': 'https://example.com/three.png', 'alt': 'AI system architecture'},
            {'src': 'https://example.com/four.png', 'alt': 'Model evaluation'},
            {'src': 'https://example.com/five.png', 'alt': 'Production monitoring'},
        ]
        b = self.make_blog('Gallery post', gallery=gallery)
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        data = self.as_user(None).get(f'/api/blogs/{b["slug"]}/').json()
        self.assertEqual(len(data['gallery']), 5)
        self.assertEqual([item['alt'] for item in data['gallery']], [
            'Python roadmap', 'Workflow', 'AI system architecture', 'Model evaluation', 'Production monitoring'
        ])

    def test_blog_gallery_rejects_more_than_five_images(self):
        gallery = [{'src': f'https://example.com/{i}.png', 'alt': f'Image {i}'} for i in range(6)]
        response = self.api.post('/api/admin/blogs/', {'title': 'Too many images', 'gallery': gallery}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('up to 5 images', response.json()['gallery'][0])

    def test_blog_content_accepts_10000_words_and_rejects_more(self):
        at_limit = self.make_blog('Maximum length', content=f'<p>{"word " * 10_000}</p>')
        self.assertEqual(word_count(at_limit['content']), 10_000)

        response = self.api.post(
            '/api/admin/blogs/',
            {'title': 'Over maximum', 'content': f'<p>{"word " * 10_001}</p>'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('10,000 words or fewer', response.json()['content'][0])

    def test_admin_list_filters_and_stats(self):
        a = self.make_blog('A')
        self.make_blog('B')
        self.api.post(f'/api/admin/blogs/{a["id"]}/publish/')
        self.assertEqual(self.api.get('/api/admin/blogs/?status=draft').json()['count'], 1)
        self.assertEqual(self.api.get('/api/admin/blogs/?q=A&ordering=title').json()['results'][0]['title'], 'A')
        s = self.api.get('/api/admin/content/stats/').json()
        self.assertEqual((s['blogs']['total'], s['blogs']['published'], s['blogs']['draft']), (2, 1, 1))
        self.assertEqual(len(s['recent']), 2)

    def test_slug_change_keeps_old_url_working(self):
        b = self.make_blog('Original')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        r = self.api.patch(f'/api/admin/blogs/{b["id"]}/', {'slug': 'renamed'}, format='json')
        self.assertEqual(r.json()['slug'], 'renamed')
        self.assertTrue(SlugRedirect.objects.filter(old_slug='original', new_slug='renamed').exists())
        old = self.as_user(None).get('/blog/original')
        self.assertEqual(old.status_code, 301)
        self.assertEqual(old['Location'], '/blog/renamed')

    def test_revisions_and_restore(self):
        b = self.make_blog('Rev')
        self.api.patch(f'/api/admin/blogs/{b["id"]}/', {'content': '<p>Second version.</p>'}, format='json')
        revs = self.api.get(f'/api/admin/blogs/{b["id"]}/revisions/').json()
        self.assertEqual(len(revs), 1)
        self.api.post(f'/api/admin/blogs/{b["id"]}/revisions/{revs[0]["id"]}/restore/')
        self.assertIn('Body text here.', Blog.objects.get(pk=b['id']).content)


class SecurityTests(ContentBase):
    def test_sanitizer_strips_scripts_handlers_and_unsafe_urls(self):
        dirty = (
            '<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a>'
            '<img src="x" onerror="alert(1)"><iframe src="https://evil.test"></iframe><a href="https://ok.test" target="_blank">ok</a>'
            '<img src="data:image/svg+xml;base64,AAAA"><style>*{}</style><h2 style="color:red">H</h2>'
        )
        clean = sanitize_html(dirty)
        for bad in ('<script', 'onclick', 'onerror', 'javascript:', '<iframe', '<style', 'data:', 'style='):
            self.assertNotIn(bad, clean)
        self.assertIn('href="https://ok.test"', clean)
        self.assertIn('rel="noopener noreferrer"', clean)

    def test_stored_content_is_sanitised_on_save_and_render(self):
        b = self.make_blog('Xss', content='<p>safe</p><script>alert(1)</script><img src=x onerror=alert(1)>')
        self.assertNotIn('<script', b['content'])
        self.assertNotIn('onerror', b['content'])
        Blog.objects.filter(pk=b['id']).update(content='<p>raw</p><script>alert(2)</script>', status='published', published_at=timezone.now())
        r = self.as_user(None).get(f'/api/blogs/{b["slug"]}/').json()
        self.assertNotIn('<script', r['content_html'])  # cleaned again at render time

    def test_dangerous_urls_rejected_in_case_study_links(self):
        r = self.api.post('/api/admin/case-studies/', {'title': 'C', 'related_services': [{'label': 'x', 'url': 'javascript:alert(1)'}]}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/case-studies/', {'title': 'C', 'gallery': [{'src': 'data:text/html,hi', 'alt': ''}]}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_upload_validation(self):
        up = lambda name, data, ct='image/png': self.api.post('/api/admin/media/', {'file': SimpleUploadedFile(name, data, content_type=ct)}, format='multipart')
        ok = up('../../evil name.png', png_bytes())
        self.assertEqual(ok.status_code, 201, ok.content)
        url = ok.json()['url']
        self.assertTrue(url.startswith('/media/uploads/'))
        self.assertNotIn('evil', url)  # random name, never the uploaded one
        self.assertEqual(up('a.png', b'<?php echo 1; ?>').status_code, 400)  # not an image, whatever the extension
        self.assertEqual(up('a.svg', b'<svg onload="alert(1)"/>', 'image/svg+xml').status_code, 400)
        self.assertEqual(up('a.png', png_bytes() + b'\x00' * (5 * 1024 * 1024)).status_code, 413)
        self.assertEqual(self.as_user(None).post('/api/admin/media/', {'file': SimpleUploadedFile('a.png', png_bytes())}, format='multipart').status_code, 401)

    def test_public_api_never_exposes_drafts_or_admin_fields(self):
        b = self.make_blog('Secret', search_intent='internal note')
        pub = self.as_user(None)
        self.assertEqual(pub.get('/api/blogs/?q=Secret').json()['count'], 0)
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        body = pub.get(f'/api/blogs/{b["slug"]}/').content.decode()
        for leak in ('search_intent', 'internal note', 'created_by', 'secondary_keywords'):
            self.assertNotIn(leak, body)

    def test_preview_requires_valid_token(self):
        b = self.make_blog('Draft preview')
        pub = self.as_user(None)
        self.assertEqual(pub.get(f'/api/blogs/{b["slug"]}/?preview=bad').status_code, 404)
        url = self.api.post(f'/api/admin/blogs/{b["id"]}/preview/').json()['url']
        token = url.split('preview=')[1]
        r = pub.get(f'/api/blogs/{b["slug"]}/?preview={token}')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['preview'])
        self.assertIn('noindex', r.json()['seo']['robots'])
        other = self.make_blog('Another draft')
        self.assertEqual(pub.get(f'/api/blogs/{other["slug"]}/?preview={token}').status_code, 404)  # token is per post
        html = pub.get(f'/blog/{b["slug"]}?preview={token}')
        self.assertEqual(html.status_code, 200)
        self.assertIn('noindex', html['X-Robots-Tag'])

    def test_preview_of_a_live_post_is_the_public_url(self):
        b = self.make_blog('Live preview')
        draft_url = self.api.post(f'/api/admin/blogs/{b["id"]}/preview/').json()['url']
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        r = self.api.post(f'/api/admin/blogs/{b["id"]}/preview/').json()
        self.assertEqual(r['url'], f'https://codinghubs.in/blog/{b["slug"]}')  # no noindex preview link for a published post
        self.assertTrue(r['live'])
        pub = self.as_user(None)
        old = pub.get(draft_url)  # a preview link copied before publishing now leads to the indexable page
        self.assertEqual(old.status_code, 301)
        self.assertEqual(old['Location'], f'/blog/{b["slug"]}')
        self.assertEqual(pub.get(f'/blog/{b["slug"]}?preview=anything').status_code, 301)
        api = pub.get(f'/api/blogs/{b["slug"]}/?preview=anything')
        self.assertEqual(api.status_code, 200)
        self.assertFalse(api.json()['preview'])


class CaseStudyTests(ContentBase):
    def make_case(self, title='Logistics rollout', **kw):
        r = self.api.post('/api/admin/case-studies/', {'title': title, 'overview': '<p>Overview.</p>', **kw}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_create_edit_publish_unpublish(self):
        c = self.make_case(industry='Logistics', technologies=['Python', 'python', 'Django'])
        self.assertEqual(c['technologies'], ['Python', 'Django'])
        pub = self.as_user(None)
        self.assertEqual(pub.get(f'/api/case-studies/{c["slug"]}/').status_code, 404)
        self.api.patch(f'/api/admin/case-studies/{c["id"]}/', {'challenge': '<p>Hard.</p>'}, format='json')
        self.api.post(f'/api/admin/case-studies/{c["id"]}/publish/')
        d = pub.get(f'/api/case-studies/{c["slug"]}/').json()
        self.assertEqual([s['key'] for s in d['sections']], ['overview', 'challenge'])
        self.assertEqual(pub.get('/api/case-studies/').json()['industries'], ['Logistics'])
        self.api.post(f'/api/admin/case-studies/{c["id"]}/unpublish/')
        self.assertEqual(pub.get(f'/api/case-studies/{c["slug"]}/').status_code, 404)
        self.assertEqual(pub.get('/api/case-studies/').json()['count'], 0)

    def test_hidden_sections_and_client_permission(self):
        c = self.make_case(client_name='Acme Ltd', client_descriptor='A logistics company in NCR', background='<p>Bg</p>', hidden_sections=['background', 'bogus'])
        self.api.post(f'/api/admin/case-studies/{c["id"]}/publish/')
        d = self.as_user(None).get(f'/api/case-studies/{c["slug"]}/').json()
        self.assertNotIn('background', [s['key'] for s in d['sections']])
        self.assertEqual(d['client'], 'A logistics company in NCR')  # no permission: never name the client
        self.assertNotIn('Acme', json.dumps(d))
        self.api.patch(f'/api/admin/case-studies/{c["id"]}/', {'client_permission': True}, format='json')
        self.assertEqual(self.as_user(None).get(f'/api/case-studies/{c["slug"]}/').json()['client'], 'Acme Ltd')

    def test_only_admin_supplied_metrics_are_shown(self):
        c = self.make_case()
        self.api.post(f'/api/admin/case-studies/{c["id"]}/publish/')
        d = self.as_user(None).get(f'/api/case-studies/{c["slug"]}/').json()
        self.assertEqual(d['metrics'], [])
        self.api.patch(f'/api/admin/case-studies/{c["id"]}/', {'metrics': [{'label': 'Reports automated', 'value': '12', 'note': ''}, {'label': '', 'value': ''}]}, format='json')
        d = self.as_user(None).get(f'/api/case-studies/{c["slug"]}/').json()
        self.assertEqual(d['metrics'], [{'label': 'Reports automated', 'value': '12', 'note': ''}])


class SeoTests(ContentBase):
    def published_blog(self, **kw):
        b = self.make_blog('Learn Python for AI', excerpt='A short intro to Python for AI work.', author_name='Asha Rao', **kw)
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        return b

    def test_blog_page_html_metadata_canonical_and_json_ld(self):
        b = self.published_blog(content='<h2>One</h2><p>a</p><h2>Two</h2><p>b</p><h3>Three</h3><p>c</p>', faq=[{'q': 'Why?', 'a': 'Because.'}])
        r = self.as_user(None).get(f'/blog/{b["slug"]}')
        html = r.content.decode()
        self.assertEqual(r.status_code, 200)
        self.assertIn('<title>Learn Python for AI | Coding Hubs School of AI</title>', html)
        self.assertIn(f'<link rel="canonical" href="https://codinghubs.in/blog/{b["slug"]}">', html)
        self.assertIn('name="description" content="A short intro to Python for AI work."', html)
        self.assertIn('property="og:title"', html)
        self.assertEqual(html.count('<h1'), 1)
        self.assertIn('id="one"', html)  # heading anchors for the table of contents
        ld = json.loads(html.split('<script type="application/ld+json">')[1].split('</script>')[0])
        types = [n['@type'] for n in ld['@graph']]
        self.assertEqual(types, ['BlogPosting', 'FAQPage'])
        self.assertEqual(ld['@graph'][0]['author']['name'], 'Asha Rao')
        self.assertNotIn('aggregateRating', html)
        self.assertNotIn('review', json.dumps(ld).lower())

    def test_blog_reader_has_summary_and_linked_contents_before_javascript(self):
        b = self.published_blog(content='<p>Start reading here.</p><h2>Build a model</h2><p>Check its results.</p><h2>Evaluate</h2><p>Measure quality.</p><h2>Deploy</h2><p>Monitor results.</p>')
        html = self.as_user(None).get(f'/blog/{b["slug"]}').content.decode()
        self.assertIn('class="bl-deck"', html)
        self.assertIn('A short intro to Python for AI work.', html)
        self.assertIn('On this page', html)
        self.assertIn('href="#build-a-model"', html)
        self.assertIn('id="build-a-model"', html)
        self.assertIn('words</span>', html)

    def test_view_counter_counts_live_posts_only_and_keeps_updated_at(self):
        b = self.make_blog('Counted post')
        draft = self.make_blog('Uncounted draft')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        before = Blog.objects.get(pk=b['id']).updated_at
        anon = self.as_user(None)
        browser = {'HTTP_USER_AGENT': 'Mozilla/5.0 (iPhone) Safari/604.1'}
        self.assertEqual(anon.post(f'/api/blogs/{b["slug"]}/view/', **browser).status_code, 204)
        anon.post(f'/api/blogs/{b["slug"]}/view/', **browser)
        anon.post(f'/api/blogs/{b["slug"]}/view/', HTTP_USER_AGENT='Mozilla/5.0 (compatible; Googlebot/2.1)')
        anon.post(f'/api/blogs/{draft["slug"]}/view/', **browser)
        anon.post('/api/blogs/missing-post/view/', **browser)
        live = Blog.objects.get(pk=b['id'])
        self.assertEqual(live.view_count, 2)
        self.assertEqual(live.updated_at, before)
        self.assertEqual(Blog.objects.get(pk=draft['id']).view_count, 0)
        rows = self.api.get('/api/admin/blogs/?ordering=-views').json()['results']
        self.assertEqual((rows[0]['slug'], rows[0]['view_count']), (b['slug'], 2))

    def test_empty_listing_is_noindex_and_left_out_of_the_sitemap(self):
        anon = self.as_user(None)
        self.assertIn('noindex', anon.get('/case-studies').content.decode())
        self.assertNotIn('/case-studies</loc>', anon.get('/sitemap-content.xml').content.decode())
        c = self.api.post('/api/admin/case-studies/', {'title': 'First case', 'overview': '<p>x</p>'}, format='json').json()
        self.api.post(f'/api/admin/case-studies/{c["id"]}/publish/')
        self.assertIn('/case-studies</loc>', anon.get('/sitemap-content.xml').content.decode())
        self.assertIn('index, follow', anon.get('/case-studies').content.decode())

    def test_search_console_sync_stores_index_status_and_clicks(self):
        from unittest import mock

        from . import search_console
        a = self.make_blog('Indexed post')
        b = self.make_blog('Waiting post')
        for x in (a, b):
            self.api.post(f'/api/admin/blogs/{x["id"]}/publish/')

        class Resp:
            def __init__(self, data):
                self.data = data

            def raise_for_status(self):
                pass

            def json(self):
                return self.data

        class FakeSession:
            def post(self, url, json, timeout):
                if 'urlInspection' in url:
                    ok = json['inspectionUrl'].endswith(a['slug'])
                    return Resp({'inspectionResult': {'indexStatusResult': {'verdict': 'PASS' if ok else 'NEUTRAL',
                                 'coverageState': 'Submitted and indexed' if ok else 'Discovered - currently not indexed'}}})
                return Resp({'rows': [{'keys': [f'https://codinghubs.in/blog/{a["slug"]}'], 'clicks': 3, 'impressions': 40}]})

        result = search_console.sync_blogs(session=FakeSession())
        self.assertEqual(result['inspected'], 2)
        rows = {r['slug']: r for r in self.api.get('/api/admin/blogs/').json()['results']}
        self.assertEqual((rows[a['slug']]['gsc_status'], rows[a['slug']]['gsc_clicks'], rows[a['slug']]['gsc_impressions']), ('indexed', 3, 40))
        self.assertEqual(rows[b['slug']]['gsc_status'], 'not_indexed')
        self.assertIn('not indexed', rows[b['slug']]['gsc_coverage'])
        with mock.patch.object(search_console, 'is_configured', return_value=False):
            self.assertFalse(self.api.get('/api/admin/blogs/search-console/').json()['configured'])
            self.assertEqual(self.api.post('/api/admin/blogs/search-console/').status_code, 400)

    def test_team_byline_is_the_organization_not_a_person(self):
        b = self.make_blog('Team article', author_name='Coding Hubs Team')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        html = self.as_user(None).get(f'/blog/{b["slug"]}').content.decode()
        ld = json.loads(html.split('<script type="application/ld+json">')[1].split('</script>')[0])
        author = ld['@graph'][0]['author']
        self.assertEqual(author['@type'], 'EducationalOrganization')
        self.assertEqual(author['@id'], 'https://codinghubs.in/#organization')

    def test_blog_listing_canonicals_categories_and_out_of_range_pages(self):
        cat = BlogCategory.objects.create(name='Python', slug='python')
        for i in range(10):
            b = self.make_blog(f'Python post {i}')
            Blog.objects.filter(pk=b['id']).update(category=cat)
            self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        anon = self.as_user(None)
        html = anon.get('/blog?category=python').content.decode()
        self.assertIn('<link rel="canonical" href="https://codinghubs.in/blog?category=python">', html)
        self.assertIn('<title>Python Articles | Coding Hubs Blog</title>', html)
        self.assertIn('<h1>Python Articles</h1>', html)
        self.assertIn('href="/blog?category=python"', html)  # crawlable category link
        self.assertIn('href="/blog?category=python&amp;page=2"', html)
        page2 = anon.get('/blog?category=python&page=2').content.decode()
        self.assertIn('href="https://codinghubs.in/blog?category=python&amp;page=2"', page2)
        self.assertIn('rel="prev" href="/blog?category=python"', page2)  # page 1 has no page parameter
        self.assertEqual(anon.get('/blog?page=2').status_code, 200)
        self.assertIn('rel="prev" href="/blog"', anon.get('/blog?page=2').content.decode())
        self.assertEqual(anon.get('/blog?page=99').status_code, 404)
        self.assertEqual(anon.get('/blog?category=no-such-topic').status_code, 404)

    def test_canonical_override_and_unique_titles(self):
        b = self.make_blog('Override', canonical_url='https://example.org/original', seo_title='Custom title', meta_description='Custom description.')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        html = self.as_user(None).get(f'/blog/{b["slug"]}').content.decode()
        self.assertIn('<title>Custom title</title>', html)
        self.assertIn('href="https://example.org/original"', html)

    def test_unknown_slug_is_a_real_404_and_noindex(self):
        r = self.as_user(None).get('/blog/does-not-exist')
        self.assertEqual(r.status_code, 404)
        self.assertIn('noindex', r['X-Robots-Tag'])
        self.assertEqual(self.as_user(None).get('/case-studies/does-not-exist').status_code, 404)
        draft = self.make_blog('Draft only')
        self.assertEqual(self.as_user(None).get(f'/blog/{draft["slug"]}').status_code, 404)

    def test_listing_page_and_sitemap_include_only_public_content(self):
        pub_b = self.published_blog()
        draft = self.make_blog('Hidden draft')
        c = self.api.post('/api/admin/case-studies/', {'title': 'Public case', 'overview': '<p>x</p>'}, format='json').json()
        self.api.post(f'/api/admin/case-studies/{c["id"]}/publish/')
        draft_case = self.api.post('/api/admin/case-studies/', {'title': 'Draft case'}, format='json').json()
        anon = self.as_user(None)
        listing = anon.get('/blog').content.decode()
        self.assertIn(pub_b['slug'], listing)
        self.assertNotIn(draft['slug'], listing)
        self.assertIn('<link rel="canonical" href="https://codinghubs.in/blog">', listing)
        sm = anon.get('/sitemap-content.xml')
        self.assertEqual(sm['Content-Type'].split(';')[0], 'application/xml')
        body = sm.content.decode()
        self.assertIn(f'https://codinghubs.in/blog/{pub_b["slug"]}', body)
        self.assertIn(f'https://codinghubs.in/case-studies/{c["slug"]}', body)
        self.assertNotIn(draft['slug'], body)
        self.assertNotIn(draft_case['slug'], body)
        self.api.post(f'/api/admin/blogs/{pub_b["id"]}/unpublish/')
        self.assertNotIn(pub_b['slug'], anon.get('/sitemap-content.xml').content.decode())  # unpublish removes it at once

    def test_search_results_page_is_noindex(self):
        self.published_blog()
        html = self.as_user(None).get('/blog?q=python').content.decode()
        self.assertIn('content="noindex, follow"', html)

    def test_sitemap_excludes_pages_with_a_different_canonical(self):
        blog = self.published_blog()
        obj = Blog.objects.get(pk=blog['id'])
        own_url = f'https://codinghubs.in/blog/{obj.slug}'
        obj.canonical_url = own_url
        obj.save()
        anon = self.as_user(None)
        self.assertIn(own_url, anon.get('/sitemap-content.xml').content.decode())
        obj.canonical_url = 'https://example.org/original-article'
        obj.save()
        self.assertNotIn(own_url, anon.get('/sitemap-content.xml').content.decode())
        case = CaseStudy.objects.create(title='Syndicated study', slug='syndicated-study', status='published', published_at=timezone.now(), canonical_url='https://codinghubs.in/case-studies/primary-study')
        self.assertNotIn('/case-studies/' + case.slug, anon.get('/sitemap-content.xml').content.decode())

    def test_json_ld_is_escaped_inside_script(self):
        b = self.make_blog('Break </script><b>out', excerpt='x')
        self.api.post(f'/api/admin/blogs/{b["id"]}/publish/')
        html = self.as_user(None).get(f'/blog/{b["slug"]}').content.decode()
        ld_block = html.split('<script type="application/ld+json">')[1].split('</script>')[0]
        self.assertNotIn('</', ld_block)
        self.assertNotIn('<b>', html.split('<h1>')[1].split('</h1>')[0])

    def test_blog_detail_payload_has_seo_block(self):
        b = self.published_blog()
        seo = self.as_user(None).get(f'/api/blogs/{b["slug"]}/').json()['seo']
        self.assertEqual(seo['canonical'], f'https://codinghubs.in/blog/{b["slug"]}')
        self.assertTrue(seo['robots'].startswith('index'))


class HeadingIdTests(TestCase):
    def test_ids_are_unique(self):
        html, toc = add_heading_ids('<h2>Intro</h2><h2>Intro</h2><h3>Deep dive</h3>')
        self.assertEqual([t['id'] for t in toc], ['intro', 'intro-2', 'deep-dive'])
        self.assertIn('<h2 id="intro">', html)


class TestimonialTests(TestCase):
    def test_only_published_and_permitted_reviews_are_public(self):
        from rest_framework.test import APIClient

        from .models import Testimonial

        Testimonial.objects.create(name='A', text='Great', is_published=True, permission_confirmed=True, course='Python')
        Testimonial.objects.create(name='B', text='No permission', is_published=True, permission_confirmed=False)
        Testimonial.objects.create(name='C', text='Draft', is_published=False, permission_confirmed=True)
        rows = APIClient().get('/api/testimonials/').json()
        self.assertEqual([r['name'] for r in rows], ['A'])


class ReviewSubmissionTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.ok = {'name': 'Riya', 'course': 'Generative AI', 'text': 'The live demo class was clear and the trainer answered every question.', 'rating': 5, 'permission': True}

    def test_submission_is_saved_unpublished_and_not_shown(self):
        response = self.client.post('/api/testimonials/submit/', self.ok, format='json')
        self.assertEqual(response.status_code, 201)
        review = Testimonial.objects.get()
        self.assertEqual((review.rating, review.is_published, review.permission_confirmed, review.submitted_by_user), (5, False, True, True))
        self.assertEqual(self.client.get('/api/testimonials/').json(), [])

    def test_published_review_lists_its_rating(self):
        self.client.post('/api/testimonials/submit/', self.ok, format='json')
        Testimonial.objects.update(is_published=True)
        self.assertEqual(self.client.get('/api/testimonials/').json()[0]['rating'], 5)

    def test_invalid_reviews_are_rejected(self):
        for bad in ({'rating': 6}, {'rating': 0}, {'text': 'too short'}, {'permission': False}, {'name': ''}):
            response = self.client.post('/api/testimonials/submit/', {**self.ok, **bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
        self.assertFalse(Testimonial.objects.exists())

    def test_honeypot_submission_is_accepted_but_not_stored(self):
        response = self.client.post('/api/testimonials/submit/', {**self.ok, 'website': 'spam.example'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(Testimonial.objects.exists())

    def test_submissions_are_rate_limited(self):
        codes = [self.client.post('/api/testimonials/submit/', self.ok, format='json').status_code for _ in range(6)]
        self.assertEqual(codes[-1], 429)


class OptimizeMediaTests(TestCase):
    def test_big_png_is_converted_and_references_are_updated(self):
        import os
        from io import StringIO

        from django.core.management import call_command
        from django.test import override_settings
        from PIL import Image as PILImage

        from .models import Blog

        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, 'uploads', '2026', '10'))
            png = os.path.join(tmp, 'uploads', '2026', '10', 'big.png')
            PILImage.effect_noise((1800, 1200), 80).convert('RGB').save(png, 'PNG')
            self.assertGreater(os.path.getsize(png), 150_000)
            with override_settings(MEDIA_ROOT=tmp):
                blog = Blog.objects.create(title='Img', slug='img', excerpt='x', content='<p><img src="/media/uploads/2026/10/big.png" alt="a"></p>',
                                           featured_image='/media/uploads/2026/10/big.png')
                call_command('optimize_media', stdout=StringIO())  # dry run changes nothing
                blog.refresh_from_db()
                self.assertTrue(blog.featured_image.endswith('big.png'))
                call_command('optimize_media', '--apply', stdout=StringIO())
                blog.refresh_from_db()
                self.assertEqual(blog.featured_image, '/media/uploads/2026/10/big.webp')
                self.assertIn('/media/uploads/2026/10/big.webp', blog.content)
                self.assertTrue(os.path.exists(png))  # original kept
                self.assertLess(os.path.getsize(os.path.join(tmp, 'uploads', '2026', '10', 'big.webp')), os.path.getsize(png))


class ShellChromeTests(TestCase):
    def test_shell_header_and_footer_replace_template_chrome(self):
        from .ssr import apply_chrome
        shell = '<body><div id="root"><!--SSR_ROOT--></div><!--CHROME_TOP--><header>react</header><!--/CHROME_TOP--><!--CHROME_BOTTOM--><footer>react</footer><!--/CHROME_BOTTOM--></body>'
        body = '<div class="fs-page"><!--chrome:top--><header>old</header><!--/chrome:top--><main>x</main><!--chrome:bottom--><footer>old</footer><!--/chrome:bottom--></div>'
        new_shell, new_body = apply_chrome(shell, body)
        self.assertEqual(new_body, '<div class="fs-page"><header>react</header><main>x</main><footer>react</footer></div>')
        self.assertNotIn('CHROME', new_shell)
        self.assertNotIn('react', new_shell)

    def test_template_chrome_is_the_fallback_without_shell_blocks(self):
        from .ssr import apply_chrome
        body = '<!--chrome:top--><header>old</header><!--/chrome:top--><main>x</main>'
        self.assertEqual(apply_chrome('<body><!--SSR_ROOT--></body>', body)[1], '<header>old</header><main>x</main>')
