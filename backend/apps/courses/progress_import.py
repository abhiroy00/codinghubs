from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import LearningProgress, CourseCertificate
from .serializers import LearningProgressSerializer
from .roadmap import allowed_ids


class ImportGuestProgress(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, slug):
        # Validate the course against the existing roadmap registry before storing any state.
        allowed_ids(slug)
        progress, _ = LearningProgress.objects.get_or_create(user=request.user, course_slug=slug)
        progress = LearningProgress.objects.select_for_update().get(pk=progress.pk)
        array_fields = ['completed_days', 'completed_challenges', 'completed_theory', 'completed_questions', 'completed_projects']
        allowed = set(array_fields) | {'current_day', 'quiz_scores'}
        if not isinstance(request.data, dict) or set(request.data) - allowed:
            raise ValidationError('Unknown guest progress field.')
        incoming = LearningProgressSerializer(progress, data=request.data, partial=True)
        incoming.is_valid(raise_exception=True)
        value = dict(incoming.validated_data)
        for field in array_fields:
            value[field] = sorted(set(getattr(progress, field)) | set(value.get(field, [])))
        scores = dict(progress.quiz_scores)
        for day, score in value.get('quiz_scores', {}).items():
            scores[day] = max(scores.get(day, 0), score)
        value['quiz_scores'] = scores
        value['current_day'] = max(progress.current_day, value.get('current_day', 1))
        merged = LearningProgressSerializer(progress, data=value, partial=True)
        merged.is_valid(raise_exception=True)
        result = merged.save(last_learning_date=timezone.localdate())
        if set(result.completed_days) == set(range(1, 31)):
            CourseCertificate.objects.get_or_create(user=request.user, course_slug=slug)
        response = Response(LearningProgressSerializer(result).data)
        response['Cache-Control'] = 'private, no-store'
        return response
