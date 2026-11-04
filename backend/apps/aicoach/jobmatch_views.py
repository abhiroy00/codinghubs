from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import jobmatch as engine
from .ai_services.errors import AIError
from .models import JobMatch, Resume
from .views import AIBurstThrottle, ai_error_response


class MatchSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField(min_value=1)
    job_description = serializers.CharField(min_length=engine.MIN_JD_CHARS, max_length=engine.MAX_JD_CHARS, trim_whitespace=True)
    job_title = serializers.CharField(required=False, allow_blank=True, max_length=100, trim_whitespace=True)
    consent = serializers.BooleanField()

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError('Please confirm that your resume text may be sent to an AI service for analysis.')
        return value


def summary(match):
    return {'id': match.id, 'resume_id': match.resume_id, 'job_title': match.job_title, 'match_percentage': match.match_percentage, 'created_at': match.created_at}


def detail(match):
    return {**summary(match), 'job_description': match.job_description, **match.result}


class JobMatchAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIBurstThrottle]

    def post(self, request):
        serializer = MatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resume = Resume.objects.filter(user=request.user, pk=data['resume_id']).first()  # someone else's resume looks like a missing one
        if resume is None:
            return Response({'detail': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            result, response = engine.match(request.user, resume, data['job_description'], data.get('job_title', ''))
        except AIError as error:
            return ai_error_response(error)
        match = JobMatch.objects.create(user=request.user, resume=resume, job_title=data.get('job_title', ''), job_description=data['job_description'],
                                        match_percentage=result['match_percentage'], result=result, provider=response.provider, model=response.model)
        return Response(detail(match), status=status.HTTP_201_CREATED)


class JobMatchHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([summary(m) for m in JobMatch.objects.filter(user=request.user)[:30]])


class JobMatchDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        match = JobMatch.objects.filter(user=request.user, pk=pk).first()
        if match is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(detail(match))
