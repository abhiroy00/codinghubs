"""Shape of a 30-day interview-prep lesson, shared by the seed command, the validator and the admin API."""
import os
import subprocess
import sys
import tempfile

LEVELS = ('Beginner', 'Intermediate', 'Advanced')
DIFFICULTIES = ('Basic', 'Intermediate', 'Advanced')
QUIZ_TYPES = ('concept', 'scenario', 'output', 'code')
# Languages the site's code runner can execute with stdin/stdout tests.
PRACTICE_LANGUAGES = ('python', 'javascript', 'java', 'csharp')


class LessonError(ValueError):
    pass


def _text(value, where, min_len=1):
    if not isinstance(value, str) or len(value.strip()) < min_len:
        raise LessonError(f'{where}: expected text of at least {min_len} characters')


def _texts(value, where, low, high, min_len=1):
    if not isinstance(value, list) or not low <= len(value) <= high:
        raise LessonError(f'{where}: expected a list of {low}–{high} items')
    for i, item in enumerate(value):
        _text(item, f'{where}[{i}]', min_len)


def _objects(value, where, low, high, fields, optional=()):
    if not isinstance(value, list) or not low <= len(value) <= high:
        raise LessonError(f'{where}: expected a list of {low}–{high} items')
    for i, item in enumerate(value):
        if not isinstance(item, dict):
            raise LessonError(f'{where}[{i}]: expected an object')
        unknown = set(item) - set(fields) - set(optional)
        if unknown:
            raise LessonError(f'{where}[{i}]: unknown fields {sorted(unknown)}')
        for field in fields:
            _text(item.get(field), f'{where}[{i}].{field}')


def _code(value, where):
    if value is None:
        return
    if not isinstance(value, dict) or set(value) != {'language', 'source'}:
        raise LessonError(f'{where}: expected {{"language", "source"}}')
    _text(value['language'], f'{where}.language')
    _text(value['source'], f'{where}.source')


def validate_lesson(lesson, day=None):
    """Raise LessonError if the lesson does not match the schema documented in prep_content/README.md."""
    if not isinstance(lesson, dict):
        raise LessonError('lesson: expected an object')
    expected = {'day', 'title', 'module', 'level', 'objectives', 'definition', 'theory', 'example', 'use_cases',
                'demonstration', 'takeaways', 'interview', 'practice', 'quiz'}
    if set(lesson) != expected:
        raise LessonError(f'lesson: missing {sorted(expected - set(lesson))}, unknown {sorted(set(lesson) - expected)}')
    if not isinstance(lesson['day'], int) or not 1 <= lesson['day'] <= 30 or (day is not None and lesson['day'] != day):
        raise LessonError(f'day: expected {day or "1–30"}')
    _text(lesson['title'], 'title', 4)
    _text(lesson['module'], 'module', 3)
    if lesson['level'] not in LEVELS:
        raise LessonError(f'level: one of {LEVELS}')
    _texts(lesson['objectives'], 'objectives', 3, 6, 10)
    _text(lesson['definition'], 'definition', 80)
    _objects(lesson['theory'], 'theory', 3, 7, ('heading', 'body'), ('points',))
    for i, section in enumerate(lesson['theory']):
        _text(section['body'], f'theory[{i}].body', 120)
        if 'points' in section:
            _texts(section['points'], f'theory[{i}].points', 2, 8)
    example = lesson['example']
    if not isinstance(example, dict) or not {'title', 'body'} <= set(example) <= {'title', 'body', 'code'}:
        raise LessonError('example: expected {title, body, code?}')
    _text(example['title'], 'example.title')
    _text(example['body'], 'example.body', 80)
    _code(example.get('code'), 'example.code')
    _objects(lesson['use_cases'], 'use_cases', 3, 6, ('title', 'description'))
    demo = lesson['demonstration']
    if not isinstance(demo, dict) or not {'description'} <= set(demo) <= {'description', 'code', 'output'}:
        raise LessonError('demonstration: expected {description, code?, output?}')
    _text(demo['description'], 'demonstration.description', 60)
    _code(demo.get('code'), 'demonstration.code')
    if 'output' in demo:
        _text(demo['output'], 'demonstration.output')
    _texts(lesson['takeaways'], 'takeaways', 4, 7, 15)
    _objects(lesson['interview'], 'interview', 4, 6, ('question', 'answer', 'explanation'))
    validate_practice(lesson['practice'])
    validate_quiz(lesson['quiz'])
    return lesson


def validate_practice(practice):
    if not isinstance(practice, dict):
        raise LessonError('practice: expected an object')
    kind = practice.get('kind')
    common = ('title', 'difficulty', 'objective', 'statement')
    if kind == 'coding':
        fields = {'kind', *common, 'language', 'input_format', 'output_format', 'example', 'constraints', 'starter', 'solution', 'explanation', 'tests'}
        if set(practice) != fields:
            raise LessonError(f'practice: missing {sorted(fields - set(practice))}, unknown {sorted(set(practice) - fields)}')
        if practice['language'] not in PRACTICE_LANGUAGES:
            raise LessonError(f'practice.language: one of {PRACTICE_LANGUAGES}')
        for field in ('input_format', 'output_format', 'starter', 'solution'):
            _text(practice[field], f'practice.{field}')
        if not isinstance(practice['example'], dict) or set(practice['example']) != {'input', 'output'}:
            raise LessonError('practice.example: expected {input, output}')
        _texts(practice['constraints'], 'practice.constraints', 1, 6)
        _texts(practice['explanation'], 'practice.explanation', 2, 8)
        _objects(practice['tests'], 'practice.tests', 3, 6, (), ('input', 'output'))
        for i, test in enumerate(practice['tests']):
            if set(test) != {'input', 'output'} or not all(isinstance(test[k], str) for k in test) or not test['output'].strip():
                raise LessonError(f'practice.tests[{i}]: expected {{input, output}} strings with non-empty output')
    elif kind == 'exercise':
        fields = {'kind', *common, 'deliverable', 'steps', 'checklist', 'sample_answer'}
        if set(practice) != fields:
            raise LessonError(f'practice: missing {sorted(fields - set(practice))}, unknown {sorted(set(practice) - fields)}')
        _text(practice['deliverable'], 'practice.deliverable')
        _texts(practice['steps'], 'practice.steps', 3, 8)
        _texts(practice['checklist'], 'practice.checklist', 3, 6)
        _text(practice['sample_answer'], 'practice.sample_answer', 120)
    else:
        raise LessonError('practice.kind: "coding" or "exercise"')
    for field in common:
        _text(practice[field], f'practice.{field}')
    if practice['difficulty'] not in DIFFICULTIES:
        raise LessonError(f'practice.difficulty: one of {DIFFICULTIES}')


def validate_quiz(quiz):
    if not isinstance(quiz, list) or len(quiz) != 5:
        raise LessonError('quiz: expected exactly 5 questions')
    for i, q in enumerate(quiz):
        if not isinstance(q, dict) or not {'type', 'question', 'options', 'answer', 'explanation'} <= set(q) <= {'type', 'question', 'code', 'options', 'answer', 'explanation'}:
            raise LessonError(f'quiz[{i}]: expected {{type, question, code?, options, answer, explanation}}')
        if q['type'] not in QUIZ_TYPES:
            raise LessonError(f'quiz[{i}].type: one of {QUIZ_TYPES}')
        _text(q['question'], f'quiz[{i}].question', 10)
        _text(q['explanation'], f'quiz[{i}].explanation', 20)
        if 'code' in q:
            _text(q['code'], f'quiz[{i}].code')
        if not isinstance(q['options'], list) or len(q['options']) != 4 or len(set(q['options'])) != 4:
            raise LessonError(f'quiz[{i}].options: expected 4 different options')
        for option in q['options']:
            _text(option, f'quiz[{i}].options')
        if q['answer'] not in (0, 1, 2, 3):
            raise LessonError(f'quiz[{i}].answer: index 0–3')


def normalize_output(text):
    return '\n'.join(line.rstrip() for line in text.replace('\r\n', '\n').strip().split('\n'))


def run_program(language, source, stdin, timeout=15):
    """Run a practice program locally. Returns (stdout, error) or None when the language cannot run on this machine."""
    with tempfile.TemporaryDirectory() as tmp:
        if language == 'python':
            path = os.path.join(tmp, 'main.py')
            command = [sys.executable, '-I', path]
            program = source
        elif language == 'javascript':
            # The site runs JavaScript in the browser with the input in a global `stdin` string.
            path = os.path.join(tmp, 'main.js')
            command = ['node', path]
            program = f'const stdin = {__import__("json").dumps(stdin)};\n{source}'
            stdin = ''
        else:
            return None
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(program)
        try:
            done = subprocess.run(command, input=stdin, capture_output=True, text=True, encoding='utf-8', timeout=timeout, cwd=tmp)
        except subprocess.TimeoutExpired:
            return '', 'timed out'
        return done.stdout, done.stderr if done.returncode else ''
