from django.core.management.base import BaseCommand, CommandError

from apps.content import search_console


class Command(BaseCommand):
    help = 'Refresh Google Search Console clicks/impressions and index status for published blog posts.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=60, help='How many posts to inspect (daily quota: 2,000 per property).')

    def handle(self, *args, limit, **options):
        if not search_console.is_configured():
            raise CommandError('Set GSC_SERVICE_ACCOUNT_B64 (or GSC_SERVICE_ACCOUNT_JSON) first.')
        self.stdout.write(str(search_console.sync_blogs(limit=limit)))
