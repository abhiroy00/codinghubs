import json
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.cache import cache
from django.test import TestCase, SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from . import ai
from .content import PROBLEMS
from .models import Evaluation, Message, Problem, Session, StudioSettings, Submission, Usage
from .runner import docker_arguments, equal_output, run_submission

BASE = '/api/studio/v1/'


class StudioTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_studio', verbosity=0)
        cls.user = get_user_model().objects.create_user(username='studio-owner', password='StrongPass123')
        cls.other = get_user_model().objects.create_user(username='studio-other', password='StrongPass123')
        cls.staff = get_user_model().objects.create_user(username='studio-staff', password='StrongPass123', is_staff=True)
        cls.problem = Problem.objects.get(slug='quiet-signal-window')

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def create(self, **conf):
        response = self.client.post(BASE+'sessions/', {'problem_id': self.problem.pk, **conf}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def path(self, session, action=''):
        return BASE+f'sessions/{session["id"]}/'+action

    def test_auth_and_staff_boundaries(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(BASE+'sessions/').status_code, 401)
        self.assertEqual(self.client.get(BASE+'problems/').status_code, 200)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(BASE+'admin/problems/').status_code, 403)
        self.assertEqual(self.client.get('/api/admin/studio/settings/').status_code, 403)

    def test_private_records_and_hidden_data_never_serialized(self):
        session = self.create()
        serialized = json.dumps(session, default=str)
        self.assertNotIn('expected', serialized)
        self.assertNotIn('editorial', serialized)
        self.assertNotIn('"tests"', serialized)
        self.assertNotIn('"hints"', serialized)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.path(session)).status_code, 404)
        self.assertEqual(self.client.patch(self.path(session), {'code':'steal', 'revision':0}, format='json').status_code, 404)
        self.assertEqual(self.client.post(self.path(session, 'hint/')).status_code, 404)
        self.assertEqual(self.client.delete(self.path(session)).status_code, 404)

    def test_draft_recovery_and_stale_revision(self):
        session = self.create()
        payload = {'revision':0, 'code':'print(4)', 'diagram':{'nodes':[], 'edges':[]}}
        self.assertEqual(self.client.patch(self.path(session), payload, format='json').status_code, 200)
        self.assertEqual(self.client.patch(self.path(session), payload, format='json').status_code, 409)
        recovered = self.client.get(self.path(session)).data
        self.assertEqual(recovered['code'], 'print(4)')
        self.assertEqual(recovered['revision'], 1)

    def test_frozen_question_survives_admin_edit(self):
        session = self.create()
        self.client.force_authenticate(self.staff)
        response = self.client.patch(BASE+f'admin/problems/{self.problem.pk}/', {'description':'new staff description'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['version'], 2)
        self.client.force_authenticate(self.user)
        original = self.client.get(self.path(session)).data
        self.assertNotEqual(original['problem']['description'], 'new staff description')
        self.assertEqual(original['problem']['version'], 1)

    def test_configuration_validation_and_filtered_selection(self):
        response = self.client.post(BASE+'sessions/', {'duration':7}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post(BASE+'sessions/', {'topics':['Tries'], 'difficulty':'hard'}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post(BASE+'sessions/', {'topics':['Binary Search'], 'difficulty':'easy'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('Binary Search', response.data['problem']['topics'])

    def test_strict_hint_policy_and_persona_override(self):
        session = self.create(persona='strict')
        self.assertEqual(self.client.post(self.path(session, 'hint/')).status_code, 200)
        self.assertEqual(self.client.post(self.path(session, 'hint/')).status_code, 400)
        conf = StudioSettings.objects.get(name='default')
        conf.persona_policies={'coaching':{'max_hints':2}};conf.save()
        session = self.create(persona='coaching')
        for _ in range(2):
            self.assertEqual(self.client.post(self.path(session, 'hint/')).status_code, 200)
        self.assertEqual(self.client.post(self.path(session, 'hint/')).status_code, 400)

    @patch('apps.studio.ai.OpenAIProvider.generate')
    def test_contextual_conversation_and_idempotency(self, provider):
        provider.return_value = ({'reply':'What happens when the input is empty?', 'advance':True}, {'input_tokens':10,'output_tokens':8})
        session = self.create(persona='strict')
        payload = {'content':'I will slide a fixed window and keep its total.', 'request_id':str(uuid.uuid4())}
        self.assertEqual(self.client.post(self.path(session, 'turn/'), payload, format='json').status_code, 200)
        self.assertEqual(self.client.post(self.path(session, 'turn/'), payload, format='json').status_code, 200)
        self.assertEqual(provider.call_count, 1)
        self.assertEqual(Session.objects.get(pk=session['id']).stage, 0)  # strict requires two turns per stage
        context = provider.call_args.args[1]
        self.assertEqual(context['candidate_message'], payload['content'])
        self.assertNotIn('tests', context['problem'])
        self.assertNotIn('hints', context['problem'])
        self.assertEqual(Usage.objects.get().input_tokens, 10)

    @override_settings(STUDIO_AI_KEY='', STUDIO_AI_MODEL='')
    def test_provider_failure_preserves_draft_and_does_not_fake_turn(self):
        session = self.create()
        before = Message.objects.count()
        response = self.client.post(self.path(session,'turn/'), {'content':'My approach', 'request_id':str(uuid.uuid4())}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(Message.objects.count(), before)
        self.assertEqual(Usage.objects.filter(success=False).count(), 1)

    @patch('apps.studio.ai.OpenAIProvider.generate')
    def test_invalid_ai_shape_rejected(self, provider):
        provider.return_value = ({'reply':'Answer', 'advance':'yes'}, {})
        session = self.create()
        response = self.client.post(self.path(session,'turn/'), {'content':'Try this', 'request_id':str(uuid.uuid4())}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(Session.objects.get(pk=session['id']).stage, 0)

    @override_settings(STUDIO_EXECUTION_ENABLED=True)
    def test_no_run_policy_and_queue_limit(self):
        session = self.create(run_mode='no-run')
        self.assertEqual(self.client.post(self.path(session,'runs/'), {'mode':'sample'}, format='json').status_code, 400)
        session = self.create()
        for _ in range(3):
            self.assertEqual(self.client.post(self.path(session,'runs/'), {'mode':'submit'}, format='json').status_code, 202)
        self.assertEqual(self.client.post(self.path(session,'runs/'), {'mode':'sample'}, format='json').status_code, 429)

    def test_expired_session_cannot_edit_or_get_hint(self):
        session = self.create()
        Session.objects.filter(pk=session['id']).update(deadline=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.client.patch(self.path(session), {'code':'late', 'revision':0}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.path(session,'hint/')).status_code, 400)

    @patch('apps.studio.ai.OpenAIProvider.generate')
    def test_score_formula_and_frozen_report(self, provider):
        provider.return_value=({'dimensions':{k:{'rating':2,'explanation':'The transcript contains an attempted explanation.'} for k in ai.DIMENSIONS}, 'strengths':['Clear assumption'], 'improvements':['Test the empty case'], 'recommendations':['Sliding window'], 'summary':'Keep practicing the boundary cases.'}, {})
        session = self.create()
        response = self.client.post(self.path(session,'finish/'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['score'], 50)
        config=StudioSettings.objects.get(name='default');config.weights=dict(zip(ai.DIMENSIONS,[100,0,0,0,0,0]));config.save()
        again=self.client.post(self.path(session,'finish/'))
        self.assertEqual(again.data['weights']['understanding'], 10)
        self.assertEqual(provider.call_count, 1)
        self.assertEqual(Evaluation.objects.count(), 1)

    @override_settings(STUDIO_AI_KEY='', STUDIO_AI_MODEL='')
    def test_finish_failure_still_persists_completion(self):
        session=self.create()
        self.assertEqual(self.client.post(self.path(session,'finish/')).status_code, 503)
        self.assertEqual(Session.objects.get(pk=session['id']).status, 'completed')
        self.assertFalse(Evaluation.objects.exists())

    def test_learning_records_owner_isolation_and_no_tutor_injection(self):
        response=self.client.put(BASE+'records/', {'kind':'note','key':'one','data':{'content':'my private note'}}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.put(BASE+'records/', {'kind':'tutor','key':'one','data':{'messages':[]}}, format='json').status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(BASE+'records/').data, [])
        self.assertEqual(self.client.delete(BASE+'records/?id='+response.data['id']).status_code, 404)

    def test_weights_must_sum_to_100(self):
        self.client.force_authenticate(self.staff)
        response=self.client.patch(BASE+'admin/settings/', {'weights':dict(zip(ai.DIMENSIONS,[1]*6))}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_analytics_start_empty_then_use_only_real_results(self):
        empty=self.client.get(BASE+'analytics/').data
        self.assertEqual(empty['total_interviews'],0)
        self.assertIsNone(empty['average_score'])
        session=self.create()
        Submission.objects.create(session_id=session['id'], code='x',language='python',mode='submit',status='finished',results=[{'passed':True,'hidden':True}])
        metrics=self.client.get(BASE+'analytics/').data
        self.assertEqual(metrics['problems_solved'],1)
        self.assertEqual(metrics['accuracy'],100)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(BASE+'analytics/').data['problems_solved'],0)

    @patch('apps.studio.ai.OpenAIProvider.generate')
    def test_tutor_references_must_match_retrieved_material(self, provider):
        provider.return_value=({'reply':'Sliding windows move two boundaries.', 'sources':[999999]}, {})
        response=self.client.post(BASE+'tutor/', {'content':'Explain sliding window', 'request_id':str(uuid.uuid4())}, format='json')
        self.assertEqual(response.status_code,503)

    def test_seed_is_idempotent_and_preserves_staff_edits(self):
        count=Problem.objects.count()
        Problem.objects.filter(pk=self.problem.pk).update(title='Staff edited title')
        call_command('seed_studio',verbosity=0)
        self.assertEqual(Problem.objects.count(),count)
        self.assertEqual(Problem.objects.get(pk=self.problem.pk).title,'Staff edited title')


class RunnerContractTests(SimpleTestCase):
    def test_container_restrictions(self):
        args=docker_arguments('test-job','/tmp/trusted','python')
        for option in ['--network=none','--read-only','--user=65534:65534','--cap-drop=ALL','--security-opt=no-new-privileges','--memory=128m','--pids-limit=32','--cpus=0.5','--pull=never']:
            self.assertIn(option,args)
        self.assertNotIn('--privileged',args)

    @patch('apps.studio.runner.execute')
    def test_hidden_output_is_discarded(self, execute):
        execute.return_value={'status':'ok','output':'TOP SECRET INPUT','duration_ms':10}
        class S:
            code='print(input())';language='python';mode='submit'
            class session:
                snapshot={'tests':[{'stdin':'TOP SECRET INPUT','expected':'TOP SECRET INPUT','hidden':True}]}
        result=run_submission(S())
        self.assertTrue(result[0]['passed'])
        self.assertNotIn('TOP SECRET',json.dumps(result))

    def test_output_comparison_rejects_boolean_for_integer(self):
        self.assertFalse(equal_output('true','1'))
        self.assertTrue(equal_output(' [1, 2]\n','[1,2]'))

    def test_original_seed_examples_are_well_formed(self):
        self.assertEqual(len([p for p in PROBLEMS if p['kind']=='coding']),8)
        for problem in PROBLEMS:
            for test in problem['tests']:
                json.loads(test['stdin']);json.loads(test['expected'])
