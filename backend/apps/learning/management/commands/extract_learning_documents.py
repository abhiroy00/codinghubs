"""Run in a dedicated, resource-limited worker, never from the web request process."""
from django.core.management.base import BaseCommand, CommandError
from apps.learning.models import ReferenceDocument
from apps.learning.pdf_extraction import extract_document


class Command(BaseCommand):
    help = 'Extract one queued private PDF offline. Leaves every extraction unverified and unpublished.'

    def add_arguments(self, parser):
        parser.add_argument('--id', type=int, required=True)
        parser.add_argument('--ocr', action='store_true', help='Use installed pdftoppm and Tesseract on low-text pages.')

    def handle(self, *args, **options):
        try:
            status = extract_document(options['id'], ocr=options['ocr'])
        except ReferenceDocument.DoesNotExist:
            raise CommandError('Reference document not found.')
        self.stdout.write(f'Document {options["id"]}: {status}. Nothing was published or marked technically verified.')
