from contextlib import redirect_stdout
from copy import deepcopy
from io import StringIO
from itertools import product
import json
import runpy
from types import SimpleNamespace
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from .content_library import ROOT, load_lesson, local_file
from .models import Concept, DraftRevision, Progress


INTRO = '01-introduction-to-artificial-intelligence'
FAMILIES = '01-ai-vs-ml-vs-deep-learning-vs-generative-ai'


class CuratedContentTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def example(self, slug):
        metadata, _ = load_lesson(slug)
        item = metadata['examples'][0]
        output = StringIO()
        # Only execute repository-owned examples selected by these tests. Never execute database lesson text.
        with redirect_stdout(output):
            scope = runpy.run_path(str(ROOT / slug / item['file']), run_name='__main__')
        self.assertEqual(output.getvalue().strip(), item['expected_output'])
        return scope

    def test_all_sources_pass_depth_structure_and_question_uniqueness(self):
        output = StringIO()
        call_command('validate_genai_content', '--json', stdout=output)
        report = json.loads(output.getvalue())
        self.assertEqual(len(report['lessons']), 3)
        self.assertEqual(report['failures'], [])
        self.assertEqual(report['code_execution'], 'not_performed')
        self.assertTrue(all(row['assessment_items'] == 36 for row in report['lessons']))

    def test_planner_output_and_failure_contracts(self):
        planner = self.example(INTRO)['shortest_path']
        self.assertEqual(planner({'a': ['b'], 'b': []}, 'a', 'b'), ['a', 'b'])
        self.assertEqual(planner({'a': ['a']}, 'a', 'a'), ['a'])
        self.assertIsNone(planner({'a': ['a'], 'b': []}, 'a', 'b'))
        self.assertEqual(planner({'a': ['c', 'b'], 'b': ['d'], 'c': ['d'], 'd': []}, 'a', 'd'), ['a', 'b', 'd'])
        for graph, start, goal in [({}, 'a', 'a'), ({'a': 'b', 'b': []}, 'a', 'b'), ({'a': ['missing']}, 'a', 'a'), ({'a': []}, [], 'a'), ({1: []}, 'a', 'a')]:
            with self.assertRaises(ValueError):
                planner(graph, start, goal)
        for budget in [True, 0, -1, 1.5]:
            with self.assertRaises(ValueError):
                planner({'a': []}, 'a', 'a', budget)
        with self.assertRaises(RuntimeError):
            planner({'a': ['b'], 'b': ['c'], 'c': []}, 'a', 'c', max_expansions=1)

    def test_planner_matches_independent_distance_oracle_on_small_graphs(self):
        planner = self.example(INTRO)['shortest_path']
        nodes = ['a', 'b', 'c']
        edges = [(a, b) for a in nodes for b in nodes if a != b]
        for included in product([False, True], repeat=len(edges)):
            graph = {node: [] for node in nodes}
            for keep, (a, b) in zip(included, edges):
                if keep:
                    graph[a].append(b)
            # All-pairs relaxation is independent of the queue/parent implementation.
            distance = {(a, b): 0 if a == b else 1 if b in graph[a] else float('inf') for a in nodes for b in nodes}
            for middle in nodes:
                for start in nodes:
                    for goal in nodes:
                        distance[start, goal] = min(distance[start, goal], distance[start, middle] + distance[middle, goal])
            for start in nodes:
                for goal in nodes:
                    route = planner(graph, start, goal)
                    if distance[start, goal] == float('inf'):
                        self.assertIsNone(route)
                    else:
                        self.assertEqual(len(route) - 1, distance[start, goal])
                        self.assertTrue(all(b in graph[a] for a, b in zip(route, route[1:])))

    def test_fitting_and_generation_have_independent_expected_results(self):
        scope = self.example(FAMILIES)
        fit, bigram, generate = scope['fit_line'], scope['fit_bigram'], scope['generate']
        slope, bias = fit([(0, 0), (1, 2), (2, 2)])
        self.assertAlmostEqual(slope, 1)
        self.assertAlmostEqual(bias, 1 / 3)
        for rows in [[], [(1, 0), (1, 2)], [(True, 1), (2, 3)], [(float('nan'), 1), (2, 3)], [(1e20, 1), (2, 3)], [(1, 2, 3), (2, 3)], [(10 ** 1000, 1), (2, 3)]]:
            with self.assertRaises(ValueError):
                fit(rows)
        model = bigram(['ai learns patterns', 'ai learns rules', 'ai generates text'])
        self.assertEqual(model['ai']['learns'], 2)
        self.assertEqual(sum(model['ai'].values()), 3)
        before = deepcopy(model)
        self.assertEqual(generate(model, 'AI'), 'ai learns patterns')
        self.assertEqual(model, before)
        self.assertEqual(generate(bigram(['loop loop']), 'loop', max_tokens=3), 'loop')  # end marker wins the lexical tie
        cyclic = {'loop': {'loop': 2}}
        self.assertEqual(generate(cyclic, 'loop', max_tokens=3), 'loop loop loop')
        for sentences in [[], [''], ['a <end>'], [1]]:
            with self.assertRaises(ValueError):
                bigram(sentences)
        for start, limit in [('unknown', 3), ('ai learns', 3), ('<end>', 3), ('ai', 0), ('ai', True), ('ai', 101)]:
            with self.assertRaises(ValueError):
                generate(model, start, limit)

    def test_seed_import_is_unpublished_repeatable_and_preserves_editorial_work(self):
        call_command('seed_genai_lessons', stdout=StringIO())
        self.assertEqual(Concept.objects.count(), 270)
        intro = Concept.objects.get(slug=INTRO)
        families = Concept.objects.get(slug=FAMILIES)
        self.assertEqual(intro.status, 'in_review')
        self.assertEqual(families.status, 'in_review')
        self.assertEqual(list(families.prerequisites.values_list('slug', flat=True)), [INTRO])
        self.assertEqual(intro.version, 0)
        self.assertFalse(intro.code_verified)
        user = get_user_model().objects.create_user('learner')
        Progress.objects.create(user=user, concept=intro, notes='Keep my notes', bookmark=True)
        original = intro.content
        intro.title = 'Editorial title'
        intro.save()
        call_command('seed_genai_lessons', stdout=StringIO())
        intro.refresh_from_db()
        self.assertEqual(intro.title, 'Editorial title')
        self.assertEqual(intro.content, original)
        self.assertEqual(Progress.objects.get().notes, 'Keep my notes')
        self.assertEqual(DraftRevision.objects.count(), 0)

    def test_seed_does_not_replace_unstarted_status_with_existing_text(self):
        call_command('seed_genai', stdout=StringIO())
        intro = Concept.objects.get(slug=INTRO)
        intro.content['concept']['blocks'] = [{'type': 'text', 'body': 'Existing author text'}]
        intro.save()
        call_command('seed_genai_lessons', '--slug', INTRO, stdout=StringIO())
        intro.refresh_from_db()
        self.assertEqual(intro.content['concept']['blocks'][0]['body'], 'Existing author text')

    def test_seed_preserves_work_in_metadata_or_assessments_before_prose(self):
        call_command('seed_genai', stdout=StringIO())
        intro = Concept.objects.get(slug=INTRO)
        intro.references = [{'title': 'Existing editorial reference', 'url': 'https://example.com'}]
        intro.save()
        families = Concept.objects.get(slug=FAMILIES)
        families.content['assessment']['tasks'] = [{'question': 'Editorial task', 'answer': 'Editorial rubric'}]
        families.save()
        call_command('seed_genai_lessons', stdout=StringIO())
        intro.refresh_from_db(); families.refresh_from_db()
        self.assertEqual(intro.references[0]['title'], 'Existing editorial reference')
        self.assertEqual(families.content['assessment']['tasks'][0]['question'], 'Editorial task')

    def test_source_paths_and_part_order_are_checked_without_execution(self):
        with self.assertRaises(ValidationError):
            local_file(ROOT / INTRO, '../metadata.json')
        metadata = json.loads((ROOT / INTRO / 'metadata.json').read_text(encoding='utf-8'))
        source = (ROOT / INTRO / 'lesson.md').read_text(encoding='utf-8')
        files = {'metadata.json': json.dumps(metadata), 'lesson.md': source.replace('# concept', '# practice', 1)}
        with patch('apps.learning.content_library.local_file', side_effect=lambda directory, name: SimpleNamespace(read_text=lambda encoding: files[name])):
            with self.assertRaises(ValidationError):
                load_lesson(INTRO)

    def test_architecture_refresh_updates_only_known_generated_labels(self):
        call_command('seed_genai', stdout=StringIO())
        data = json.loads((ROOT.parent / 'curriculum.json').read_text(encoding='utf-8'))
        module = Concept.objects.get(slug=INTRO).chapter.module
        module.title = data[0]['title'].title()
        module.objectives = [f'Explain and implement {c["title"].lower()} with explicit assumptions and tests.' for ch in data[0]['chapters'] for c in ch['concepts']]
        module.save()
        chapter = module.chapters.order_by('position').first()
        chapter.title = module.title + ' ? 1'
        chapter.save()
        custom = module.chapters.order_by('position').last()
        custom.title = 'An editor wrote this chapter name'
        custom.save()
        intro = Concept.objects.get(slug=INTRO)
        intro.title = 'An editor wrote this lesson title'
        intro.save()
        call_command('seed_genai', '--refresh-structure', stdout=StringIO())
        module.refresh_from_db(); chapter.refresh_from_db(); custom.refresh_from_db(); intro.refresh_from_db()
        self.assertEqual(module.title, data[0]['title'])
        self.assertEqual(module.objectives, data[0]['objectives'])
        self.assertEqual(chapter.title, data[0]['chapters'][0]['title'])
        self.assertEqual(custom.title, 'An editor wrote this chapter name')
        self.assertEqual(intro.title, 'An editor wrote this lesson title')
        module.objectives = ['An editor wrote this objective']
        module.save()
        call_command('seed_genai', '--refresh-structure', stdout=StringIO())
        module.refresh_from_db()
        self.assertEqual(module.objectives, ['An editor wrote this objective'])
