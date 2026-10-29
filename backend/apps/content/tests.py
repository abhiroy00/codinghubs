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
from .models import Blog, BlogCategory, CaseStudy, SlugRedirect
from .sanitize import add_heading_ids, sanitize_html

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
