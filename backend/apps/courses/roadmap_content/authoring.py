"""Small authoring helper; units-*.json are the editable, authoritative content sources."""
import json
from pathlib import Path


def topic(slug, title, concept, mechanism, boundary, example, application, questions, code, expected, sources, tags):
    pairs = []
    for line in questions.strip().splitlines():
        question, answer = line.split('||', 1)
        pairs.append({'question': question.strip(), 'answer': answer.strip()})
    assert len(pairs) == 10, (slug, len(pairs))
    return dict(slug=slug, title=title, concept=concept, mechanism=mechanism, boundary=boundary,
                example=example, application=application, angles=pairs, code=code.strip() + '\n',
                expected=expected, sources=sources.split(), tags=tags.split(','))


def save(level, units):
    assert len(units) == 10
    Path(__file__).with_name(f'units-{level}.json').write_text(json.dumps(units, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
