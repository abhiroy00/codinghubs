import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.learning.models import Chapter, Concept, Module


class Command(BaseCommand):
    help = 'Add missing curriculum entries without overwriting existing editorial content or learner data.'

    def add_arguments(self, parser):
        parser.add_argument('--refresh-structure', action='store_true', help='Replace only recognized generated module/chapter labels and objectives. Preserve custom edits and all lessons.')

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads((Path(__file__).resolve().parents[2] / 'curriculum.json').read_text(encoding='utf-8'))
        dependencies = {}
        for m in data:
            module, _ = Module.objects.get_or_create(slug=m['slug'], defaults={k: m[k] for k in ('number', 'title', 'objectives')})
            if options.get('refresh_structure'):
                legacy_title = m['title'].title()
                legacy_objectives = [f'Explain and implement {c["title"].lower()} with explicit assumptions and tests.' for ch in m['chapters'] for c in ch['concepts']]
                changed = []
                if module.title == legacy_title:
                    module.title = m['title']
                    changed.append('title')
                if module.objectives == legacy_objectives:
                    module.objectives = m['objectives']
                    changed.append('objectives')
                if changed:
                    module.save(update_fields=changed)
            for i, ch in enumerate(m['chapters'], 1):
                chapter, _ = Chapter.objects.get_or_create(module=module, position=i, defaults={'title': ch['title']})
                if options.get('refresh_structure') and chapter.title in {f'{m["title"].title()} {separator} {i}' for separator in ('?', '\u2014')}:
                    chapter.title = ch['title']
                    chapter.save(update_fields=['title'])
                for j, item in enumerate(ch['concepts'], 1):
                    concept, created = Concept.objects.get_or_create(slug=item['slug'], defaults={'chapter': chapter, 'position': j, 'title': item['title'], 'difficulty': 'beginner' if m['number'] <= 3 else 'intermediate' if m['number'] <= 12 else 'advanced'})
                    if created:
                        dependencies[concept.pk] = item['prerequisites']
        for pk, slugs in dependencies.items():
            Concept.objects.get(pk=pk).prerequisites.set(Concept.objects.filter(slug__in=slugs))
        self.stdout.write(self.style.SUCCESS('18-module curriculum seeded. Existing records preserved; new lessons are Not Started.'))
