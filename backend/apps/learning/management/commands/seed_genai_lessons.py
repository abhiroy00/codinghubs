from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.learning.content_library import library_slugs, load_lesson
from apps.learning.models import Concept, empty_content


class Command(BaseCommand):
    help = 'Install verified source lessons as In Review. Never overwrite editorial work or publish.'

    def add_arguments(self, parser):
        parser.add_argument('--slug', choices=library_slugs(), action='append', help='Install selected lessons; default is the complete curated source library.')

    @transaction.atomic
    def handle(self, *args, **options):
        selected = options.get('slug') or library_slugs()
        loaded = [load_lesson(slug) for slug in selected]  # validate the batch before writing
        call_command('seed_genai', stdout=self.stdout)
        for metadata, content in loaded:
            lesson = Concept.objects.select_for_update().get(slug=metadata['slug'])
            if (lesson.status != 'not_started' or lesson.version or lesson.edit_version
                    or lesson.content != empty_content() or lesson.outcomes or lesson.references
                    or lesson.seo_description or lesson.reviewed_by_id or lesson.code_verified):
                self.stdout.write(f'Skipped {lesson.slug}: existing editorial work preserved.')
                continue
            prerequisites = list(Concept.objects.filter(slug__in=metadata['prerequisites']))
            if len(prerequisites) != len(metadata['prerequisites']):
                raise CommandError(f'Missing prerequisites for {lesson.slug}')
            lesson.content, lesson.status = content, 'in_review'
            for field in ('difficulty', 'outcomes', 'references', 'seo_description'):
                setattr(lesson, field, metadata[field])
            lesson.full_clean()
            lesson.save()
            lesson.prerequisites.set(prerequisites)
            self.stdout.write(self.style.SUCCESS(f'Installed {lesson.slug} as In Review. No publication performed.'))
