from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import interview as engine
from .ai_services.errors import AIError
from .models import MockInterview
from .views import AIBurstThrottle, ai_error_response


class StartSerializer(serializers.Serializer):
    job_role = serializers.CharField(min_length=2, max_length=80, trim_whitespace=True)
    technology = serializers.CharField(min_length=2, max_length=80, trim_whitespace=True)
    experience_level = serializers.ChoiceField(choices=[c[0] for c in MockInterview.EXPERIENCE])
    difficulty = serializers.ChoiceField(choices=[c[0] for c in MockInterview.DIFFICULTY], default='intermediate')
    interview_type = serializers.ChoiceField(choices=[c[0] for c in MockInterview.TYPES], default='technical')
    number_of_questions = serializers.IntegerField(min_value=3, max_value=15, default=5)


class AnswerSerializer(serializers.Serializer):
    interview_id = serializers.IntegerField(min_value=1)
    answer = serializers.CharField(required=False, allow_blank=True, max_length=5000, trim_whitespace=True)
    skip = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs['skip'] and len(attrs.get('answer', '')) < 10:
            raise serializers.ValidationError({'answer': 'Write your answer (at least 10 characters), or skip the question.'})
        return attrs


class InterviewIdSerializer(serializers.Serializer):
    interview_id = serializers.IntegerField(min_value=1)


def interview_payload(interview):
    answered = interview.turns.filter(answered_at__isnull=False).count()
    return {
        'id': interview.id, 'job_role': interview.job_role, 'technology': interview.technology, 'experience_level': interview.experience_level,
        'difficulty': interview.difficulty, 'current_difficulty': interview.current_difficulty, 'interview_type': interview.interview_type,
        'total_questions': interview.total_questions, 'answered': answered, 'status': interview.status,
        'overall_score': interview.overall_score, 'created_at': interview.created_at, 'ended_at': interview.ended_at,
    }


def question_payload(turn):
    """Only the question: never an evaluation, a prepared follow-up or any answer."""
    return {'number': turn.number, 'text': turn.question, 'kind': turn.kind, 'category': turn.category}


class MockInterviewBase(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIBurstThrottle]

    def dispatch_safely(self, work):
        try:
            return work()
        except engine.InterviewStateError as error:
            return Response({'detail': error.message, 'code': error.code}, status=status.HTTP_409_CONFLICT)
        except AIError as error:
            return ai_error_response(error)

    def find(self, request, interview_id):
        """The user's own interview; someone else's id is indistinguishable from a missing one."""
        return MockInterview.objects.filter(user=request.user, pk=interview_id).first()


class StartInterviewView(MockInterviewBase):
    def post(self, request):
        serializer = StartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        def work():
            interview, turn = engine.start_interview(request.user, serializer.validated_data)
            return Response({'interview': interview_payload(interview), 'question': question_payload(turn)}, status=status.HTTP_201_CREATED)
        return self.dispatch_safely(work)


class SubmitAnswerView(MockInterviewBase):
    def post(self, request):
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        interview = self.find(request, data['interview_id'])
        if interview is None:
            return Response({'detail': 'Interview not found.'}, status=status.HTTP_404_NOT_FOUND)

        def work():
            turn, evaluation = engine.submit_answer(interview, request.user, data.get('answer', ''), data['skip'])
            remaining = max(0, interview.total_questions - interview.turns.count())
            return Response({
                'question_number': turn.number, 'skipped': evaluation is None, 'evaluation': evaluation,
                'current_difficulty': MockInterview.objects.get(pk=interview.pk).current_difficulty,
                'remaining_questions': remaining, 'next_action': 'next_question' if remaining else 'end',
            })
        return self.dispatch_safely(work)


class NextQuestionView(MockInterviewBase):
    def post(self, request):
        serializer = InterviewIdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        interview = self.find(request, serializer.validated_data['interview_id'])
        if interview is None:
            return Response({'detail': 'Interview not found.'}, status=status.HTTP_404_NOT_FOUND)

        def work():
            turn = engine.next_question(interview, request.user)
            return Response({'interview': interview_payload(interview), 'question': question_payload(turn)})
        return self.dispatch_safely(work)


class EndInterviewView(MockInterviewBase):
    def post(self, request):
        serializer = InterviewIdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        interview = self.find(request, serializer.validated_data['interview_id'])
        if interview is None:
            return Response({'detail': 'Interview not found.'}, status=status.HTTP_404_NOT_FOUND)

        def work():
            finished = engine.end_interview(interview, request.user)
            return Response({'interview': interview_payload(finished), 'report': finished.report})
        return self.dispatch_safely(work)


class InterviewHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([interview_payload(i) for i in MockInterview.objects.filter(user=request.user)[:30]])


class InterviewDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        interview = MockInterview.objects.filter(user=request.user, pk=pk).first()
        if interview is None:
            return Response({'detail': 'Interview not found.'}, status=status.HTTP_404_NOT_FOUND)
        turns = [{'number': t.number, 'kind': t.kind, 'category': t.category, 'question': t.question, 'answer': t.answer, 'skipped': t.skipped,
                  'score': t.score, 'evaluation': t.evaluation} for t in interview.turns.all()]
        return Response({'interview': interview_payload(interview), 'turns': turns, 'report': interview.report})
