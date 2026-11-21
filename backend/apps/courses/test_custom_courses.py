import json

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Course, CourseCategory

NO_THROTTLE = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_THROTTLE_CLASSES': (),
    'DEFAULT_THROTTLE_RATES': {'anon': '1000/min', 'user': '1000/min'},
}

COURSE = {
    'name': 'Automation Testing', 'slug': 'automation-testing-x', 'category_name': 'Automation & Testing', 'level': 'Beginner',
    'summary': 'Selenium, Playwright and API testing.', 'introduction': 'First paragraph.\nSecond paragraph.',
    'tools': ['Selenium', 'Playwright', ' '], 'skills': ['Test design'], 'careers': ['QA engineer'],
    'modules': [{'title': 'Selenium WebDriver', 'description': 'Browsers.', 'topics': ['Locators', 'Waits']}],
    'projects': [{'name': 'UI suite', 'description': 'Automate a demo store.', 'skills': ['POM']}],
    'faqs': [{'question': 'Do I need coding?', 'answer': 'No.'}],
}


@override_settings(REST_FRAMEWORK=NO_THROTTLE)
class CustomCourseTests(TestCase):
    def setUp(self):
        User = get_user_model()
        staff = User.objects.create_user('boss', email='boss@example.com', password='S3cure-pass!', is_staff=True)
        self.admin = APIClient()
        self.admin.force_authenticate(staff)
        self.anon = APIClient()

    def create(self, **overrides):
        return self.admin.post('/api/admin/courses/', {**COURSE, **overrides}, format='json')

    def test_admin_creates_a_course_with_a_public_page_api_and_sitemap_entry(self):
        r = self.create()
        self.assertEqual(r.status_code, 201, r.content)
        course = Course.objects.get(slug='automation-testing-x')
        self.assertTrue(course.is_custom)
        self.assertEqual(course.placement_rate, 0)  # never an invented outcome
        self.assertEqual(course.tools, ['Selenium', 'Playwright'])  # blanks dropped
        self.assertEqual(course.category.name, 'Automation & Testing')

        listed = self.anon.get('/api/courses/custom/').json()
        self.assertEqual([c['slug'] for c in listed], ['automation-testing-x'])
        detail = self.anon.get('/api/courses/custom/automation-testing-x/').json()
        self.assertEqual(detail['modules'][0]['topics'], ['Locators', 'Waits'])

        page = self.client.get('/courses/automation-testing-x/')
        html = page.content.decode()
        self.assertEqual(page.status_code, 200)
        self.assertIn('<title>Automation Testing Course | Coding Hubs School of AI, Delhi</title>', html)
        self.assertIn('<link rel="canonical" href="https://codinghubs.in/courses/automation-testing-x/">', html)
        self.assertEqual(html.count('<h1'), 1)
        self.assertIn('Selenium WebDriver', html)
        ld = json.loads(html.split('<script type="application/ld+json">')[1].split('</script>')[0])
        self.assertEqual([n['@type'] for n in ld['@graph']], ['Course', 'BreadcrumbList'])
        self.assertNotIn('offers', json.dumps(ld))  # no invented price
        self.assertIn('https://codinghubs.in/courses/automation-testing-x/', self.client.get('/sitemap-content.xml').content.decode())
        # no invented fee: not in the priced course API and not payable online
        self.assertNotIn('automation-testing-x', [c['slug'] for c in self.anon.get('/api/courses/').json()])
        self.assertEqual(self.anon.get('/api/courses/automation-testing-x/').status_code, 404)
        nested = [c['slug'] for cat in self.anon.get('/api/courses/categories/').json() for c in cat['courses']]
        self.assertNotIn('automation-testing-x', nested)

    def test_hidden_or_unknown_course_is_a_real_404(self):
        self.create()
        Course.objects.filter(slug='automation-testing-x').update(is_active=False)
        self.assertEqual(self.client.get('/courses/automation-testing-x/').status_code, 404)
        self.assertEqual(self.client.get('/courses/does-not-exist/').status_code, 404)
        self.assertEqual(self.anon.get('/api/courses/custom/automation-testing-x/').status_code, 404)
        self.assertNotIn('automation-testing-x', self.client.get('/sitemap-content.xml').content.decode())

    def test_catalogue_urls_are_reserved_and_catalogue_content_is_read_only(self):
        r = self.create(slug='generative-ai')
        self.assertEqual(r.status_code, 400)
        self.assertIn('slug', r.json())
        category = CourseCategory.objects.create(name='AI & Data', slug='ai-data')
        legacy = Course.objects.create(category=category, name='Generative AI', slug='generative-ai')
        r = self.admin.patch(f'/api/admin/courses/{legacy.pk}/', {'name': 'Renamed', 'summary': 'x', 'is_active': False}, format='json')
        self.assertEqual(r.status_code, 200)
        legacy.refresh_from_db()
        self.assertEqual((legacy.name, legacy.summary, legacy.is_active), ('Generative AI', '', False))

    def test_admin_edits_and_students_cannot(self):
        course_id = self.create().json()['id']
        r = self.admin.patch(f'/api/admin/courses/{course_id}/', {'summary': 'Updated summary.', 'level': 'Expert'}, format='json')
        self.assertEqual(r.status_code, 400)  # invalid level rejected
        r = self.admin.patch(f'/api/admin/courses/{course_id}/', {'summary': 'Updated summary.'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.admin.get(f'/api/admin/courses/{course_id}/').json()['summary'], 'Updated summary.')
        student = APIClient()
        student.force_authenticate(get_user_model().objects.create_user('stu', email='s@example.com', password='S3cure-pass!'))
        self.assertIn(student.post('/api/admin/courses/', {**COURSE, 'slug': 'other'}, format='json').status_code, (401, 403))
