"""Publication gates. Passing these checks still requires editorial review."""
import re
from django.core.exceptions import ValidationError

PARTS = ('concept', 'practice', 'industry', 'assessment')
MIN_WORDS = (2000, 700, 600, 300)


def question_keys(content):
    assessment = content.get('assessment', {})
    return {re.sub(r'\W+', ' ', str(q['question']).lower()).strip()
            for category in ('quiz', 'beginner', 'technical', 'scenarios', 'advanced', 'design', 'interview', 'tasks')
            for q in assessment.get(category, []) if isinstance(q, dict) and q.get('question')}


def validate_content(content, publishing=False):
    errors = []
    if not isinstance(content, dict) or set(content) != set(PARTS):
        raise ValidationError('Content must contain exactly concept, practice, industry and assessment.')
    questions = set()
    for index, name in enumerate(PARTS):
        part = content[name]
        if not isinstance(part, dict) or not isinstance(part.get('blocks'), list):
            errors.append(f'{name}: blocks must be a list.')
            continue
        for block in part['blocks']:
            if not isinstance(block, dict) or block.get('type') not in ('text', 'code', 'diagram') or not isinstance(block.get('body'), str):
                errors.append(f'{name}: invalid content block.')
            elif any(key in block and not isinstance(block[key], str) for key in ('title', 'expected_output')):
                errors.append(f'{name}: block titles and expected output must be text.')
        text = ' '.join(b['body'] for b in part['blocks'] if isinstance(b, dict) and b.get('type') == 'text' and isinstance(b.get('body'), str))
        if publishing and len(text.split()) < MIN_WORDS[index]:
            errors.append(f'{name}: requires at least {MIN_WORDS[index]} editorial words, excluding code and questions.')
        if publishing and not part.get('blocks'):
            errors.append(f'{name}: content is empty.')
    assessment = content['assessment']
    if isinstance(assessment, dict):
        quiz = assessment.get('quiz', [])
        if not isinstance(quiz, list):
            errors.append('quiz must be a list.')
            quiz = []
        for q in quiz:
            if not isinstance(q, dict):
                errors.append('Invalid quiz item.')
                continue
            options = q.get('options')
            if not isinstance(q.get('question'), str) or not isinstance(q.get('explanation'), str):
                errors.append('Quiz questions and explanations must be text.')
            key = re.sub(r'\W+', ' ', str(q.get('question', '')).lower()).strip()
            if not key or key in questions:
                errors.append('Quiz questions must be nonempty and unique.')
            questions.add(key)
            if not isinstance(options, list) or len(options) < 2 or any(not isinstance(o, str) for o in options) or type(q.get('answer')) is not int or not 0 <= q['answer'] < len(options):
                errors.append('Each quiz requires options and a valid answer index.')
            if not q.get('explanation'):
                errors.append('Each quiz requires an answer explanation.')
        for category in ('beginner', 'technical', 'scenarios', 'advanced', 'design', 'interview', 'tasks'):
            items = assessment.get(category, [])
            if not isinstance(items, list) or any(not isinstance(q, dict) or not isinstance(q.get('question'), str) or not isinstance(q.get('answer'), str) for q in items):
                errors.append(f'{category}: use a list of text questions and model answers.')
        assignment = assessment.get('assignment', {})
        if not isinstance(assignment, dict) or any(not isinstance(v, str) for v in assignment.values()):
            errors.append('Assignment fields must be text.')
        reflections = assessment.get('self_assessment', [])
        if not isinstance(reflections, list) or any(not isinstance(v, str) for v in reflections):
            errors.append('Self assessment must be a list of text prompts.')
        if publishing:
            if len(quiz) != 5:
                errors.append('Exactly five beginner MCQs are required.')
            requirements = {'beginner': 5, 'technical': 5, 'scenarios': 3, 'advanced': 5, 'design': 3, 'interview': 5, 'tasks': 5}
            for category, count in requirements.items():
                items = assessment.get(category, [])
                if not isinstance(items, list) or len(items) != count:
                    errors.append(f'{category}: requires {count} items.')
                elif any(not isinstance(q, dict) or not q.get('question') or not q.get('answer') for q in items):
                    errors.append(f'{category}: questions and model answers/rubrics are required.')
                else:
                    for q in items:
                        key = re.sub(r'\W+', ' ', str(q['question']).lower()).strip()
                        if key in questions:
                            errors.append(f'{category}: duplicate assessment question.')
                        questions.add(key)
            assignment = assessment.get('assignment', {})
            for field in ('problem', 'requirements', 'input_output', 'constraints', 'acceptance_criteria', 'rubric', 'hints', 'bonus'):
                if not isinstance(assignment, dict) or not assignment.get(field):
                    errors.append(f'assignment: missing {field}.')
            if not assessment.get('self_assessment'):
                errors.append('Self assessment is required.')
    if errors:
        raise ValidationError(errors)
