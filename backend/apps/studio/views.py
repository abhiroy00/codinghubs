import random
import re
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from . import ai
from .content import COMPANIES, LEVELS, PATTERNS, ROLES, TOPICS
from .models import Evaluation, Event, LearningRecord, Message, Problem, Session, StudioSettings, Submission, Usage, DEFAULT_WEIGHTS
from .serializers import ConfigurationSerializer, DraftSerializer, ProblemAdminSerializer, ProblemSerializer, RecordSerializer, RunSerializer, SettingsSerializer, TurnSerializer


class AIThrottle(UserRateThrottle):
    scope = 'studio_ai'


class RunThrottle(UserRateThrottle):
    scope = 'studio_run'


def validated(cls, data):
    obj = cls(data=data)
    obj.is_valid(raise_exception=True)
    return obj.validated_data


def owned(request, pk, lock=False):
    qs = Session.objects.filter(user=request.user).select_related('problem')
    if lock:
        qs = qs.select_for_update()
    return get_object_or_404(qs, pk=pk)


def active(session):
    if session.status != 'active':
        raise ValidationError('This session has finished. Open its report or start a new attempt.')
    if session.deadline <= timezone.now():
        raise ValidationError('Time has ended. Finish the session to request your report.')


def submission_data(obj):
    return {'id': str(obj.id), 'status': obj.status, 'mode': obj.mode, 'results': obj.results, 'created_at': obj.created_at, 'finished_at': obj.finished_at}


def evidence_for(session):
    # Do not supply source, hidden stdin/expected, stdout or stderr to evaluator.
    return [{'id': str(s.id), 'mode': s.mode, 'status': s.status, 'results': [{k: v for k, v in r.items() if k in ['hidden', 'passed', 'status', 'duration_ms']} for r in s.results]} for s in session.submissions.all()]


def report_data(obj):
    return {'score': obj.score, 'dimensions': obj.dimensions, 'feedback': obj.feedback, 'weights': obj.weights, 'evidence': obj.evidence, 'created_at': obj.created_at, 'prompt_version': obj.prompt_version}


def session_data(obj, detail=True):
    result = {'id': str(obj.id), 'problem': ai.public_problem(obj.snapshot), 'configuration': obj.configuration, 'status': obj.status, 'stage': obj.stage, 'hint_level': obj.hint_level, 'started_at': obj.started_at, 'deadline': obj.deadline, 'completed_at': obj.completed_at, 'revision': obj.revision}
    result['stages'] = ai.STAGE_SETS[obj.snapshot['kind']]
    if detail:
        result.update(code=obj.code, diagram=obj.diagram, messages=list(obj.messages.values('id', 'role', 'content', 'created_at')), submissions=[submission_data(s) for s in obj.submissions.all()], report=report_data(obj.evaluation) if hasattr(obj, 'evaluation') else None)
    else:
        result['score'] = obj.evaluation.score if hasattr(obj, 'evaluation') else None
    return result


class Catalog(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'topics': TOPICS, 'companies': COMPANIES, 'roles': ROLES, 'levels': LEVELS, 'patterns': [{'title': t, 'lesson': l} for t, l in PATTERNS], 'languages': ['python', 'javascript'], 'ai_available': bool(settings.STUDIO_AI_KEY and settings.STUDIO_AI_MODEL), 'execution_available': settings.STUDIO_EXECUTION_ENABLED, 'problem_count': Problem.objects.filter(published=True, kind='coding').count(), 'stages': ai.STAGES})


class ProblemList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProblemSerializer

    def get_queryset(self):
        qs = Problem.objects.filter(published=True)
        for field in ['kind', 'difficulty']:
            if self.request.query_params.get(field):
                qs = qs.filter(**{field: self.request.query_params[field]})
        if self.request.query_params.get('q'):
            qs = qs.filter(title__icontains=self.request.query_params['q'][:100])
        # JSON icontains is supported on both SQLite and Postgres.
        for key in ['topic', 'company']:
            if self.request.query_params.get(key):
                qs = qs.filter(**{('topics' if key == 'topic' else 'companies') + '__icontains': self.request.query_params[key][:100]})
        return qs[:100]


class Sessions(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([session_data(s, False) for s in Session.objects.filter(user=request.user).select_related('evaluation')[:100]])

    @transaction.atomic
    def post(self, request):
        conf = validated(ConfigurationSerializer, request.data)
        qs = Problem.objects.filter(published=True, kind=conf['kind'])
        if conf.get('problem_id'):
            qs = qs.filter(pk=conf['problem_id'])
        else:
            if conf['difficulty'] != 'mixed':
                qs = qs.filter(difficulty=conf['difficulty'])
            if conf['topics']:
                ids = [p.pk for p in qs if set(conf['topics']) & set(p.topics)]
                qs = qs.filter(pk__in=ids)
            if conf['company']:
                qs = qs.filter(companies__icontains=conf['company'])
        ids = list(qs.values_list('pk', flat=True))
        if not ids:
            raise ValidationError('No approved problem matches these filters. Broaden the topics or difficulty.')
        problem = qs.get(pk=random.choice(ids))
        snapshot = model_to_dict(problem)
        snapshot.pop('updated_at', None)
        session = Session.objects.create(user=request.user, problem=problem, snapshot=snapshot, configuration=conf, code=problem.starters.get(conf['language'], ''), deadline=timezone.now()+timedelta(minutes=conf['duration']))
        Message.objects.create(session=session, role='assistant', content=f'Welcome to your {conf["persona"]} session. Read “{problem.title}”, then share any clarification questions and explain your first approach. Your problem version is fixed for this session.')
        Event.objects.create(session=session, action='created', data={'problem_version': problem.version})
        return Response(session_data(session), status=201)


class SessionDetail(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        return Response(session_data(owned(request, pk)))

    @transaction.atomic
    def patch(self, request, pk):
        obj = owned(request, pk, True)
        active(obj)
        data = validated(DraftSerializer, request.data)
        if data['revision'] != obj.revision:
            return Response({'detail': 'A newer draft exists. Reload before saving to avoid overwriting it.', 'revision': obj.revision}, status=409)
        obj.code = data['code']
        obj.diagram = data.get('diagram', obj.diagram)
        obj.revision += 1
        obj.save(update_fields=['code', 'diagram', 'revision'])
        return Response({'revision': obj.revision})

    def delete(self, request, pk):
        owned(request, pk).delete()
        return Response(status=204)


class Turn(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIThrottle]

    @transaction.atomic
    def post(self, request, pk):
        data = validated(TurnSerializer, request.data)
        obj = owned(request, pk, True)
        if obj.messages.filter(role='assistant', request_id=data['request_id']).exists():
            return Response(session_data(obj))
        active(obj)
        options = StudioSettings.objects.filter(name='default').first()
        policy = ai.policy_for(obj.configuration['persona'], options.persona_policies if options else {})
        stages = ai.STAGE_SETS[obj.snapshot['kind']]
        transcript = list(obj.messages.values('role', 'content'))
        if len(transcript) >= 120 or sum(len(m['content']) for m in transcript) + len(data['content']) > 80000:
            raise ValidationError('This session has reached its conversation limit. Finish it to save your report and start another session.')
        context = {'problem': ai.public_problem(obj.snapshot), 'candidate': obj.configuration, 'stage': stages[obj.stage], 'conversation': transcript, 'candidate_message': data['content'], 'code': obj.code, 'diagram': obj.diagram, 'automated_tests': evidence_for(obj)}
        try:
            result = ai.generate(request.user, 'interview', policy['style'] + ' Stay on the fixed question. Do not reveal a complete solution or volunteer hints. Ask only one follow-up. Assess the current stage; set advance only when the candidate has addressed it. Tailor depth to the experience and role. For senior/staff require invariants, reliability and trade-offs.', context, ai.CHAT_SCHEMA)
        except ai.ProviderUnavailable as exc:
            return Response({'detail': str(exc.detail)}, status=503)
        Message.objects.create(session=obj, role='user', content=data['content'], request_id=data['request_id'])
        Message.objects.create(session=obj, role='assistant', content=result['reply'], request_id=data['request_id'])
        turns = obj.messages.filter(role='user').count()
        if result['advance'] and turns >= (obj.stage+1)*policy['min_turns']:
            obj.stage = min(len(stages)-1, obj.stage+1)
            obj.save(update_fields=['stage'])
        Event.objects.create(session=obj, action='turn', data={'stage': obj.stage})
        return Response(session_data(obj))


class Hint(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIThrottle]

    @transaction.atomic
    def post(self, request, pk):
        obj = owned(request, pk, True)
        active(obj)
        config = StudioSettings.objects.filter(name='default').first()
        policy = ai.policy_for(obj.configuration['persona'], config.persona_policies if config else {})
        limit = min(policy['max_hints'], len(obj.snapshot['hints']))
        if obj.hint_level >= limit:
            raise ValidationError('No further hints are available in this interviewer mode.')
        obj.hint_level += 1
        obj.save(update_fields=['hint_level'])
        Message.objects.create(session=obj, role='assistant', content=f'Hint {obj.hint_level}: {obj.snapshot["hints"][obj.hint_level-1]}')
        Event.objects.create(session=obj, action='hint', data={'level': obj.hint_level})
        return Response(session_data(obj))


class Runs(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [RunThrottle]

    @transaction.atomic
    def post(self, request, pk):
        obj = owned(request, pk, True)
        active(obj)
        data = validated(RunSerializer, request.data)
        if obj.configuration['run_mode'] == 'no-run':
            raise ValidationError('Execution is disabled for this no-run interview.')
        if obj.snapshot['kind'] != 'coding':
            raise ValidationError('This session is a design exercise.')
        if not settings.STUDIO_EXECUTION_ENABLED:
            return Response({'detail': 'The isolated execution worker is not configured. Your draft is saved.'}, status=503)
        if Submission.objects.filter(session__user=request.user, status__in=['queued', 'running']).count() >= 3:
            return Response({'detail': 'You already have three pending runs. Wait for a result.'}, status=429)
        obj_run = Submission.objects.create(session=obj, language=obj.configuration['language'], code=obj.code, **data)
        Event.objects.create(session=obj, action='execution_queued', data={'submission': str(obj_run.id), 'mode': data['mode']})
        return Response(submission_data(obj_run), status=202)

    def get(self, request, pk):
        return Response([submission_data(s) for s in owned(request, pk).submissions.all()[:30]])


class Finish(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIThrottle]

    @transaction.atomic
    def post(self, request, pk):
        obj = owned(request, pk, True)
        if obj.status == 'active':
            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save(update_fields=['status', 'completed_at'])
            Event.objects.create(session=obj, action='completed')
        if hasattr(obj, 'evaluation'):
            return Response(report_data(obj.evaluation))
        if obj.submissions.filter(status__in=['queued', 'running']).exists():
            return Response({'detail': 'Execution is still pending. Request the report after the worker finishes.'}, status=409)
        config = StudioSettings.objects.filter(name='default').first()
        weights = config.weights if config else DEFAULT_WEIGHTS
        evidence = evidence_for(obj)
        try:
            result = ai.generate(request.user, 'evaluation', 'Evaluate each dimension from 1 to 4 using the transcript and code. Explain every score with a specific observation or state that evidence is missing. Missing evidence must not be treated as demonstrated skill. For design work assess the requirements, capacity, APIs, storage, scaling, reliability, security and trade-offs within the six dimensions. Never invent execution. Return actionable revision recommendations. This is educational feedback.', {'problem': ai.public_problem(obj.snapshot), 'configuration': obj.configuration, 'transcript': list(obj.messages.values('role', 'content')), 'code': obj.code, 'diagram': obj.diagram, 'hints_used': obj.hint_level, 'automated_tests': evidence}, ai.EVALUATION_SCHEMA)
        except ai.ProviderUnavailable as exc:
            return Response({'detail': str(exc.detail), 'session_completed': True}, status=503)
        dims = result.pop('dimensions')
        score = round(sum(weights[k]*dims[k]['rating']/4 for k in weights), 1)
        report = Evaluation.objects.create(session=obj, dimensions=dims, score=score, feedback=result, weights=weights.copy(), evidence=evidence)
        return Response(report_data(report))


class Analytics(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Session.objects.filter(user=request.user)
        days = request.query_params.get('days', '')
        if days in ['7', '30', '90']:
            qs = qs.filter(started_at__gte=timezone.now()-timedelta(days=int(days)))
        reports = Evaluation.objects.filter(session__in=qs)
        submissions = Submission.objects.filter(session__in=qs, status='finished', mode='submit')
        solved = set()
        for sub in submissions.select_related('session'):
            if sub.results and all(r.get('passed') is True for r in sub.results):
                solved.add(sub.session.problem_id)
        attempted = submissions.values('session__problem').distinct().count()
        activity = list(qs.annotate(day=models_date()).values('day').annotate(count=Count('id')).order_by('day'))
        dimensions = {k: round(sum(r.dimensions[k]['rating'] for r in reports)/reports.count(), 2) if reports.exists() else None for k in DEFAULT_WEIGHTS}
        return Response({'total_interviews': qs.filter(configuration__mode='interview').count(), 'completed': qs.filter(status='completed').count(), 'active': qs.filter(status='active', deadline__gt=timezone.now()).count(), 'average_score': reports.aggregate(value=Avg('score'))['value'], 'problems_attempted': attempted, 'problems_solved': len(solved), 'accuracy': round(len(solved)/attempted*100, 1) if attempted else None, 'activity': activity, 'dimensions': dimensions})


def models_date():
    from django.db.models.functions import TruncDate
    return TruncDate('started_at')


class Records(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = LearningRecord.objects.filter(user=request.user)
        if request.query_params.get('kind'):
            qs = qs.filter(kind=request.query_params['kind'])
        return Response(RecordSerializer(qs.order_by('-updated_at')[:100], many=True).data)

    def put(self, request):
        data = validated(RecordSerializer, request.data)
        obj, _ = LearningRecord.objects.update_or_create(user=request.user, kind=data['kind'], key=data['key'], defaults={'data': data['data']})
        return Response(RecordSerializer(obj).data)

    def delete(self, request):
        get_object_or_404(LearningRecord, user=request.user, pk=request.query_params.get('id')).delete()
        return Response(status=204)


class Tutor(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIThrottle]

    @transaction.atomic
    def post(self, request):
        data = validated(TurnSerializer, request.data)
        key = request.data.get('conversation_id', 'default')
        if not isinstance(key, str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,80}', key):
            raise ValidationError('Invalid conversation ID.')
        conversation, _ = LearningRecord.objects.get_or_create(user=request.user, kind='tutor', key=key)
        conversation = LearningRecord.objects.select_for_update().get(pk=conversation.pk)
        turns = conversation.data.get('messages', [])
        if any(t.get('request_id') == str(data['request_id']) for t in turns):
            return Response(conversation.data)
        # Transparent lexical retrieval. Only approved, original material is searched.
        terms = set(re.findall(r'[a-z]{3,}', data['content'].lower()))
        docs = list(Problem.objects.filter(published=True).exclude(editorial=''))
        docs.sort(key=lambda p: len(terms & set(re.findall(r'[a-z]{3,}', (p.title+' '+' '.join(p.topics)+' '+p.editorial).lower()))), reverse=True)
        selected = [p for p in docs[:3] if terms & set(re.findall(r'[a-z]{3,}', (p.title+' '+' '.join(p.topics)+' '+p.editorial).lower()))]
        sources = [{'id': p.id, 'title': p.title, 'text': p.editorial, 'complexity': p.complexity} for p in selected]
        try:
            result = ai.generate(request.user, 'tutor', 'Teach with a small example. Treat only retrieved sources as approved Coding Hubs material; explicitly say when sources do not establish an answer. Never claim to quote an unavailable course. Return only IDs from the supplied sources. Ask the learner to try before revealing a full solution.', {'question': data['content'], 'conversation': turns[-12:], 'retrieved_sources': sources}, ai.TUTOR_SCHEMA)
        except ai.ProviderUnavailable as exc:
            return Response({'detail': str(exc.detail)}, status=503)
        if set(result['sources']) - {p.id for p in selected}:
            return Response({'detail': 'The tutor returned an unverified source. Please retry.'}, status=503)
        turns += [{'role': 'user', 'content': data['content'], 'request_id': str(data['request_id'])}, {'role': 'assistant', 'content': result['reply'], 'sources': [{'id': p.id, 'title': p.title} for p in selected if p.id in result['sources']]}]
        conversation.data = {'messages': turns[-60:]}
        conversation.save(update_fields=['data', 'updated_at'])
        return Response(conversation.data)


class AdminProblems(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProblemAdminSerializer
    queryset = Problem.objects.all()


class AdminProblem(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProblemAdminSerializer
    queryset = Problem.objects.all()


class AdminSettings(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        obj, _ = StudioSettings.objects.get_or_create(name='default')
        return Response(SettingsSerializer(obj).data)

    def patch(self, request):
        obj, _ = StudioSettings.objects.get_or_create(name='default')
        serializer = SettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminOverview(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response({'sessions': Session.objects.count(), 'students': Session.objects.values('user').distinct().count(), 'completed': Session.objects.filter(status='completed').count(), 'ai_calls': Usage.objects.count(), 'ai_failures': Usage.objects.filter(success=False).count(), 'input_tokens': sum(Usage.objects.values_list('input_tokens', flat=True)), 'output_tokens': sum(Usage.objects.values_list('output_tokens', flat=True)), 'executions': Submission.objects.count(), 'queued': Submission.objects.filter(status='queued').count()})
