from django.core.management.base import BaseCommand
from django.db import transaction

from apps.courses.models import PrepCurriculum, PrepLesson
from apps.courses.prep_schema import LessonError, validate_lesson

from .validate_prep_content import CONTENT_DIR, load_curriculum

LESSON_HEADER = ('day', 'title', 'module', 'level')


class Command(BaseCommand):
    help = 'Load the 30-day interview-prep curricula from prep_content/ (lessons edited in the admin panel are kept).'

    @transaction.atomic
    def handle(self, *args, **options):
        created = updated = kept = skipped = 0
        for folder in sorted(p for p in CONTENT_DIR.iterdir() if p.is_dir() and (p / '_meta.json').exists()):
            meta, lessons = load_curriculum(folder)
            curriculum, _ = PrepCurriculum.objects.get_or_create(slug=meta['curriculum'], defaults={'title': meta['title']})
            curriculum.title = meta['title']
            curriculum.summary = meta.get('summary', '')
            curriculum.source = meta.get('source', '')
            curriculum.course_slugs = meta.get('courses', [])
            curriculum.save()
            for day, path, lesson in lessons:
                try:
                    validate_lesson(lesson, day)
                except LessonError as error:
                    self.stderr.write(f'Skipped {folder.name}/{path.name}: {error}')
                    skipped += 1
                    continue
                values = {
                    'title': lesson['title'], 'module': lesson['module'], 'level': lesson['level'],
                    'content': {k: v for k, v in lesson.items() if k not in LESSON_HEADER},
                }
                existing = PrepLesson.objects.filter(curriculum=curriculum, day=day).first()
                if existing is None:
                    PrepLesson.objects.create(curriculum=curriculum, day=day, **values)
                    created += 1
                elif existing.edited_in_admin:
                    kept += 1
                elif any(getattr(existing, k) != v for k, v in values.items()):
                    for k, v in values.items():
                        setattr(existing, k, v)
                    existing.save()
                    updated += 1
        self.stdout.write(self.style.SUCCESS(
            f'Prep content: {created} created, {updated} updated, {kept} kept (edited in admin), {skipped} skipped.'
        ))
