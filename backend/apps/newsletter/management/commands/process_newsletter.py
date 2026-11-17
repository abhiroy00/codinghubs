import time
from django.core.management.base import BaseCommand, CommandError
from apps.newsletter.services import process_batch


class Command(BaseCommand):
    help = 'Process durable newsletter outbox. Mail must be explicitly enabled and configured.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=50)
        parser.add_argument('--watch', action='store_true')

    def handle(self, *args, **options):
        if not 1 <= options['limit'] <= 500:
            raise CommandError('limit must be 1–500')
        while True:
            try:
                count = process_batch(options['limit'])
            except RuntimeError as error:
                raise CommandError(str(error)) from error
            self.stdout.write(f'Processed {count} queued deliveries.')
            if not options['watch']:
                return
            time.sleep(5)
