from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.courses.models import CourseBrochure
from apps.shop.storage import private_storage


class Command(BaseCommand):
    help = 'List orphan brochure files older than 24 hours; pass --apply to delete them.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        referenced = set(CourseBrochure.objects.values_list('storage_key', flat=True))
        try:
            _, files = private_storage.listdir('brochures')
        except FileNotFoundError:
            return
        for name in files:
            key = 'brochures/' + name
            if key not in referenced and private_storage.get_modified_time(key) < timezone.now() - timedelta(days=1):
                self.stdout.write(('Removing ' if options['apply'] else 'Orphan ') + key)
                if options['apply']:
                    private_storage.delete(key)
