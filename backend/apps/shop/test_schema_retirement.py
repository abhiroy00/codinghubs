from django.apps import apps
from django.core.management import get_commands
from django.core.management import call_command, CommandError
from django.test import TestCase

from .models import Project, ProjectGuide


class StoreSchemaRetirementTests(TestCase):
    def test_retired_store_models_are_not_registered(self):
        for model in ('Product', 'ProductCategory', 'ProductImage', 'Cart', 'CartItem', 'Coupon',
                      'CouponRedemption', 'StoreSettings', 'Order', 'OrderItem', 'Payment',
                      'PaymentEvent', 'Refund', 'InventoryMovement', 'DownloadPermission', 'FreeDownloadLead'):
            with self.subTest(model=model), self.assertRaises(LookupError):
                apps.get_model('shop', model)

    def test_resources_no_longer_reference_products_or_store_orders(self):
        for model in ('Project', 'ProjectGuide', 'DigitalAsset', 'DownloadEvent'):
            fields = {field.name for field in apps.get_model('shop', model)._meta.fields}
            self.assertFalse(fields & {'product', 'order'}, model)

    def test_retired_order_management_command_is_gone(self):
        self.assertNotIn('audit_store_orders', get_commands())

    def test_public_resource_payload_has_no_commerce_fields(self):
        project = Project.objects.create(title='Resource', slug='resource', status='published')
        response = self.client.get(f'/api/projects/{project.slug}/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse({'product', 'price', 'currency', 'is_paid'} & response.json().keys())

    def test_restricted_guide_can_be_created_without_a_retired_product(self):
        guide = ProjectGuide(title='Restricted', slug='restricted', access_type='restricted')
        guide.full_clean(exclude=['created_by', 'published_at'])

    def test_verification_refuses_decreased_retained_record_counts(self):
        with self.assertRaisesMessage(CommandError, 'Retained record counts decreased'):
            call_command('verify_store_retirement', baseline_json='{"shop.Project": 1}')
