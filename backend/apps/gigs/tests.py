from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError as ModelValidationError
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .admin import GigAdmin
from .models import Gig, GigReport, Proposal


@override_settings(GIGS_ENABLED=True)
class GigsTests(TestCase):
    def setUp(self):
        cache.clear()  # the anonymous API throttle is cache-backed; earlier test modules must not use up this test's quota
        User = get_user_model()
        self.owner = User.objects.create_user('client', email='private-client@example.test', password='test-pass')
        self.applicant = User.objects.create_user('learner', email='private-learner@example.test', password='test-pass')
        self.other = User.objects.create_user('outsider', password='test-pass')
        self.staff = User.objects.create_superuser('moderator', email='staff@example.test', password='test-pass')
        self.api = APIClient()
        self.payload = {'title': 'Build an accessible project dashboard', 'scope': 'Build a small dashboard from the supplied fictional dataset. Include keyboard navigation, empty states and a reproducible setup guide.', 'deliverable': 'A repository with documented setup and acceptance checks.', 'skills': ['React', 'Python']}
        self.brief = Gig.objects.create(owner=self.owner, **self.payload)

    def url(self, action=''):
        return '/api/gigs/' + self.brief.slug + '/' + action

    def approve(self):
        self.brief.status = Gig.Status.OPEN
        self.brief.approved_by = self.staff
        self.brief.approved_at = timezone.now()
        self.brief.save()

    def test_disabled_pilot_has_no_data_or_mutations(self):
        self.approve()
        self.api.force_authenticate(self.owner)
        with override_settings(GIGS_ENABLED=False):
            for url in ('/api/gigs/', '/api/gigs/workspace/', self.url(), '/gigs', '/gigs/' + self.brief.slug):
                self.assertEqual(self.api.get(url).status_code, 404)
            self.assertEqual(self.api.post('/api/gigs/', self.payload, format='json').status_code, 404)
            self.assertEqual(self.api.get('/api/gigs/status/').json(), {'enabled': False})
            self.assertEqual(self.api.post(self.url('proposals/'), {'pitch': 'x' * 80}).status_code, 404)

    def test_only_reviewed_open_briefs_are_public(self):
        for state in Gig.Status.values:
            self.brief.status = state
            self.brief.save()
            self.assertEqual(self.api.get(self.url()).status_code, 404)
        self.approve()
        response = self.api.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {'slug', 'title', 'scope', 'deliverable', 'skills', 'created_at', 'updated_at'})
        self.assertNotContains(response, 'private-client@')
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_open_model_requires_approval(self):
        self.brief.status = Gig.Status.OPEN
        with self.assertRaises(ModelValidationError):
            self.brief.clean()

    def test_anonymous_cannot_create_or_access_private_workspace(self):
        self.assertEqual(self.api.post('/api/gigs/', self.payload, format='json').status_code, 401)
        self.assertEqual(self.api.get('/api/gigs/workspace/').status_code, 401)
        self.assertEqual(self.api.post(self.url('proposals/'), {'pitch': 'x' * 80}).status_code, 401)

    def test_create_ignores_forged_owner_status_and_approval(self):
        self.api.force_authenticate(self.applicant)
        response = self.api.post('/api/gigs/', {**self.payload, 'owner': self.owner.pk, 'status': 'open', 'approved_by': self.staff.pk}, format='json')
        self.assertEqual(response.status_code, 201)
        brief = Gig.objects.get(slug=response.data['slug'])
        self.assertEqual(brief.owner, self.applicant)
        self.assertEqual(brief.status, Gig.Status.DRAFT)
        self.assertIsNone(brief.approved_by)

    def test_other_user_cannot_modify_submit_close_or_read_proposals(self):
        self.api.force_authenticate(self.other)
        self.assertEqual(self.api.patch(self.url(), self.payload, format='json').status_code, 404)
        for action in ('submit/', 'close/'):
            self.assertEqual(self.api.post(self.url(action)).status_code, 404)
        self.assertEqual(self.api.get(self.url('proposals/')).status_code, 404)

    def test_owner_edit_removes_publication_and_requires_review(self):
        self.approve()
        self.api.force_authenticate(self.owner)
        response = self.api.patch(self.url(), {**self.payload, 'status': 'open'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.brief.refresh_from_db()
        self.assertEqual(self.brief.status, Gig.Status.DRAFT)
        self.assertIsNone(self.brief.approved_at)
        self.assertIsNone(self.brief.approved_by)
        self.assertEqual(self.api.get(self.url()).status_code, 404)
        self.assertEqual(self.api.post(self.url('submit/')).data['status'], 'pending')
        self.assertEqual(self.api.post(self.url('submit/')).status_code, 400)

    def test_private_workspace_contains_only_current_users_rows(self):
        self.approve()
        Proposal.objects.create(gig=self.brief, applicant=self.applicant, pitch='Private learner proposal with a specific and bounded approach.')
        self.api.force_authenticate(self.other)
        self.assertEqual(self.api.get('/api/gigs/workspace/').json()['briefs'], [])
        self.assertEqual(self.api.get('/api/gigs/workspace/').json()['proposals'], [])
        self.api.force_authenticate(self.applicant)
        data = self.api.get('/api/gigs/workspace/').json()
        self.assertEqual(len(data['proposals']), 1)
        self.assertEqual(data['briefs'], [])
        self.api.force_authenticate(self.owner)
        received = self.api.get(self.url('proposals/'))
        self.assertEqual(received.data['count'], 1)
        self.assertNotIn('applicant', received.data['results'][0])
        self.assertNotContains(received, 'private-learner@')

    def test_one_proposal_per_person_and_no_self_proposals(self):
        self.approve()
        payload = {'pitch': 'I will build a small accessible prototype and document assumptions and acceptance checks.'}
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.api.post(self.url('proposals/'), payload).status_code, 400)
        self.api.force_authenticate(self.applicant)
        self.assertEqual(self.api.post(self.url('proposals/'), payload).status_code, 201)
        self.assertEqual(self.api.post(self.url('proposals/'), payload).status_code, 400)
        self.assertEqual(Proposal.objects.count(), 1)

    def test_closed_brief_rejects_new_proposals(self):
        self.approve()
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.api.post(self.url('close/')).data['status'], 'closed')
        self.api.force_authenticate(self.applicant)
        self.assertEqual(self.api.post(self.url('proposals/'), {'pitch': 'x' * 80}).status_code, 404)

    def test_reports_are_staff_only_and_duplicate_safe(self):
        self.approve()
        self.api.force_authenticate(self.applicant)
        for _ in range(2):
            self.assertEqual(self.api.post(self.url('report/'), {'reason': 'The scope appears to request confidential data.'}).status_code, 201)
        self.assertEqual(GigReport.objects.count(), 1)
        self.assertNotIn('reports', self.api.get(self.url()).data)
        self.assertEqual(self.api.get(self.url('report/')).status_code, 405)

    def test_input_boundaries(self):
        self.api.force_authenticate(self.owner)
        for value in ({**self.payload, 'scope': 'thin'}, {**self.payload, 'skills': []}, {**self.payload, 'skills': ['x' * 41]}, {**self.payload, 'title': 'x' * 121}):
            self.assertEqual(self.api.post('/api/gigs/', value, format='json').status_code, 400)

    def test_public_search_matches_the_server_rendered_title_search(self):
        self.approve()
        for query, expected in [('DASHBOARD', 1), ('reproducible', 0)]:
            with self.subTest(query=query):
                response = self.api.get('/api/gigs/', {'q': query})
                self.assertEqual(response.data['count'], expected)
                html = self.api.get('/gigs', {'q': query})
                self.assertEqual(html.status_code, 200)
                if expected:
                    self.assertContains(html, '/gigs/' + self.brief.slug)
                else:
                    self.assertNotContains(html, '/gigs/' + self.brief.slug)

    def test_invalid_listing_pages_return_404_in_both_renderers(self):
        self.approve()
        for number in ('0', '-1', '999', 'invalid'):
            with self.subTest(page=number):
                self.assertEqual(self.api.get('/api/gigs/', {'page': number}).status_code, 404)
                self.assertEqual(self.api.get('/gigs', {'page': number}).status_code, 404)

    def test_ssr_is_noindex_and_escapes_user_text(self):
        self.brief.scope = '<script>alert("x")</script>' + self.brief.scope
        self.approve()
        response = self.api.get('/gigs/' + self.brief.slug)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '&lt;script&gt;')
        self.assertNotContains(response, '<script>alert(')
        self.assertNotContains(response, self.owner.email)
        self.assertEqual(response['X-Robots-Tag'], 'noindex, follow')
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.brief.status = Gig.Status.PENDING
        self.brief.save()
        self.assertEqual(self.api.get('/gigs/' + self.brief.slug).status_code, 404)

    def test_admin_approval_only_applies_to_pending_briefs_and_is_logged(self):
        request = RequestFactory().post('/admin/')
        request.user = self.staff
        model_admin = GigAdmin(Gig, admin.site)
        self.assertNotIn('approve', model_admin.get_actions(type('Request', (), {'user': self.other, 'GET': {}})()))
        model_admin.approve(request, Gig.objects.all())
        self.brief.refresh_from_db()
        self.assertEqual(self.brief.status, Gig.Status.DRAFT)
        self.brief.status = Gig.Status.PENDING
        self.brief.save()
        model_admin.approve(request, Gig.objects.all())
        self.brief.refresh_from_db()
        self.assertEqual(self.brief.status, Gig.Status.OPEN)
        self.assertEqual(self.brief.approved_by, self.staff)
        self.assertTrue(self.staff.logentry_set.filter(object_id=str(self.brief.pk)).exists())
