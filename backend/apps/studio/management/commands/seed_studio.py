from django.core.management.base import BaseCommand
from apps.studio.content import PROBLEMS, PATTERNS
from apps.studio.models import Problem, StudioSettings, KnowledgeDocument
from apps.studio.knowledge import index_document
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Add independently authored Studio content; never overwrite existing staff edits.'

    def handle(self, *args, **options):
        count = 0
        for record in PROBLEMS:
            _, created = Problem.objects.get_or_create(slug=record['slug'], defaults={k: v for k, v in record.items() if k != 'slug'})
            count += created
        StudioSettings.objects.get_or_create(name='default')
        for title, body in PATTERNS:
            document, created = KnowledgeDocument.objects.get_or_create(slug='pattern-' + slugify(title), defaults={'title': title, 'body': body, 'topic': title, 'source': 'Coding Hubs original pattern guide', 'license': 'Original Coding Hubs educational content', 'approved': True})
            if created or (document.approved and not document.chunks.exists()):
                index_document(document)
        self.stdout.write(self.style.SUCCESS(f'Added {count} problems/scenarios. Existing records preserved.'))
