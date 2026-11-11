"""Independent, additive roadmap progress; never awards course certificates."""
import json
from functools import lru_cache
from pathlib import Path
from django.db import transaction
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.http import Http404
from .models import RoadmapProgress


@lru_cache(maxsize=64)
def allowed_ids(slug='generative-ai'):
    base = Path(__file__).parent / 'roadmap_content'
    if slug == 'generative-ai':
        levels = json.loads((base / 'manifest.json').read_text(encoding='utf-8'))
    else:
        courses = json.loads((base / 'course-manifest.json').read_text(encoding='utf-8'))
        if slug not in courses:
            raise Http404('Unknown course roadmap.')
        levels = courses[slug]['levels']
    return {kind: {value for level in levels for value in level['progressIds'][kind]} for kind in ('articles', 'questions', 'coding', 'assignments')}


class RoadmapProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug='generative-ai'):
        allowed_ids(slug)
        record, _ = RoadmapProgress.objects.get_or_create(user=request.user, course_slug=slug)
        return Response(record.completed)

    @transaction.atomic
    def put(self, request, slug='generative-ai'):
        allowed = allowed_ids(slug)
        if not isinstance(request.data, dict) or set(request.data) - set(allowed):
            raise ValidationError('Unknown progress category.')
        for kind, values in request.data.items():
            if not isinstance(values, list) or len(values) > len(allowed[kind]) or any(not isinstance(v, str) or v not in allowed[kind] for v in values):
                raise ValidationError({kind: 'Use known roadmap identifiers.'})
        record, _ = RoadmapProgress.objects.get_or_create(user=request.user, course_slug=slug)
        record = RoadmapProgress.objects.select_for_update().get(pk=record.pk)
        record.completed = {kind: sorted(set(record.completed.get(kind, [])) | set(request.data.get(kind, []))) for kind in allowed}
        record.save(update_fields=['completed', 'updated_at'])
        return Response(record.completed)
