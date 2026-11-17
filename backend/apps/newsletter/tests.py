import uuid
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import Subscriber, Issue, Delivery
from .services import subscribe, confirm, unsubscribe, token_for, queue_campaign, process_batch


@override_settings(NEWSLETTER_EMAIL_ENABLED=True, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class NewsletterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.staff = get_user_model().objects.create_user(username='editor', is_staff=True)
        self.student = get_user_model().objects.create_user(username='student')

    def test_normalization_double_opt_in_and_duplicate_submissions(self):
        for email in [' Learner@Example.com ', 'learner@example.com']:
            response = self.api.post('/api/newsletter/subscribe/', {'email': email.strip(), 'consent': True}, format='json')
            self.assertEqual(response.status_code, 202)
        self.assertEqual(Subscriber.objects.count(), 1)
        self.assertEqual(Delivery.objects.count(), 1)
        obj = Subscriber.objects.get()
        self.assertEqual(obj.status, 'pending')
        process_batch()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/newsletter/confirm/', mail.outbox[0].body)
        self.assertTrue(confirm(token_for(obj, 'confirm')))
        self.assertTrue(confirm(token_for(obj, 'confirm')))
        self.assertEqual(Subscriber.objects.get().status, 'confirmed')
        process_batch()
        self.assertEqual(len(mail.outbox), 1)

    def test_expired_invalid_and_wrong_purpose_links(self):
        subscribe('a@example.com', 'test')
        obj = Subscriber.objects.get()
        token = token_for(obj, 'confirm')
        with patch('django.core.signing.time.time', return_value=0):
            expired = token_for(obj, 'confirm')
        for value in [expired, token + 'x', token_for(obj, 'unsubscribe')]:
            result = self.api.post('/api/newsletter/confirm/', {'token': value}, format='json')
            self.assertEqual(result.status_code, 400)
        obj.refresh_from_db()
        self.assertEqual(obj.status, 'pending')

    def test_unsubscribe_is_idempotent_and_resubscribe_requires_new_confirmation(self):
        subscribe('a@example.com', 'test')
        obj = Subscriber.objects.get()
        old_confirm = token_for(obj, 'confirm')
        confirm(old_confirm)
        stop = token_for(obj, 'unsubscribe')
        unsubscribe(stop)
        unsubscribe(stop)
        subscribe(obj.email, 'again')
        obj.refresh_from_db()
        self.assertEqual(obj.status, 'pending')
        with self.assertRaises(Subscriber.DoesNotExist):
            confirm(old_confirm)
        with self.assertRaises(Subscriber.DoesNotExist):
            unsubscribe(stop)
        self.assertTrue(confirm(token_for(obj, 'confirm')))

    def test_generic_response_honeypot_consent_and_rate_limit(self):
        payload = {'email': 'bot@example.com', 'consent': True, 'website': 'spam'}
        self.assertEqual(self.api.post('/api/newsletter/subscribe/', payload).status_code, 202)
        self.assertFalse(Subscriber.objects.exists())
        self.assertEqual(self.api.post('/api/newsletter/subscribe/', {'email': 'bad', 'consent': False}).status_code, 400)
        subscribe('known@example.com', 'test')
        obj = Subscriber.objects.get()
        confirm(token_for(obj, 'confirm'))
        a = self.api.post('/api/newsletter/subscribe/', {'email': obj.email, 'consent': True}).data
        b = self.api.post('/api/newsletter/subscribe/', {'email': 'new@example.com', 'consent': True}).data
        self.assertEqual(a, b)
        for _ in range(5):
            result = self.api.post('/api/newsletter/subscribe/', {'email': 'rate@example.com', 'consent': True})
        self.assertEqual(result.status_code, 429)

    @override_settings(NEWSLETTER_EMAIL_ENABLED=False)
    def test_unconfigured_mail_fails_honestly(self):
        self.assertEqual(self.api.post('/api/newsletter/subscribe/', {'email': 'a@example.com', 'consent': True}).status_code, 503)
        self.assertFalse(Subscriber.objects.exists())
        with self.assertRaises(RuntimeError):
            process_batch()

    def test_campaign_idempotency_eligibility_snapshot_and_unsubscribe(self):
        for email in ['yes@example.com', 'stopped@example.com', 'pending@example.com']:
            subscribe(email, 'test')
        yes = Subscriber.objects.get(email='yes@example.com')
        stopped = Subscriber.objects.get(email='stopped@example.com')
        for obj in [yes, stopped]:
            confirm(token_for(obj, 'confirm'))
        issue = Issue.objects.create(title='Real issue', slug='real', excerpt='An issue', content='<p>Useful content</p>', published=True)
        key = uuid.uuid4()
        campaign = queue_campaign(issue, key, self.staff)
        self.assertEqual(queue_campaign(issue, key, self.staff).pk, campaign.pk)
        self.assertEqual(queue_campaign(issue, uuid.uuid4(), self.staff).pk, campaign.pk)
        self.assertEqual(campaign.deliveries.count(), 2)
        issue.content = '<p>Changed later</p>'
        issue.save()
        unsubscribe(token_for(stopped, 'unsubscribe'))
        process_batch()
        delivered = [m for m in mail.outbox if m.subject == 'Real issue']
        self.assertEqual(len(delivered), 1)
        self.assertEqual(delivered[0].to, ['yes@example.com'])
        self.assertIn('Useful content', delivered[0].body)
        self.assertIn('/newsletter/unsubscribe/', delivered[0].body)
        process_batch()
        self.assertEqual(len([m for m in mail.outbox if m.subject == 'Real issue']), 1)
        self.assertEqual(campaign.deliveries.get(subscriber=stopped).status, 'skipped')

    def test_ambiguous_provider_error_is_never_automatically_retried(self):
        subscribe('a@example.com', 'test')
        with patch('django.core.mail.message.EmailMultiAlternatives.send', side_effect=OSError('offline')):
            process_batch()
        self.assertEqual(Delivery.objects.get().status, 'unknown')
        self.assertEqual(process_batch(), 0)

    def test_publication_sanitization_and_admin_authorization(self):
        draft = Issue.objects.create(title='Private draft', slug='draft', excerpt='Draft', content='<script>alert(1)</script><p>Safe</p>')
        Issue.objects.create(title='Public', slug='public', excerpt='Published', content='<p>Public body</p>', published=True)
        self.assertEqual(self.api.get('/api/newsletter/issues/').data['count'], 1)
        self.assertEqual(self.api.get('/api/newsletter/issues/draft/').status_code, 404)
        self.assertNotIn('<script', draft.content)
        for user in [None, self.student]:
            self.api.force_authenticate(user)
            for url in ['subscribers/', 'subscribers/export/', 'issues/', 'campaigns/']:
                self.assertIn(self.api.get('/api/admin/newsletter/' + url).status_code, [401, 403])
        self.api.force_authenticate(self.staff)
        response = self.api.post('/api/admin/newsletter/issues/', {'title': 'Created', 'slug': 'created', 'excerpt': 'Intro', 'content_html': '<p>Hello</p><img src=x onerror=alert(1)>', 'is_published': False}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('onerror', response.data['content_html'])
        send = {'issue': draft.pk, 'idempotency_key': str(uuid.uuid4()), 'confirmation': 'SEND'}
        self.assertEqual(self.api.post('/api/admin/newsletter/campaigns/', send).status_code, 400)

    def test_csv_formula_protection_and_no_public_subscriber_list(self):
        Subscriber.objects.create(email='=formula@example.com', source='\t=SUM(1)', consent_at=timezone.now())
        self.api.force_authenticate(self.staff)
        response = self.api.get('/api/admin/newsletter/subscribers/export/')
        self.assertIn("'=formula", response.content.decode())
        self.assertIn("'\t=SUM", response.content.decode())
        self.assertIn('no-store', response['Cache-Control'])
        self.assertEqual(self.api.get('/api/newsletter/subscribers/').status_code, 404)

    def test_publication_preview_confirmation_and_admin_endpoints(self):
        for actor in [None, self.student]:
            self.api.force_authenticate(actor)
            for path in ['subscribers/', 'subscribers/export/', 'issues/', 'campaigns/']:
                self.assertIn(self.api.get('/api/admin/newsletter/' + path).status_code, [401, 403])
        self.api.force_authenticate(self.staff)
        payload = {'title': 'A real issue', 'slug': 'published-issue', 'excerpt': 'Useful practice', 'content_html': '<p>Useful</p><script>bad()</script>', 'is_published': False}
        saved = self.api.post('/api/admin/newsletter/issues/', payload, format='json')
        self.assertEqual(saved.status_code, 201, saved.data)
        ident = saved.data['id']
        self.assertNotIn('<script>', saved.data['content_html'])
        self.assertEqual(self.api.get('/api/newsletter/issues/published-issue/').status_code, 404)
        self.api.patch(f'/api/admin/newsletter/issues/{ident}/', {'is_published': True}, format='json')
        self.assertEqual(self.api.get('/api/newsletter/issues/published-issue/').status_code, 200)
        preview = self.api.get(f'/api/admin/newsletter/issues/{ident}/preview/').data
        send = {'issue': ident, 'idempotency_key': str(uuid.uuid4()), 'confirmation': 'SEND', 'preview_token': preview['preview_token']}
        self.assertEqual(self.api.post('/api/admin/newsletter/campaigns/', {**send, 'confirmation': 'NO'}, format='json').status_code, 400)
        first = self.api.post('/api/admin/newsletter/campaigns/', send, format='json')
        self.assertEqual(first.status_code, 202, first.data)
        self.assertEqual(self.api.post('/api/admin/newsletter/campaigns/', send, format='json').data['id'], first.data['id'])
        self.api.patch(f'/api/admin/newsletter/issues/{ident}/', {'content_html': '<p>Changed</p>'}, format='json')
        self.assertEqual(self.api.post('/api/admin/newsletter/campaigns/', send, format='json').status_code, 400)
        self.api.patch(f'/api/admin/newsletter/issues/{ident}/', {'is_published': False}, format='json')
        self.assertEqual(self.api.get('/newsletter/issues/published-issue/').status_code, 404)

    def test_ambiguous_mail_is_not_automatically_sent_twice(self):
        subscribe('a@example.com', 'test')
        with patch('apps.newsletter.services.EmailMultiAlternatives.send', side_effect=TimeoutError()):
            process_batch()
        self.assertEqual(Delivery.objects.get().status, 'unknown')
        with patch('apps.newsletter.services.EmailMultiAlternatives.send') as send:
            process_batch()
        send.assert_not_called()

    def test_newsletter_and_admin_login_limits_do_not_share_public_browsing_history(self):
        for _ in range(12):
            self.assertEqual(self.api.get('/api/interview/resources/').status_code, 200)
        response = self.api.post('/api/newsletter/subscribe/', {'email': 'fresh@example.com', 'consent': True})
        self.assertEqual(response.status_code, 202)
        self.staff.email = 'editor@example.com'
        self.staff.set_password('Strong-test-384!')
        self.staff.save()
        login = self.api.post('/api/admin/login/', {'email': 'editor@example.com', 'password': 'Strong-test-384!'})
        self.assertEqual(login.status_code, 200, login.data)

    def test_public_issue_re_sanitizes_historical_content_and_defers_body_images(self):
        issue = Issue.objects.create(title='Read safety', slug='read-safety', excerpt='A real issue', content='<p>Body</p>', published=True)
        Issue.objects.filter(pk=issue.pk).update(content='<script>unsafe()</script><img src="/media/example.webp" width="100" height="50">')
        result = self.api.get('/api/newsletter/issues/read-safety/')
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('<script', result.data['content_html'])
        self.assertIn('loading="lazy"', result.data['content_html'])
        page = self.api.get('/newsletter/')
        self.assertContains(page, '/assets/hero/video/pages/blog-poster-768.webp')
        self.assertContains(page, 'rel="preload"')
