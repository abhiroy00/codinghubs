"""Store retirement must remove entry points without affecting learning resources."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient


class RetiredStoreRoutesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()

    def test_public_store_and_order_apis_are_removed_for_reads_and_writes(self):
        for path in ('products/', 'product-categories/', 'cart/', 'cart/items/', 'cart/coupon/', 'checkout/',
                     'store/settings/', 'store/orders/OLD/', 'my-account/orders/', 'my-account/downloads/',
                     'my-account/claim-order/', 'store/payments/verify/', 'store/payments/webhook/', 'store/payments/failed/'):
            for method in ('get', 'post'):
                with self.subTest(path=path, method=method):
                    response = getattr(self.client, method)(f'/api/{path}', {}, format='json')
                    self.assertEqual(response.status_code, 404)

    def test_admin_cannot_recreate_store_data_through_retired_apis(self):
        user = get_user_model().objects.create_user('owner', is_staff=True, is_superuser=True)
        self.client.force_authenticate(user)
        for path in ('products/', 'product-categories/', 'free-download-leads/', 'store-orders/', 'store-settings/',
                     'customers/', 'inventory/', 'coupons/', 'shop/stats/', 'shop/audit/'):
            for method in ('get', 'post'):
                with self.subTest(path=path, method=method):
                    self.assertEqual(getattr(self.client, method)(f'/api/admin/{path}', {}, format='json').status_code, 404)

    def test_projects_and_guides_stay_available(self):
        for path in ('/api/projects/', '/api/project-guides/', '/projects', '/project-guides', '/sitemap-shop.xml'):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)
