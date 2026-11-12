import json
import re
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.learning.models import Concept, empty_content
from apps.learning.quality import validate_content


def pilot_content():
    root = Path(__file__).resolve().parents[2]
    source = (root / 'pilot-cosine.md').read_text(encoding='utf-8')
    content = {}
    for part, text in re.findall(r'^# (\w+)\n(.*?)(?=^# |\Z)', source, re.M | re.S):
        blocks = []
        for title, body in re.findall(r'^## ([^\n]+)\n(.*?)(?=^## |\Z)', text, re.M | re.S):
            chunks = re.split(r'(```python\n.*?```)', body, flags=re.S)
            for chunk in chunks:
                if not chunk.strip():
                    continue
                code = chunk.startswith('```python\n')
                block = {'title': title, 'type': 'code' if code else 'text', 'body': chunk[len('```python\n'):-3].strip() if code else chunk.strip()}
                if code:
                    block['expected_output'] = 'aligned: 1.000\ndiagonal: 0.600\northogonal: 0.000\nrejected: A zero vector has no direction'
                blocks.append(block)
        content[part] = {'blocks': blocks}
    content['assessment'].update(json.loads((root / 'pilot-assessment.json').read_text(encoding='utf-8')))
    content['concept']['blocks'].append({'type': 'diagram', 'title': 'Where cosine fits in retrieval', 'body': 'Query → compatible encoder → validate → normalize\n                                              ↓\nAuthorized passage vectors → exact dot products → rank → evidence review\n                                              ↓\n                                   grounded response or no result'})
    validate_content(content, publishing=True)
    return content


class Command(BaseCommand):
    help = 'Install the cosine-similarity pilot as In Review; never publish or overwrite existing work.'

    @transaction.atomic
    def handle(self, *args, **options):
        call_command('seed_genai', stdout=self.stdout)
        concept = Concept.objects.get(slug='08-cosine-similarity')
        if (concept.status != 'not_started' or concept.version or concept.edit_version
                or concept.content != empty_content() or concept.outcomes or concept.references
                or concept.seo_description or concept.reviewed_by_id or concept.code_verified):
            self.stdout.write('Pilot already has editorial work. Nothing overwritten.')
            return
        concept.content = pilot_content()
        concept.status = 'in_review'
        concept.outcomes = ['Derive cosine similarity and explain scale invariance.', 'Implement stable exact scoring with explicit validation.', 'Design and evaluate a versioned, authorized retrieval pipeline.']
        concept.references = [
            {'title': 'Python 3.12 math standard library', 'url': 'https://docs.python.org/3.12/library/math.html'},
            {'title': 'scikit-learn cosine_similarity reference', 'url': 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html'},
        ]
        concept.seo_description = 'Derive cosine similarity, implement stable Python scoring, design production retrieval and test your understanding with concept-specific assessments.'
        concept.full_clean()
        concept.save()
        concept.prerequisites.set(Concept.objects.filter(slug__in=['01-vectors-and-matrices', '01-python-for-ai-engineering', '08-semantic-similarity']))
        self.stdout.write(self.style.SUCCESS('Pilot installed In Review. Staff preview: /interview-prep/generative-ai/08-cosine-similarity/?preview=1'))
