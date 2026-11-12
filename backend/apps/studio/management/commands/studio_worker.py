import time
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.studio.models import Submission, Event
from apps.studio.runner import run_submission


class Command(BaseCommand):
    help = 'Run ONLY on a dedicated sandbox host. Never attach Docker to the web service.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Drain the current queue and exit.')

    def handle(self, *args, **options):
        if not settings.STUDIO_EXECUTION_ENABLED:
            raise CommandError('Set STUDIO_EXECUTION_ENABLED=True on the web service and dedicated runner.')
        while True:
            cutoff = timezone.now()-timedelta(minutes=20)
            Submission.objects.filter(status='running', claimed_at__lt=cutoff).update(status='error', results=[{'status': 'worker_interrupted', 'passed': None, 'hidden': True}], finished_at=timezone.now())
            candidate = Submission.objects.filter(status='queued').order_by('created_at').first()
            if candidate is None:
                if options['once']:
                    return
                time.sleep(1)
                continue
            claimed = Submission.objects.filter(pk=candidate.pk, status='queued').update(status='running', claimed_at=timezone.now())
            if not claimed:
                continue
            try:
                results = run_submission(candidate)
                failed = any(r['status'] == 'infrastructure_error' for r in results)
                Submission.objects.filter(pk=candidate.pk).update(status='error' if failed else 'finished', results=results, finished_at=timezone.now())
                Event.objects.create(session=candidate.session, action='execution_finished', data={'submission': str(candidate.pk), 'infrastructure_error': failed})
            except Exception:
                Submission.objects.filter(pk=candidate.pk).update(status='error', results=[{'status': 'worker_error', 'passed': None, 'hidden': True}], finished_at=timezone.now())
                self.stderr.write('Runner job failed; code and test data omitted from logs.')
