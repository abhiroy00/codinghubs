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


class StoreDataRemovalTests(TestCase):
    def test_purge_removes_commerce_records_and_preserves_other_domains_and_file_access(self):
        from importlib import import_module
        from types import SimpleNamespace
        from django.apps import apps
        from django.db import connection
        from apps.courses.models import Course, CourseCategory
        from apps.enrollments.models import Enrollment
        from apps.payments.models import Order as CourseOrder
        from . import access
        from .models import (AuditLog, Cart, CartItem, Coupon, CouponRedemption, DigitalAsset, DownloadEvent,
                             Order, OrderItem, Payment, PaymentEvent, Product, ProductCategory, Project, ProjectGuide, Refund, StoreSettings)
        user = get_user_model().objects.create_user('learner')
        category = CourseCategory.objects.create(name='AI', slug='ai')
        course = Course.objects.create(name='AI course', slug='ai-course', category=category)
        Enrollment.objects.create(user=user, course=course)
        CourseOrder.objects.create(user=user, course=course, amount=100)
        product = Product.objects.create(title='Legacy paid source', slug='legacy', sku='LEGACY', price=100)
        ProductCategory.objects.create(name='Store category', slug='store-category')
        project = Project.objects.create(title='Paid project', slug='paid-project', product=product)
        free = Project.objects.create(title='Free project', slug='free-project')
        guide = ProjectGuide.objects.create(title='Guide', slug='guide')
        for owner in ({'product': product}, {'project': project}, {'project': free}, {'guide': guide}):
            DigitalAsset.objects.create(**owner, file='fixture.pdf', label='PDF', original_name='fixture.pdf')
        order = Order.objects.create(number='OLD', user=user, name='Learner', email='learner@example.test')
        item = OrderItem.objects.create(order=order, product=product, title='Snapshot', sku='OLD', product_type='digital', unit_price=100, quantity=1, line_total=100)
        payment = Payment.objects.create(order=order, amount=100)
        Refund.objects.create(order=order, payment=payment, amount=10)
        PaymentEvent.objects.create(event_id='old-event', event_type='captured')
        coupon = Coupon.objects.create(code='OLD', value=10)
        CouponRedemption.objects.create(coupon=coupon, order=order, email=user.email, amount=10)
        CartItem.objects.create(cart=Cart.objects.create(user=user), product=product)
        StoreSettings.objects.create(pk=1)
        asset = DigitalAsset.objects.get(project=free)
        DownloadEvent.objects.create(asset=asset, source='project')
        DownloadEvent.objects.create(asset=asset, source='order', order=order)
        AuditLog.objects.create(action='edit', object_type='Project', object_id=str(project.pk))
        AuditLog.objects.create(action='order', object_type='Order', object_id=str(order.pk))
        purge = import_module('apps.shop.migrations.0008_remove_store_data').remove_store_data
        purge(apps, SimpleNamespace(connection=connection))
        for name in ('Product', 'ProductCategory', 'ProductImage', 'Order', 'OrderItem', 'Payment', 'Refund', 'PaymentEvent',
                     'Coupon', 'CouponRedemption', 'Cart', 'CartItem', 'StoreSettings', 'DownloadPermission', 'FreeDownloadLead', 'InventoryMovement'):
            with self.subTest(model=name):
                self.assertEqual(apps.get_model('shop', name).objects.count(), 0)
        self.assertTrue(get_user_model().objects.filter(pk=user.pk).exists())
        self.assertEqual(Enrollment.objects.count(), 1)
        self.assertEqual(CourseOrder.objects.count(), 1)
        self.assertEqual(Project.objects.count(), 2)
        self.assertEqual(ProjectGuide.objects.count(), 1)
        self.assertEqual(DigitalAsset.objects.count(), 3)
        self.assertEqual(DownloadEvent.objects.count(), 1)
        self.assertEqual(AuditLog.objects.count(), 1)
        project.refresh_from_db()
        self.assertTrue(project.files_restricted)
        self.assertFalse(access.project_access(user, project))
        self.assertTrue(access.project_access(None, free))
        # A retry is safe and does not remove the surviving resource data.
        purge(apps, SimpleNamespace(connection=connection))
        self.assertEqual(DigitalAsset.objects.count(), 3)
