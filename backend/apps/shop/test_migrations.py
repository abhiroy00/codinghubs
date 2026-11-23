"""Exercise the historical Store purge followed by removal of its schema."""
from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class StoreRetirementMigrationTests(TransactionTestCase):
    old = ('shop', '0008_remove_store_data')
    new = ('shop', '0009_remove_retired_store_schema')

    def setUp(self):
        executor = MigrationExecutor(connection)
        executor.migrate([self.old])
        self.old_apps = executor.loader.project_state([self.old]).apps

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.new])
        super().tearDown()

    def test_purge_and_schema_cleanup_preserve_resources_accounts_and_course_payments(self):
        def model(app, name):
            return self.old_apps.get_model(app, name) if app == 'shop' else apps.get_model(app, name)
        user = model('accounts', 'User').objects.create(username='retained-learner')
        category = model('courses', 'CourseCategory').objects.create(name='AI', slug='ai')
        course = model('courses', 'Course').objects.create(name='AI course', slug='ai-course', category=category)
        model('enrollments', 'Enrollment').objects.create(user_id=user.pk, course_id=course.pk)
        model('payments', 'Order').objects.create(user_id=user.pk, course_id=course.pk, amount=100)
        product = model('shop', 'Product').objects.create(title='Retired', slug='retired', sku='OLD', price=100)
        project = model('shop', 'Project').objects.create(title='Keep project', slug='keep-project', product=product)
        free = model('shop', 'Project').objects.create(title='Free project', slug='free-project')
        guide = model('shop', 'ProjectGuide').objects.create(title='Keep guide', slug='keep-guide', access_type='paid', product=product)
        for owner in ({'project': project}, {'project': free}, {'guide': guide}):
            model('shop', 'DigitalAsset').objects.create(**owner, file='retained.pdf', label='File')
        model('shop', 'DigitalAsset').objects.create(product=product, file='retired.pdf', label='Retired file')
        asset = model('shop', 'DigitalAsset').objects.get(project=free)
        model('shop', 'DownloadEvent').objects.create(asset=asset, source='project')
        purge = import_module('apps.shop.migrations.0008_remove_store_data').remove_store_data
        purge(self.old_apps, SimpleNamespace(connection=connection))
        MigrationExecutor(connection).migrate([self.new])
        from . import access
        from .models import DigitalAsset, DownloadEvent, Project, ProjectGuide
        self.assertEqual(Project.objects.count(), 2)
        self.assertEqual(ProjectGuide.objects.count(), 1)
        self.assertEqual(DigitalAsset.objects.count(), 3)
        self.assertEqual(DownloadEvent.objects.count(), 1)
        self.assertTrue(Project.objects.get(pk=project.pk).files_restricted)
        self.assertFalse(access.project_access(None, Project.objects.get(pk=project.pk)))
        self.assertTrue(access.project_access(None, Project.objects.get(pk=free.pk)))
        self.assertEqual(ProjectGuide.objects.get(pk=guide.pk).access_type, 'restricted')
        self.assertFalse(access.guide_access(None, ProjectGuide.objects.get(pk=guide.pk)))
        for app, name in [('accounts', 'User'), ('enrollments', 'Enrollment'), ('payments', 'Order')]:
            self.assertEqual(apps.get_model(app, name).objects.count(), 1)
        migration = import_module('apps.shop.migrations.0009_remove_retired_store_schema')
        tables = set(connection.introspection.table_names())
        self.assertFalse({'shop_' + name.lower() for name in migration.RETIRED_MODELS} & tables)
        # Schema reversal restores empty legacy tables without losing retained content.
        MigrationExecutor(connection).migrate([self.old])
        old_guide = self.old_apps.get_model('shop', 'ProjectGuide').objects.get(pk=guide.pk)
        self.assertEqual(old_guide.access_type, 'paid')
        self.assertEqual(self.old_apps.get_model('shop', 'Product').objects.count(), 0)
        self.assertEqual(self.old_apps.get_model('shop', 'DigitalAsset').objects.count(), 3)

    def test_unexpected_store_records_stop_cleanup_before_any_schema_changes(self):
        product = self.old_apps.get_model('shop', 'Product').objects.create(title='Unexpected', slug='unexpected', sku='NEW')
        try:
            with self.assertRaisesMessage(RuntimeError, 'unexpected records in Product'):
                MigrationExecutor(connection).migrate([self.new])
            self.assertIn('shop_product', connection.introspection.table_names())
            self.assertTrue(self.old_apps.get_model('shop', 'Product').objects.filter(pk=product.pk).exists())
        finally:
            product.delete()
