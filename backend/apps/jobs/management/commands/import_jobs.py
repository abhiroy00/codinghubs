import time
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.jobs.importers import FETCHERS, _session, is_relevant, to_job_fields
from apps.jobs.models import Job


class Command(BaseCommand):
    help = ('Import the latest tech jobs and internships (India or remote) from official job APIs and company career-page '
            'feeds, then expire listings that have gone. Safe to run repeatedly: listings are de-duplicated by source ID.')

    def add_arguments(self, parser):
        parser.add_argument('--watch', action='store_true', help='Keep importing every --interval seconds.')
        parser.add_argument('--interval', type=int, default=12 * 3600, help='Seconds between runs with --watch (default 12 hours).')
        parser.add_argument('--source', action='append', choices=sorted(FETCHERS), help='Only these sources (repeatable).')
        parser.add_argument('--dry-run', action='store_true', help='Fetch and report, but save nothing.')

    def handle(self, *args, watch=False, interval=43200, source=None, dry_run=False, **options):
        while True:
            self.run_once(source or [s.strip() for s in settings.JOBS_SOURCES if s.strip() in FETCHERS], dry_run)
            if not watch:
                return
            time.sleep(max(3600, interval))

    def run_once(self, sources, dry_run):
        now = timezone.now()
        session = _session()
        ok_sources = []
        totals = {'new': 0, 'seen': 0}
        for name in sources:
            try:
                listings = [item for item in (FETCHERS[name](session) or []) if is_relevant(item)]
            except Exception as error:  # one failing source must never stop the others
                self.stdout.write(self.style.WARNING(f'{name}: FAILED ({error.__class__.__name__}: {str(error)[:160]}); kept existing listings'))
                continue
            ok_sources.append(name)
            # Newest first; keep a bounded number per source so the jobs page stays light.
            listings.sort(key=lambda item: item.posted or now, reverse=True)
            unique, per_company = {}, {}
            for item in listings:
                if item.external_id in unique:
                    continue
                company = (item.company or '').lower()
                if per_company.get(company, 0) >= settings.JOBS_MAX_PER_COMPANY:
                    continue
                per_company[company] = per_company.get(company, 0) + 1
                unique[item.external_id] = item
            listings = list(unique.values())[: settings.JOBS_MAX_PER_SOURCE]
            new = seen = 0
            for item in listings:
                existing = Job.objects.filter(source=name, external_id=item.external_id).first()
                if existing:
                    seen += 1
                    if not dry_run:
                        Job.objects.filter(pk=existing.pk).update(last_seen_at=now)
                    continue
                new += 1
                if dry_run:
                    continue
                fields = to_job_fields(item)
                with transaction.atomic():
                    Job.objects.create(
                        source=name, external_id=item.external_id, last_seen_at=now,
                        is_published=settings.JOBS_AUTO_PUBLISH, published_at=min(item.posted or now, now) if settings.JOBS_AUTO_PUBLISH else None,
                        **fields,
                    )
            totals['new'] += new
            totals['seen'] += seen
            self.stdout.write(f'{name}: {len(listings)} matching, {new} new, {seen} already listed')
        expired = 0 if dry_run else self.expire(now, ok_sources)
        prefix = '[dry run] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(f"{prefix}{totals['new']} new jobs, {totals['seen']} refreshed, {expired} expired"))

    def expire(self, now, ok_sources):
        imported = Job.objects.exclude(source=Job.SOURCE_MANUAL).filter(is_expired=False)
        # Gone from a source that answered successfully this run (a failing source never expires its listings).
        stale = imported.filter(source__in=ok_sources, last_seen_at__lt=now - timedelta(days=settings.JOBS_STALE_DAYS))
        old = imported.filter(published_at__lt=now - timedelta(days=settings.JOBS_MAX_AGE_DAYS))
        count = stale.update(is_expired=True) + old.update(is_expired=True)
        # Hard cap on open imported listings: expire the oldest beyond it.
        open_ids = list(Job.open_listings().exclude(source=Job.SOURCE_MANUAL).values_list('pk', flat=True))
        if len(open_ids) > settings.JOBS_MAX_OPEN_IMPORTED:
            count += Job.objects.filter(pk__in=open_ids[settings.JOBS_MAX_OPEN_IMPORTED:]).update(is_expired=True)
        return count
