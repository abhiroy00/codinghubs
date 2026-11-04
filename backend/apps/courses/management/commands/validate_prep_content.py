import json
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.courses.prep_schema import LessonError, is_placeholder, normalize_output, run_program, validate_lesson

CONTENT_DIR = Path(__file__).resolve().parents[2] / 'prep_content'


def load_curriculum(folder):
    meta = json.loads((folder / '_meta.json').read_text(encoding='utf-8'))
    lessons = []
    for day in range(1, 31):
        path = folder / f'day-{day:02d}.json'
        if path.exists():
            lessons.append((day, path, json.loads(path.read_text(encoding='utf-8'))))
    return meta, lessons


class Command(BaseCommand):
    help = 'Validate interview-prep lesson files and run every coding solution against its tests.'

    def add_arguments(self, parser):
        parser.add_argument('curricula', nargs='*', help='Curriculum folder names (default: all)')
        parser.add_argument('--no-run', action='store_true', help='Skip running coding solutions')
        parser.add_argument('--partial', action='store_true', help='Do not require all 30 days')

    def handle(self, *args, curricula, no_run, partial, **options):
        folders = [CONTENT_DIR / name for name in curricula] if curricula else sorted(p for p in CONTENT_DIR.iterdir() if p.is_dir())
        problems, unverified = [], []
        for folder in folders:
            if not (folder / '_meta.json').exists():
                problems.append(f'{folder.name}: missing _meta.json')
                continue
            meta, lessons = load_curriculum(folder)
            for field in ('curriculum', 'title', 'courses', 'source', 'summary'):
                if not meta.get(field):
                    problems.append(f'{folder.name}/_meta.json: missing {field}')
            if not partial and len(lessons) != 30:
                missing = sorted(set(range(1, 31)) - {day for day, _, _ in lessons})
                problems.append(f'{folder.name}: missing days {missing}')
            titles = Counter(lesson.get('title', '').strip().lower() for _, _, lesson in lessons)
            problems += [f'{folder.name}: duplicate title "{t}"' for t, n in titles.items() if n > 1]
            questions = Counter()
            answers = Counter()
            for day, path, lesson in lessons:
                where = f'{folder.name}/{path.name}'
                try:
                    validate_lesson(lesson, day, meta.get('answer_standard', 1))
                except LessonError as error:
                    problems.append(f'{where}: {error}')
                    continue
                for q in lesson['quiz']:
                    questions[q['question'].strip().lower()] += 1
                    answers[q['answer']] += 1
                practice = lesson['practice']
                if practice['kind'] != 'coding' or no_run:
                    continue
                for i, test in enumerate(practice['tests']):
                    result = run_program(practice['language'], practice['solution'], test['input'])
                    if result is None:
                        unverified.append(f'{where} ({practice["language"]})')
                        break
                    stdout, error = result
                    if error or normalize_output(stdout) != normalize_output(test['output']):
                        problems.append(f'{where}: test {i + 1} failed\n  expected: {test["output"]!r}\n  got: {stdout!r}\n  error: {error[-400:]}')
                if result is not None:
                    stdout, error = run_program(practice['language'], practice['solution'], practice['example']['input'])
                    if error or normalize_output(stdout) != normalize_output(practice['example']['output']):
                        problems.append(f'{where}: example output does not match the solution (got {stdout!r})')
            problems += [f'{folder.name}: quiz question repeated: "{q[:70]}"' for q, n in questions.items() if n > 1]
            if lessons and max(answers.values(), default=0) > 0.5 * sum(answers.values()):
                problems.append(f'{folder.name}: quiz answers are not spread across options {dict(answers)}')
            filler = [day for day, _, lesson in lessons if is_placeholder(lesson)]
            self.stdout.write(f'{folder.name}: {len(lessons)} lessons checked')
            if filler:
                self.stdout.write(self.style.WARNING(f'{folder.name}: {len(filler)} of {len(lessons)} lessons are template placeholders, not real content (days {filler[0]}–{filler[-1]})'))
        for item in unverified:
            self.stdout.write(self.style.WARNING(f'not run locally: {item}'))
        if problems:
            for problem in problems:
                self.stdout.write(self.style.ERROR(problem))
            raise CommandError(f'{len(problems)} problem(s) found')
        self.stdout.write(self.style.SUCCESS('All lesson files are valid.'))
