from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.courses.models import PrepCurriculum, PrepLesson
from apps.courses.prep_schema import is_placeholder

from .ai_services.errors import AIAllProvidersFailed, AIDailyLimitReached, AIError
from .evaluation import evaluate_answer
from .models import AnswerEvaluation

LEVELS = ('beginner', 'intermediate', 'advanced')
FAILURE_STATUS = {'busy': status.HTTP_429_TOO_MANY_REQUESTS, 'unavailable': status.HTTP_503_SERVICE_UNAVAILABLE,
                  'not_configured': status.HTTP_503_SERVICE_UNAVAILABLE, 'invalid': status.HTTP_502_BAD_GATEWAY}


class AIBurstThrottle(UserRateThrottle):
    """Stops a user firing AI requests in quick succession; the daily limit is enforced separately by the AI layer."""
    scope = 'ai_burst'


def ai_error_response(error):
    """Map an AI-layer error to an HTTP response. Only the user-safe message is returned, never provider details."""
    if isinstance(error, AIDailyLimitReached):
        code, http = 'daily_limit', status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(error, AIAllProvidersFailed):
        code, http = error.kind, FAILURE_STATUS[error.kind]
    else:
        code, http = 'ai_error', status.HTTP_502_BAD_GATEWAY
    return Response({'detail': error.user_message, 'code': code}, status=http)


class EvaluateAnswerSerializer(serializers.Serializer):
    """Either a custom `question`, or a lesson question given as course_slug + day + question_index (then the server supplies the question)."""
    question = serializers.CharField(required=False, allow_blank=True, max_length=1000, trim_whitespace=True)
    answer = serializers.CharField(min_length=10, max_length=5000, trim_whitespace=True)
    topic = serializers.CharField(required=False, allow_blank=True, max_length=120)
    level = serializers.ChoiceField(choices=LEVELS, required=False, default='intermediate')
    course_slug = serializers.SlugField(required=False, max_length=120)
    day = serializers.IntegerField(required=False, min_value=1, max_value=30)
    question_index = serializers.IntegerField(required=False, min_value=0, max_value=19)

    def validate(self, attrs):
        reference = [name for name in ('course_slug', 'day', 'question_index') if name in attrs]
        if reference and len(reference) != 3:
            raise serializers.ValidationError('To use a lesson question send course_slug, day and question_index together.')
        if not reference and len(attrs.get('question', '')) < 5:
            raise serializers.ValidationError({'question': 'Send the interview question (at least 5 characters), or a lesson reference.'})
        return attrs


def summary(evaluation):
    return {'id': evaluation.id, 'question': evaluation.question[:200], 'score': evaluation.score,
            'course_slug': evaluation.course_slug, 'day': evaluation.day, 'created_at': evaluation.created_at}


def detail(evaluation):
    return {**summary(evaluation), 'question': evaluation.question, 'answer': evaluation.answer, **evaluation.result}


class EvaluateAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIBurstThrottle]

    def post(self, request):
        serializer = EvaluateAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        question, topic, reference, used_reference = data.get('question', ''), data.get('topic', ''), '', False
        if 'course_slug' in data:
            curriculum = PrepCurriculum.for_course(data['course_slug'])
            lesson = PrepLesson.objects.filter(curriculum=curriculum, day=data['day']).first() if curriculum else None
            interview = lesson.content.get('interview', []) if lesson else []
            if data['question_index'] >= len(interview):
                return Response({'detail': 'That lesson question was not found.'}, status=status.HTTP_404_NOT_FOUND)
            item = interview[data['question_index']]
            question, topic = item['question'], topic or curriculum.title
            if not is_placeholder(lesson.as_lesson()):  # template filler is not a real model answer, so never use it as a reference
                reference, used_reference = f'{item["answer"]} {item["explanation"]}', True
        try:
            result, response = evaluate_answer(user=request.user, question=question, answer=data['answer'], topic=topic, level=data['level'], reference=reference)
        except AIError as error:
            return ai_error_response(error)
        evaluation = AnswerEvaluation.objects.create(
            user=request.user, course_slug=data.get('course_slug', ''), day=data.get('day'), question_index=data.get('question_index'),
            question=question, answer=data['answer'], score=result['score'], result=result, provider=response.provider, model=response.model,
        )
        return Response({**detail(evaluation), 'used_reference': used_reference}, status=status.HTTP_201_CREATED)


class EvaluationHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([summary(e) for e in AnswerEvaluation.objects.filter(user=request.user)[:20]])


class EvaluationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        evaluation = AnswerEvaluation.objects.filter(user=request.user, pk=pk).first()  # another user's id looks exactly like a missing one
        if evaluation is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(detail(evaluation))
