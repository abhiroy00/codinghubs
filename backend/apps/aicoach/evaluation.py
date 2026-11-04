"""AI answer evaluation: build the prompt, call the AI layer, validate the reply and compute the overall score in code."""
from .ai_services import ai_manager
from .ai_services.prompt_templates import EVALUATE_ANSWER_TASK, build_system, evaluate_answer_prompt

# The model only scores the six dimensions; the overall score is a fixed weighted average calculated here, so it is
# explainable and consistent. Technical accuracy counts most; communication counts least, so a correct answer with
# imperfect grammar is not punished.
SCORE_WEIGHTS = {
    'technical_accuracy': 0.30,
    'completeness': 0.20,
    'concept_clarity': 0.15,
    'practical_knowledge': 0.15,
    'relevance': 0.10,
    'communication': 0.10,
}

_score = {'type': 'integer', 'minimum': 0, 'maximum': 10}
_list = lambda low, high: {'type': 'array', 'minItems': low, 'maxItems': high, 'items': {'type': 'string', 'minLength': 2, 'maxLength': 600}}  # noqa: E731

EVALUATION_SCHEMA = {
    'type': 'object',
    'required': ['scores', 'strengths', 'missing_concepts', 'mistakes', 'improvement_suggestions', 'improved_answer', 'ideal_answer', 'practical_example'],
    'properties': {
        'scores': {'type': 'object', 'required': list(SCORE_WEIGHTS), 'properties': {name: _score for name in SCORE_WEIGHTS}},
        'strengths': _list(0, 6),
        'missing_concepts': _list(0, 8),
        'mistakes': _list(0, 8),
        'improvement_suggestions': _list(1, 6),
        'improved_answer': {'type': 'string', 'minLength': 2, 'maxLength': 3000},
        'ideal_answer': {'type': 'string', 'minLength': 20, 'maxLength': 3000},
        'practical_example': {'type': 'string', 'minLength': 2, 'maxLength': 2000},
    },
}


def overall_score(scores):
    """Weighted average of the six dimension scores, out of 10, to one decimal place."""
    return round(sum(scores[name] * weight for name, weight in SCORE_WEIGHTS.items()), 1)


def evaluate_answer(*, user, question, answer, topic='', level='intermediate', reference=''):
    """Evaluate one answer. Returns (result dict, AIResponse). Raises the AI layer's errors unchanged."""
    response = ai_manager.generate_json(
        feature='evaluate_answer', user=user, system=build_system(EVALUATE_ANSWER_TASK),
        prompt=evaluate_answer_prompt(question, answer, topic, level, reference),
        schema=EVALUATION_SCHEMA, max_output_tokens=4096, temperature=0.3,
    )
    result = dict(response.data)
    result['score'] = overall_score(result['scores'])
    result['score_weights'] = SCORE_WEIGHTS
    return result, response
