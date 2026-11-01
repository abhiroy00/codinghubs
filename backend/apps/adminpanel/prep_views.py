"""Admin API for the 30-day interview-prep curricula: edit lessons, reorder days, attach syllabus PDFs."""
import json
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.management.commands.seed_prep_content import LESSON_HEADER
from apps.courses.management.commands.validate_prep_content import CONTENT_DIR
from apps.courses.models import PrepCurriculum, PrepLesson
from apps.courses.prep_schema import LessonError, validate_lesson

from .views import IsStaff


class CurriculumSerializer(serializers.ModelSerializer):
    course_slugs = serializers.ListField(child=serializers.SlugField(max_length=120), allow_empty=False)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = PrepCurriculum
        fields = ('id', 'slug', 'title', 'summary', 'source', 'source_pdf', 'course_slugs', 'lesson_count', 'updated_at')
        read_only_fields = ('id', 'source_pdf', 'updated_at')

    def get_lesson_count(self, obj):
        return obj.lessons.count()

    def validate_course_slugs(self, value):
        taken = {slug for c in PrepCurriculum.objects.exclude(pk=getattr(self.instance, 'pk', None)) for slug in c.course_slugs}
        clash = sorted(set(value) & taken)
        if clash:
            raise serializers.ValidationError(f'Already linked to another curriculum: {", ".join(clash)}')
        return list(dict.fromkeys(value))


def lesson_summary(lesson):
    return {
        'day': lesson.day, 'title': lesson.title, 'module': lesson.module, 'level': lesson.level,
        'practice_kind': lesson.content.get('practice', {}).get('kind', ''),
        'edited_in_admin': lesson.edited_in_admin, 'updated_at': lesson.updated_at,
    }


class CurriculumListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(CurriculumSerializer(PrepCurriculum.objects.all(), many=True).data)

    def post(self, request):
        serializer = CurriculumSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CurriculumDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, pk):
        curriculum = PrepCurriculum.objects.filter(pk=pk).first()
        if curriculum is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response({**CurriculumSerializer(curriculum).data, 'lessons': [lesson_summary(l) for l in curriculum.lessons.all()]})

    def patch(self, request, pk):
        curriculum = PrepCurriculum.objects.filter(pk=pk).first()
        if curriculum is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = CurriculumSerializer(curriculum, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CurriculumPdfUploadView(APIView):
    permission_classes = [IsStaff]
    MAX_UPLOAD = 20 * 1024 * 1024

    def post(self, request, pk):
        curriculum = PrepCurriculum.objects.filter(pk=pk).first()
        uploaded = request.FILES.get('file')
        if curriculum is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not uploaded:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size > self.MAX_UPLOAD:
            return Response({'detail': 'PDF is larger than 20 MB.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        data = uploaded.read()
        if not data.startswith(b'%PDF-'):
            return Response({'detail': 'Upload a PDF file.'}, status=status.HTTP_400_BAD_REQUEST)
        saved = default_storage.save(f'prep-pdfs/{curriculum.slug}-{uuid.uuid4().hex[:8]}.pdf', ContentFile(data))
        curriculum.source_pdf = f'{settings.MEDIA_URL}{saved}'
        if not curriculum.source or curriculum.source == 'authored':
            curriculum.source = uploaded.name[:200]
        curriculum.save()
        return Response(CurriculumSerializer(curriculum).data, status=status.HTTP_201_CREATED)


class LessonDetailView(APIView):
    """GET the full lesson; PUT replaces it (creating the day if missing); DELETE removes the day."""
    permission_classes = [IsStaff]

    def get(self, request, pk, day):
        lesson = PrepLesson.objects.filter(curriculum_id=pk, day=day).first()
        if lesson is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response({**lesson.as_lesson(), 'edited_in_admin': lesson.edited_in_admin})

    def put(self, request, pk, day):
        curriculum = PrepCurriculum.objects.filter(pk=pk).first()
        if curriculum is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        payload = {k: v for k, v in request.data.items() if k != 'edited_in_admin'}
        payload['day'] = day
        try:
            validate_lesson(payload, day)
        except LessonError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        lesson, created = PrepLesson.objects.update_or_create(
            curriculum=curriculum, day=day,
            defaults={
                'title': payload['title'], 'module': payload['module'], 'level': payload['level'],
                'content': {k: v for k, v in payload.items() if k not in LESSON_HEADER},
                'edited_in_admin': True,
            },
        )
        return Response({**lesson.as_lesson(), 'edited_in_admin': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, pk, day):
        deleted, _ = PrepLesson.objects.filter(curriculum_id=pk, day=day).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


class LessonResetView(APIView):
    """Restore a lesson to the version shipped in prep_content/ and let future deploys update it again."""
    permission_classes = [IsStaff]

    def post(self, request, pk, day):
        curriculum = PrepCurriculum.objects.filter(pk=pk).first()
        path = CONTENT_DIR / (curriculum.slug if curriculum else '_') / f'day-{day:02d}.json'
        if curriculum is None or not path.exists():
            return Response({'detail': 'No original version exists for this day.'}, status=status.HTTP_404_NOT_FOUND)
        original = json.loads(path.read_text(encoding='utf-8'))
        lesson, _ = PrepLesson.objects.update_or_create(
            curriculum=curriculum, day=day,
            defaults={
                'title': original['title'], 'module': original['module'], 'level': original['level'],
                'content': {k: v for k, v in original.items() if k not in LESSON_HEADER},
                'edited_in_admin': False,
            },
        )
        return Response({**lesson.as_lesson(), 'edited_in_admin': False})


class LessonSwapView(APIView):
    """Reorder by swapping two days. Both lessons are marked as edited so a deploy does not undo the order."""
    permission_classes = [IsStaff]

    @transaction.atomic
    def post(self, request, pk):
        try:
            a, b = int(request.data.get('day_a')), int(request.data.get('day_b'))
        except (TypeError, ValueError):
            return Response({'detail': 'day_a and day_b are required.'}, status=status.HTTP_400_BAD_REQUEST)
        first = PrepLesson.objects.filter(curriculum_id=pk, day=a).first()
        second = PrepLesson.objects.filter(curriculum_id=pk, day=b).first()
        if not first or not second or a == b:
            return Response({'detail': 'Both days must exist and differ.'}, status=status.HTTP_400_BAD_REQUEST)
        first.day = 0
        first.save(update_fields=['day'])
        second.day, second.edited_in_admin = a, True
        second.save(update_fields=['day', 'edited_in_admin'])
        first.day, first.edited_in_admin = b, True
        first.save(update_fields=['day', 'edited_in_admin'])
        return Response({'lessons': [lesson_summary(l) for l in PrepLesson.objects.filter(curriculum_id=pk)]})
