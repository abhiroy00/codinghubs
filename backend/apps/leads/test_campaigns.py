from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Campaign, Lead


def offer(**kw):
    now = timezone.now()
    data = dict(title='Early bird', offer_text='Save on the next AI batch', offer_label='₹2,000 off', status=Campaign.STATUS_PUBLISHED,
                starts_at=now - timedelta(hours=1), ends_at=now + timedelta(days=2))
    data.update(kw)
    return Campaign.objects.create(**data)


class PublicCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        Campaign.objects.all().delete()  # start without the offer published by migration 0005
        self.client = APIClient()

    def active(self, **params):
        return self.client.get('/api/leads/campaigns/active/', params)

    def test_only_live_published_offers_are_returned_and_never_cached(self):
        now = timezone.now()
        offer(title='Draft', status=Campaign.STATUS_DRAFT, priority=9)
        offer(title='Paused', status=Campaign.STATUS_PAUSED, priority=9)
        offer(title='Scheduled', starts_at=now + timedelta(hours=1), priority=9)
        offer(title='Expired', starts_at=now - timedelta(days=3), ends_at=now - timedelta(seconds=1), priority=9)
        response = self.active(path='/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertIsNone(response.json()['campaign'])
        live = offer(title='Live')
        self.assertEqual(self.active(path='/').json()['campaign']['id'], live.id)

    def test_targeting_by_course_category_and_page_with_priority(self):
        general = offer(title='Everyone', priority=1)
        course = offer(title='Data science', target_type=Campaign.TARGET_COURSE, target_values=['data-science'], priority=5)
        category = offer(title='Cloud', target_type=Campaign.TARGET_CATEGORY, target_values=['Cloud & DevOps'], priority=5)
        page = offer(title='Blog readers', target_type=Campaign.TARGET_PAGE, target_values=['/blog/*'], priority=5)
        self.assertEqual(self.active(path='/courses/data-science/', course='data-science').json()['campaign']['id'], course.id)
        self.assertEqual(self.active(path='/courses/aws/', course='aws', category='cloud & devops').json()['campaign']['id'], category.id)
        self.assertEqual(self.active(path='/blog/what-is-rag').json()['campaign']['id'], page.id)
        self.assertEqual(self.active(path='/').json()['campaign']['id'], general.id)

    def test_public_payload_hides_targeting(self):
        offer(target_type=Campaign.TARGET_PAGE, target_values=['/'])
        data = self.active(path='/').json()['campaign']
        self.assertNotIn('target_values', data)
        self.assertNotIn('priority', data)

    def test_lead_records_a_live_campaign_and_rejects_an_expired_one(self):
        live = offer()
        payload = {'name': 'Asha', 'phone': '9876543210', 'course': 'Data Science', 'mode': 'demo', 'campaign': live.id}
        self.assertEqual(self.client.post('/api/leads/', payload, format='json').status_code, 201)
        self.assertEqual(Lead.objects.get().campaign, live)
        Campaign.objects.filter(pk=live.pk).update(ends_at=timezone.now() - timedelta(minutes=1))
        response = self.client.post('/api/leads/', {**payload, 'phone': '9876543211'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('campaign', response.json())


class AdminCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'S3cure-pass!')
        self.staff = User.objects.create_user('ed', 'ed@example.com', 'S3cure-pass!', is_staff=True)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def body(self, **kw):
        now = timezone.now()
        data = {'title': 'Weekend offer', 'offer_text': 'Join this weekend', 'starts_at': now.isoformat(), 'ends_at': (now + timedelta(days=1)).isoformat()}
        data.update(kw)
        return data

    def test_admin_creates_previews_publishes_and_pauses(self):
        created = self.api.post('/api/admin/campaigns/', self.body(), format='json')
        self.assertEqual(created.status_code, 201, created.content)
        cid = created.json()['id']
        self.assertEqual(created.json()['state'], 'draft')
        self.assertEqual(self.api.patch(f'/api/admin/campaigns/{cid}/', {'status': 'published'}, format='json').json()['state'], 'live')
        self.assertEqual(self.api.patch(f'/api/admin/campaigns/{cid}/', {'status': 'paused'}, format='json').json()['state'], 'paused')

    def test_validation_keeps_offers_honest(self):
        now = timezone.now()
        bad_window = self.api.post('/api/admin/campaigns/', self.body(ends_at=(now - timedelta(days=1)).isoformat()), format='json')
        self.assertIn('ends_at', bad_window.json())
        no_end = self.api.post('/api/admin/campaigns/', self.body(ends_at=None, show_countdown=True), format='json')
        self.assertIn('show_countdown', no_end.json())
        no_target = self.api.post('/api/admin/campaigns/', self.body(target_type='course', target_values=[]), format='json')
        self.assertIn('target_values', no_target.json())
        bad_link = self.api.post('/api/admin/campaigns/', self.body(cta_url='javascript:alert(1)'), format='json')
        self.assertIn('cta_url', bad_link.json())

    def test_migration_published_the_twenty_percent_offer(self):
        offer = Campaign.objects.get(title='20% off course fees')
        self.assertEqual((offer.status, offer.offer_label, offer.cta_url, offer.ends_at), ('published', '20% OFF', '#demo', None))
        self.assertEqual(offer.presentation, 'modal')

    def test_staff_without_permission_and_visitors_are_refused(self):
        staff = APIClient()
        staff.force_authenticate(self.staff)
        self.assertEqual(staff.get('/api/admin/campaigns/').status_code, 403)
        self.assertIn(APIClient().get('/api/admin/campaigns/').status_code, (401, 403))
