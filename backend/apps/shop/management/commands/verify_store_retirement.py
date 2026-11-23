"""Read-only deployment check: retired Store tables are gone, resources remain."""
import json
from importlib import import_module

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from apps.shop.migrations import __name__ as _migration_package


class Command(BaseCommand):
    help = 'Verify removal of retired Store tables and report aggregate counts for retained domains.'

    def add_arguments(self, parser):
        parser.add_argument('--baseline-json', default='{}', help='Pre-migration counts for retained domains; none may decrease.')

    def handle(self, **options):
        migration = import_module(_migration_package + '.0009_remove_retired_store_schema')
        retired = {'shop_' + name.lower() for name in migration.RETIRED_MODELS}
        retired |= {'shop_product_related_products', 'shop_coupon_eligible_products', 'shop_coupon_eligible_categories'}
        remaining = retired & set(connection.introspection.table_names())
        if remaining:
            raise CommandError('Retired Store tables still exist: ' + ', '.join(sorted(remaining)))
        retained = [('accounts', 'User'), ('courses', 'Course'), ('enrollments', 'Enrollment'),
                    ('payments', 'Order'), ('shop', 'Project'), ('shop', 'ProjectGuide'), ('shop', 'DigitalAsset')]
        counts = {app + '.' + model: apps.get_model(app, model).objects.count() for app, model in retained}
        try:
            baseline = json.loads(options['baseline_json'])
            if not isinstance(baseline, dict) or any(key not in counts or not isinstance(value, int) or value < 0 for key, value in baseline.items()):
                raise ValueError('Invalid retained-record baseline')
        except (ValueError, TypeError) as exc:
            raise CommandError('Invalid retained-record baseline') from exc
        decreased = {key: {'before': value, 'after': counts[key]} for key, value in baseline.items() if counts[key] < value}
        if decreased:
            raise CommandError('Retained record counts decreased: ' + json.dumps(decreased, sort_keys=True))
        self.stdout.write(json.dumps({'retired_store_tables_remaining': 0, 'retained_record_counts': counts}, sort_keys=True))
