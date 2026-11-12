from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.studio.models import Session, Usage


class Command(BaseCommand):
    help = 'Preview retention cleanup; --apply deletes expired private sessions and usage records.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=max(1, settings.STUDIO_RETENTION_DAYS))
        sessions = Session.objects.filter(started_at__lt=cutoff)
        usage = Usage.objects.filter(created_at__lt=cutoff)
        self.stdout.write(f'{sessions.count()} sessions and {usage.count()} usage records older than {cutoff.date()}.')
        if options['apply']:
            sessions.delete()  # Cascades transcripts, drafts, reports and submissions.
            usage.delete()
            self.stdout.write('Expired data deleted. User notebooks are retained until explicitly deleted.')
        else:
            self.stdout.write('Preview only. Use --apply after reviewing your retention policy.')
