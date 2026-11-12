import json
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from apps.learning.content_library import library_slugs, load_lesson
from apps.learning.management.commands.seed_genai_pilot import pilot_content
from apps.learning.quality import PARTS, question_keys


class Command(BaseCommand):
    help = 'Validate curated lesson depth, schema, source examples and exact question uniqueness. Does not execute code.'

    def add_arguments(self, parser):
        parser.add_argument('--json', action='store_true')

    def handle(self, *args, **options):
        seen, report, failures = {}, [], []
        sources = [('08-cosine-similarity', pilot_content)] + [(slug, lambda s=slug: load_lesson(s)[1]) for slug in library_slugs()]
        for slug, loader in sources:
            try:
                content = loader()
                duplicates = [seen[q] for q in question_keys(content) if q in seen]
                if duplicates:
                    raise ValidationError(f'Questions duplicate other lessons: {sorted(set(duplicates))}')
                seen.update({q: slug for q in question_keys(content)})
                words = {p: sum(len(b['body'].split()) for b in content[p]['blocks'] if b['type'] == 'text') for p in PARTS}
                report.append({'slug': slug, 'words': words, 'total_prose_words': sum(words.values()),
                               'assessment_items': len(question_keys(content)), 'status': 'structural_checks_passed'})
            except (ValidationError, ValueError, KeyError, OSError) as error:
                failures.append({'slug': slug, 'error': str(error)})
        result = {'lessons': report, 'failures': failures, 'code_execution': 'not_performed', 'editorial_review': 'still_required'}
        if options['json']:
            self.stdout.write(json.dumps(result, indent=2))
        else:
            for row in report:
                self.stdout.write(f'{row["slug"]}: {row["total_prose_words"]} prose words; {row["assessment_items"]} unique assessment items.')
            for failure in failures:
                self.stderr.write(f'{failure["slug"]}: {failure["error"]}')
        if failures:
            raise CommandError(f'{len(failures)} lesson(s) failed validation.')
