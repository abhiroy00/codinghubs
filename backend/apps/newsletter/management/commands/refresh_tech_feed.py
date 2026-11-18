import time
from django.core.management.base import BaseCommand
from apps.newsletter import feeds


class Command(BaseCommand):
    help = 'Fetch the allowlisted technology feeds now (optionally on an interval) and report each source.'

    def add_arguments(self, parser):
        parser.add_argument('--watch', action='store_true', help='Keep refreshing every --interval seconds.')
        parser.add_argument('--interval', type=int, default=1800)

    def handle(self, *args, watch=False, interval=1800, **options):
        while True:
            data = feeds.refresh()
            for key, state in data['sources'].items():
                status = 'ok' if state.get('ok') else f"FAILED ({state.get('error')}); kept {len(state.get('items', []))} previous items"
                self.stdout.write(f"{key}: {len(state.get('items', []))} items, {status}")
            self.stdout.write(self.style.SUCCESS(f"{len(data['items'])} items after filtering and de-duplication"))
            if not watch:
                return
            time.sleep(max(300, interval))
