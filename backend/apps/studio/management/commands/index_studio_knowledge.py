from django.core.management.base import BaseCommand, CommandError
from apps.studio.ai import ProviderUnavailable
from apps.studio.knowledge import index_document
from apps.studio.models import KnowledgeDocument


class Command(BaseCommand):
    help = 'Chunk approved sources; optionally build real embeddings with configured provider credentials.'

    def add_arguments(self, parser):
        parser.add_argument('--embed', action='store_true')
        parser.add_argument('--slug')

    def handle(self, *args, **options):
        docs = KnowledgeDocument.objects.filter(approved=True)
        if options['slug']:
            docs = docs.filter(slug=options['slug'])
        count = 0
        for document in docs:
            try:
                count += index_document(document, embed=options['embed'])
            except ProviderUnavailable as exc:
                raise CommandError(str(exc.detail)) from None
        self.stdout.write(self.style.SUCCESS(f'Indexed {count} chunks; mode: {"semantic" if options["embed"] else "keyword"}.'))
