"""Read-only reports. Output is private, ignored artifacts, never a public API or CMS write."""
import json
from datetime import date, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.content import search_console as gsc


class Command(BaseCommand):
    help = 'Export authorized GSC daily comparisons and optional recent hourly data without changing content.'

    def add_arguments(self, parser):
        parser.add_argument('--output', default='../artifacts/seo-growth/private-gsc.json')
        parser.add_argument('--as-of', type=date.fromisoformat, help='Search Console reporting date (YYYY-MM-DD).')
        parser.add_argument('--recent-hours', action='store_true', help='Also request recent hourly rows; fresh hours can be incomplete.')

    def handle(self, *args, **options):
        if not gsc.is_configured():
            raise CommandError('GSC is not configured. No metrics were invented or network requests made. Configure the existing read-only service account first.')
        destination = Path(options['output']).resolve()
        # The source repository exports are deliberately kept separate from public deliverable CSVs.
        if 'artifacts' not in destination.parts:
            raise CommandError('Use a private path under artifacts/; do not commit raw search exports.')
        session = gsc._session()
        windows = gsc.report_windows(options['as_of'])
        result = {'generated_at': timezone.now().isoformat(), 'property': gsc.property_url(), 'data_state': 'final',
                  'limitations': 'Daily dates are inclusive, use Pacific reporting dates, and lag by two days. Query rows are privacy-filtered and top-row-limited, not complete property totals. Missing rows are not proof of zero traffic or non-indexing.',
                  'periods': {}}
        dimensions = [[], ['date'], ['query'], ['page'], ['query', 'page'], ['country'], ['device'], ['searchAppearance']]
        for name, (start, end) in windows.items():
            period = {'start': str(start), 'end': str(end), 'breakdowns': {}}
            for group in dimensions:
                period['breakdowns'][','.join(group) or 'property_totals'] = gsc.query_rows(session, start, end, group)
            result['periods'][name] = period
        if options['recent_hours']:
            today = options['as_of'] or date.fromisoformat(result['periods']['28d']['end']) + timedelta(days=2)
            result['recent_hours'] = gsc.query_rows(session, today - timedelta(days=1), today, ['hour'], data_state='hourly_all')
            result['recent_hours']['limitation'] = 'A two-calendar-day hourly export, not an asserted rolling 24-hour total; filter exact timezone-aware hours before comparing.'
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(result, indent=2), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'Private read-only report written: {destination}'))
