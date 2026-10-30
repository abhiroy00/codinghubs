from django.core.management.base import BaseCommand
from django.db import transaction

from apps.courses.course_catalog import COURSES, TRACK_TOPICS
from apps.courses.models import CourseQuestion

TRACK_OVERVIEW = {
    'ai': 'language-model and AI application',
    'development': 'software application',
    'data': 'data analysis and modeling',
    'cloud': 'cloud architecture and operations',
    'security': 'security engineering and risk',
    'design': 'user experience and interface design',
    'marketing': 'digital marketing and campaign measurement',
    'program': 'project delivery and collaboration',
}

CODE_EXAMPLES = {
    'ai': {
        'prompt': 'Write a Python validator for a model-generated dictionary. Allow only name and status fields, require a non-empty name, and return a clear validation result.',
        'solution': "ALLOWED = {'name', 'status'}\n\ndef validate_output(payload):\n    if not isinstance(payload, dict) or set(payload) - ALLOWED:\n        return False\n    return isinstance(payload.get('name'), str) and bool(payload['name'].strip())\n\nassert validate_output({'name': 'Ada', 'status': 'ready'})\nassert not validate_output({'name': '', 'admin': True})",
    },
    'development': {
        'prompt': 'Write a Python helper that normalizes an email by trimming whitespace and lowercasing it, and rejects a value without exactly one @ and non-empty parts.',
        'solution': "def normalize_email(value):\n    if not isinstance(value, str):\n        return None\n    email = value.strip().lower()\n    if email.count('@') != 1:\n        return None\n    local, domain = email.split('@')\n    return email if local and domain else None\n\nassert normalize_email(' Ada@Example.com ') == 'ada@example.com'\nassert normalize_email('missing-at-sign') is None",
    },
    'data': {
        'prompt': 'Given a pandas DataFrame with category and amount columns, calculate total amount by category and return stable ascending category order.',
        'solution': "def totals_by_category(df):\n    result = (df.dropna(subset=['category', 'amount'])\n                .groupby('category', as_index=False)['amount']\n                .sum())\n    return result.sort_values('category', kind='stable')\n\n# Check empty input, a missing category and multiple rows in one group.",
    },
    'security': {
        'prompt': 'Write a Python helper that detects whether a log event has a required timestamp, severity and event_id before it is added to an incident report.',
        'solution': "REQUIRED = ('timestamp', 'severity', 'event_id')\n\ndef is_reportable(event):\n    return isinstance(event, dict) and all(\n        isinstance(event.get(field), str) and event[field].strip()\n        for field in REQUIRED\n    )\n\nassert is_reportable({'timestamp':'2026-01-01T00:00Z','severity':'high','event_id':'e-1'})\nassert not is_reportable({'severity':'high'})",
    },
}


def question_content(course_name, focus, track, level, index, topic_row):
    topic, definition, applied, advanced, example = topic_row
    overview = TRACK_OVERVIEW[track]
    if level == CourseQuestion.LEVEL_BASIC:
        question = f'What is {topic}, and where does it matter in {course_name}?'
        answer = f'{definition} In {course_name}, it supports a {focus} workflow by making assumptions and expected behavior explicit.'
        explanation = f'This foundation matters because {focus} work must be repeatable and verifiable. {example}'
    elif level == CourseQuestion.LEVEL_INTERMEDIATE:
        question = f'How would you apply {topic} to this {course_name} situation: {example}'
        answer = f'{applied} For this {overview} task, first define the expected outcome, then validate the result against representative and boundary cases.'
        explanation = f'The answer should connect the topic to a concrete decision. For {focus}, include the relevant evidence, constraints and failure handling rather than naming a tool alone.'
    else:
        question = f'Advanced scenario for {course_name}: {advanced} What would you test and what trade-off would you explain?'
        answer = f'Bound the failure mode, identify affected users and data, and compare a safe fallback with the preferred approach. {applied} Record the decision and verify the recovery path.'
        explanation = f'Advanced interviews look for system-level reasoning. In {focus}, discuss how the choice affects quality, security, reliability and maintainability, then describe evidence that could disprove your assumption.'

    coding_prompt = ''
    coding_solution = ''
    if track in CODE_EXAMPLES and level != CourseQuestion.LEVEL_BASIC and index in (1, 5, 8):
        coding_prompt = CODE_EXAMPLES[track]['prompt']
        coding_solution = CODE_EXAMPLES[track]['solution']
    return {
        'question': question,
        'answer': answer,
        'explanation': explanation,
        'example': example,
        'coding_prompt': coding_prompt,
        'coding_solution': coding_solution,
    }


class Command(BaseCommand):
    help = 'Preload an idempotent, course-specific Basic/Intermediate/Advanced interview question bank.'

    @transaction.atomic
    def handle(self, *args, **options):
        if CourseQuestion.objects.exists():
            self.stdout.write(self.style.SUCCESS(
                f'Question bank already has {CourseQuestion.objects.count()} records; preserving admin edits and deletions.'
            ))
            return
        created = 0
        for slug, course_name, track in COURSES:
            for level_slug, _label in CourseQuestion.LEVEL_CHOICES:
                for index, topic_row in enumerate(TRACK_TOPICS[track], start=1):
                    seed_key = f'{level_slug}-{index:02d}'
                    content = question_content(course_name, topic_row[0], track, level_slug, index, topic_row)
                    _question, was_created = CourseQuestion.objects.get_or_create(
                        course_slug=slug,
                        seed_key=seed_key,
                        defaults={
                            'course_name': course_name,
                            'level': level_slug,
                            'topic': topic_row[0],
                            'is_published': True,
                            **content,
                        },
                    )
                    created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f'Question bank ready: {CourseQuestion.objects.count()} total; {created} new; {len(COURSES)} course tracks.'
        ))
