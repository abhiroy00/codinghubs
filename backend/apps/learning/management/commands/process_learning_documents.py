import subprocess
import sys
import time
from django.core.management.base import BaseCommand
from apps.learning.models import ReferenceDocument


class Command(BaseCommand):
    help = 'Dedicated document worker. Run with container CPU/memory limits; isolates each extraction with a timeout.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true')
        parser.add_argument('--ocr', action='store_true')

    def handle(self, *args, **options):
        while True:
            ids = list(ReferenceDocument.objects.filter(status='QUEUED').values_list('pk', flat=True)[:10])
            for pk in ids:
                command = [sys.executable, 'manage.py', 'extract_learning_documents', '--id', str(pk)]
                if options['ocr']:
                    command.append('--ocr')
                try:
                    result = subprocess.run(command, timeout=90, capture_output=True, text=True)
                    if result.returncode:
                        ReferenceDocument.objects.filter(pk=pk, status__in=['QUEUED', 'PROCESSING']).update(status='FAILED', error='Extraction process failed. Review the reference and retry offline.')
                    self.stdout.write(f'Processed document {pk}.')
                except subprocess.TimeoutExpired:
                    ReferenceDocument.objects.filter(pk=pk, status='PROCESSING').update(status='FAILED', error='Extraction exceeded the 90-second worker limit.')
            if options['once']:
                return
            time.sleep(10)
