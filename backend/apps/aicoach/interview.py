"""AI mock interview: the session state machine and the rules around it.

How one interview runs (AI calls in brackets, so the daily limit is easy to reason about):
    start         -> creates question 1                       [1 call]
    submit-answer -> evaluates the answer and, in the same call, prepares a follow-up and a fresh next question   [1 call]
    next-question -> serves the prepared question             [0 calls; 1 only if nothing usable was prepared, e.g. after a skip]
    end           -> final report                             [1 call]
A 5-question interview therefore costs about 7 AI calls.

The AI never decides the flow. These rules are plain code so they are predictable and testable:
    * a follow-up is asked after a main question that was answered with some substance (score >= 3), at most
      max(1, total // 3) times per interview;
    * difficulty steps up after two strong answers and down after two weak ones;
    * a mixed interview makes every third main question an HR question.
"""
import difflib

from django.db import IntegrityError
from django.utils import timezone

from .ai_services import ai_manager
from .ai_services.prompt_templates import QUESTION_TASK, REPORT_TASK, build_system, question_prompt, report_prompt, turn_prompt, turn_task
from .evaluation import EVALUATION_SCHEMA, SCORE_WEIGHTS, overall_score
from .models import MockInterview, MockInterviewTurn

LEVELS = ['beginner', 'intermediate', 'advanced']
MAX_IN_PROGRESS = 3
FOLLOW_UP_MIN_SCORE = 3
STEP_UP_AT, STEP_DOWN_AT = 8.0, 4.0
REPEAT_RATIO = 0.8

_question = {'type': 'string', 'minLength': 10, 'maxLength': 500}
QUESTION_SCHEMA = {'type': 'object', 'required': ['question'], 'properties': {'question': _question}}
TURN_SCHEMA = {**EVALUATION_SCHEMA, 'properties': {**EVALUATION_SCHEMA['properties'], 'follow_up_question': _question, 'next_question': _question}}
_items = lambda low, high: {'type': 'array', 'minItems': low, 'maxItems': high, 'items': {'type': 'string', 'minLength': 2, 'maxLength': 600}}  # noqa: E731
REPORT_SCHEMA = {
    'type': 'object',
    'required': ['summary', 'strengths', 'weaknesses', 'topics_to_revise', 'next_steps', 'communication_feedback', 'readiness_note'],
    'properties': {
        'summary': {'type': 'string', 'minLength': 10, 'maxLength': 1500},
        'strengths': _items(1, 6), 'weaknesses': _items(1, 6), 'topics_to_revise': _items(0, 8), 'next_steps': _items(1, 6),
        'communication_feedback': {'type': 'string', 'minLength': 5, 'maxLength': 800},
        'readiness_note': {'type': 'string', 'minLength': 5, 'maxLength': 800},
    },
}


class InterviewStateError(Exception):
    """The request is valid but does not fit the interview's current state (HTTP 409)."""

    def __init__(self, message, code):
        super().__init__(message)
        self.message, self.code = message, code


# ---------------------------------------------------------------- rules

def step_difficulty(current, recent_scores):
    """Move one level up after two strong answers, one level down after two weak ones; otherwise stay."""
    if len(recent_scores) < 2:
        return current
    average = sum(recent_scores[-2:]) / 2
    index = LEVELS.index(current)
    if average >= STEP_UP_AT:
        index = min(index + 1, len(LEVELS) - 1)
    elif average <= STEP_DOWN_AT:
        index = max(index - 1, 0)
    return LEVELS[index]


def verdict(score):
    if score >= 8:
        return 'Strong performance'
    if score >= 6:
        return 'Good, with gaps to close'
    if score >= 4:
        return 'Needs more practice'
    return 'Not ready yet: build the basics first'


def is_repeat(candidate, previous_questions):
    normalised = ' '.join(candidate.lower().split())
    return any(difflib.SequenceMatcher(None, normalised, ' '.join(q.lower().split())).ratio() >= REPEAT_RATIO for q in previous_questions)


def main_category(interview, main_count):
    if interview.interview_type == 'mixed':
        return 'hr' if (main_count + 1) % 3 == 0 else 'technical'
    return interview.interview_type


def wants_follow_up(interview, last_turn):
    if last_turn.kind != 'main' or last_turn.skipped or last_turn.score is None or last_turn.score < FOLLOW_UP_MIN_SCORE:
        return False
    used = interview.turns.filter(kind='follow_up').count()
    return used < max(1, interview.total_questions // 3)


# ---------------------------------------------------------------- helpers

def open_turn(interview):
    return interview.turns.filter(answered_at__isnull=True).order_by('-number').first()


def asked_questions(interview):
    return list(interview.turns.values_list('question', flat=True))


def transcript_lines(interview, limit=6):
    lines = []
    for turn in list(interview.turns.filter(answered_at__isnull=False).order_by('-number')[:limit])[::-1]:
        answer = '(skipped)' if turn.skipped else turn.answer[:700]
        lines.append(f'Q{turn.number} [{turn.kind}, {turn.category}, score {turn.score if turn.score is not None else "n/a"}]: {turn.question}\nAnswer: {answer}')
    return lines


def require_in_progress(interview):
    if interview.status != MockInterview.IN_PROGRESS:
        raise InterviewStateError('This interview has already ended.', 'interview_ended')


def _generate_question(interview, user, *, category, kind, difficulty):
    response = ai_manager.generate_json(
        feature='mock_question', user=user, system=build_system(QUESTION_TASK), schema=QUESTION_SCHEMA, max_output_tokens=1024, temperature=0.7,
        prompt=question_prompt(interview, category=category, kind=kind, difficulty=difficulty, questions=asked_questions(interview), transcript_lines=transcript_lines(interview)),
    )
    return response.data['question']


def _create_turn(interview, *, category, kind, text, difficulty):
    """Create the next turn; if a concurrent request already did, return that one instead of a duplicate."""
    number = interview.turns.count() + 1
    try:
        return MockInterviewTurn.objects.create(interview=interview, number=number, category=category, kind=kind, difficulty=difficulty, question=text)
    except IntegrityError:
        return open_turn(interview)


# ---------------------------------------------------------------- the five operations

def start_interview(user, data):
    if MockInterview.objects.filter(user=user, status=MockInterview.IN_PROGRESS).count() >= MAX_IN_PROGRESS:
        raise InterviewStateError(f'You already have {MAX_IN_PROGRESS} interviews in progress. Finish or end one first.', 'too_many_in_progress')
    interview = MockInterview.objects.create(
        user=user, job_role=data['job_role'], technology=data['technology'], experience_level=data['experience_level'],
        difficulty=data['difficulty'], current_difficulty=data['difficulty'], interview_type=data['interview_type'], total_questions=data['number_of_questions'],
    )
    category = main_category(interview, 0)
    try:
        text = _generate_question(interview, user, category=category, kind='main', difficulty=interview.current_difficulty)
    except Exception:
        interview.delete()  # no half-created interview if the AI is unavailable
        raise
    return interview, _create_turn(interview, category=category, kind='main', text=text, difficulty=interview.current_difficulty)


def submit_answer(interview, user, answer='', skip=False):
    """Record an answer (or a skip). Returns the evaluation dict, or None for a skip."""
    require_in_progress(interview)
    turn = open_turn(interview)
    if turn is None:
        raise InterviewStateError('There is no open question. Ask for the next question first.', 'no_open_question')
    now = timezone.now()
    if skip:
        changed = MockInterviewTurn.objects.filter(pk=turn.pk, answered_at__isnull=True).update(skipped=True, score=0, answered_at=now)
        if not changed:
            raise InterviewStateError('That question was already answered.', 'already_answered')
        _update_difficulty(interview)
        return turn, None
    more = interview.turns.count() < interview.total_questions
    response = ai_manager.generate_json(
        feature='mock_turn', user=user, system=build_system(turn_task(turn.category)), schema=TURN_SCHEMA, max_output_tokens=4096, temperature=0.4,
        prompt=turn_prompt(interview, category=turn.category, difficulty=interview.current_difficulty, question=turn.question, answer=answer,
                           questions=asked_questions(interview), transcript_lines=transcript_lines(interview), more_questions=more),
    )
    data = dict(response.data)
    # `difficulty` records the level the prepared next question was written for; if the candidate's level changes after this
    # answer is scored, that question is stale and next_question() asks for a new one at the new level.
    candidates = {'follow_up': data.pop('follow_up_question', None), 'next': data.pop('next_question', None) if more else None,
                  'difficulty': interview.current_difficulty}
    data['score'] = overall_score(data['scores'])
    data['score_weights'] = SCORE_WEIGHTS
    changed = MockInterviewTurn.objects.filter(pk=turn.pk, answered_at__isnull=True).update(
        answer=answer, evaluation=data, score=data['score'], next_candidates=candidates, answered_at=now)
    if not changed:
        raise InterviewStateError('That question was already answered.', 'already_answered')
    _update_difficulty(interview)
    turn.refresh_from_db()
    return turn, data


def _update_difficulty(interview):
    scores = list(interview.turns.filter(answered_at__isnull=False).order_by('number').values_list('score', flat=True))
    new = step_difficulty(interview.current_difficulty, [s or 0 for s in scores])
    if new != interview.current_difficulty:
        interview.current_difficulty = new
        interview.save(update_fields=['current_difficulty'])


def next_question(interview, user):
    require_in_progress(interview)
    existing = open_turn(interview)
    if existing is not None:  # asking twice (a retry, a double click) never creates a second question
        return existing
    last = interview.turns.order_by('-number').first()
    if last is None or interview.turns.count() >= interview.total_questions:
        raise InterviewStateError('All questions have been asked. End the interview to get your report.', 'no_more_questions')
    follow_up = wants_follow_up(interview, last)
    kind = 'follow_up' if follow_up else 'main'
    category = last.category if follow_up else main_category(interview, interview.turns.filter(kind='main').count())
    candidates = last.next_candidates or {}
    prepared = candidates.get('follow_up' if follow_up else 'next')
    stale = not follow_up and candidates.get('difficulty') not in (None, interview.current_difficulty)
    text = prepared if prepared and not stale and not is_repeat(prepared, asked_questions(interview)) else None
    if text is None:  # nothing prepared (after a skip), it repeated an earlier question, or the difficulty changed: ask the AI now
        text = _generate_question(interview, user, category=category, kind=kind, difficulty=interview.current_difficulty)
    return _create_turn(interview, category=category, kind=kind, text=text, difficulty=interview.current_difficulty)


def end_interview(interview, user):
    """Finish the interview and build the report. Safe to call again: a finished interview returns its stored report."""
    if interview.status == MockInterview.COMPLETED:
        return interview
    pending = open_turn(interview)
    if pending is not None:  # ending early: the unanswered question counts as skipped
        MockInterviewTurn.objects.filter(pk=pending.pk, answered_at__isnull=True).update(skipped=True, score=0, answered_at=timezone.now())
    turns = list(interview.turns.order_by('number'))
    answered = [t for t in turns if not t.skipped]
    overall = round(sum(t.score or 0 for t in turns) / len(turns), 1) if turns else 0.0
    averages = {name: round(sum(t.evaluation['scores'][name] for t in answered) / len(answered), 1) for name in SCORE_WEIGHTS} if answered else {}
    report = {
        'overall_score': overall, 'verdict': verdict(overall), 'questions_asked': len(turns), 'answered': len(answered), 'skipped': len(turns) - len(answered),
        'dimension_averages': averages,
        'score_method': 'The overall score is the average of the scores for each question; a skipped question counts as 0.',
        'questions': [{'number': t.number, 'kind': t.kind, 'category': t.category, 'question': t.question, 'score': t.score, 'skipped': t.skipped} for t in turns],
    }
    if answered:
        stats = (f'questions asked: {len(turns)}; answered: {len(answered)}; skipped: {len(turns) - len(answered)}; overall score: {overall}/10; '
                 f'average per dimension: {averages}')
        ai = ai_manager.generate_json(
            feature='mock_report', user=user, system=build_system(REPORT_TASK), schema=REPORT_SCHEMA, max_output_tokens=4096, temperature=0.4,
            prompt=report_prompt(interview, stats=stats, transcript_lines=transcript_lines(interview, limit=15)),
        )
        report.update(ai.data)
    else:  # nothing to analyse: do not spend an AI call
        report.update({'summary': 'No question was answered, so there is nothing to evaluate yet.', 'strengths': [], 'weaknesses': [], 'topics_to_revise': [],
                       'next_steps': ['Try the interview again and answer each question, even if you are unsure.'], 'communication_feedback': '', 'readiness_note': ''})
    # Only one request can complete the interview; if a concurrent one already did, its stored report wins.
    MockInterview.objects.filter(pk=interview.pk, status=MockInterview.IN_PROGRESS).update(
        status=MockInterview.COMPLETED, overall_score=overall, report=report, ended_at=timezone.now())
    interview.refresh_from_db()
    return interview
