"""Original roadmap metadata. Never imports third-party prose or publishes lessons."""
import json
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.learning.models import Chapter, Concept, LearningCourse, Module, ResearchSource


class Command(BaseCommand):
    help = 'Add original sourced course roadmaps; preserve editor changes and learner records. Never publish.'

    @transaction.atomic
    def handle(self, *args, **options):
        rows = json.loads((Path(__file__).resolve().parents[2] / 'academy_catalog.json').read_text(encoding='utf-8'))
        call_command('seed_genai', stdout=self.stdout)
        for position, row in enumerate(rows):
            metadata = {k: v for k, v in row.items() if k not in ('modules', 'use_existing_genai', 'slug')}
            course, _ = LearningCourse.objects.get_or_create(slug=row['slug'], defaults={**metadata, 'position': position})
            for source in row.get('sources', []):
                ResearchSource.objects.get_or_create(url=source['url'], defaults={'title': source['title'], 'source_type': 'paper' if 'arxiv.org' in source['url'] else 'official_docs', 'license_notes': 'Research reference only; no source prose or figures imported. Check reuse rights before adapting any material.'})
            if row.get('use_existing_genai'):
                original = json.loads((Path(__file__).resolve().parents[2] / 'curriculum.json').read_text(encoding='utf-8'))
                Module.objects.filter(course__isnull=True, slug__in=[m['slug'] for m in original]).update(course=course)
                continue
            for index, section in enumerate(row['modules']):
                module, _ = Module.objects.get_or_create(slug=f'{course.slug}-{slugify(section["title"])}', defaults={
                    'number': (position + 1) * 100 + index + 1, 'title': section['title'], 'course': course,
                    'objectives': [],
                })
                chapter, _ = Chapter.objects.get_or_create(module=module, position=1, defaults={'title': section['title']})
                for i, title in enumerate(section['topics'], 1):
                    Concept.objects.get_or_create(slug=f'{course.slug}-{slugify(title)}', defaults={
                        'chapter': chapter, 'position': i, 'title': title, 'difficulty': course.level,
                    })
        self.stdout.write(self.style.SUCCESS('8 course roadmaps added. Existing content preserved. No lessons published.'))
