from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import Course, CourseCategory, CourseCertificate, CourseQuestion, LearningProgress, PrepCurriculum, PrepLesson
from .serializers import CourseCategorySerializer, CourseCertificateSerializer, CourseQuestionSerializer, CourseSerializer, LearningProgressSerializer


class CourseCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseCategory.objects.prefetch_related('courses').all()
    serializer_class = CourseCategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.filter(is_active=True).select_related('category')
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class LearningProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        progress, _ = LearningProgress.objects.get_or_create(user=request.user, course_slug=slug)
        return Response(LearningProgressSerializer(progress).data)

    def put(self, request, slug):
        progress, _ = LearningProgress.objects.get_or_create(user=request.user, course_slug=slug)
        serializer = LearningProgressSerializer(progress, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        progress = serializer.save(last_learning_date=timezone.localdate())
        if set(progress.completed_days) == set(range(1, 31)):
            CourseCertificate.objects.get_or_create(user=request.user, course_slug=slug)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LearningProgressListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        progress = LearningProgress.objects.filter(user=request.user)
        return Response(LearningProgressSerializer(progress, many=True).data)


class CourseQuestionListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        queryset = CourseQuestion.objects.filter(course_slug=slug, is_published=True)
        level = request.query_params.get('level')
        if level in {choice[0] for choice in CourseQuestion.LEVEL_CHOICES}:
            queryset = queryset.filter(level=level)
        return Response(CourseQuestionSerializer(queryset, many=True).data)


class CourseCertificateListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        certificates = CourseCertificate.objects.filter(user=request.user)
        return Response(CourseCertificateSerializer(certificates, many=True).data)


class PrepCurriculumView(APIView):
    """The 30-day outline for a course: titles and levels, without the lesson bodies."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        curriculum = PrepCurriculum.for_course(slug)
        if curriculum is None:
            return Response({'detail': 'No prep content for this course.'}, status=status.HTTP_404_NOT_FOUND)
        days = curriculum.lessons.values('day', 'title', 'module', 'level')
        return Response({
            'curriculum': curriculum.slug, 'title': curriculum.title, 'summary': curriculum.summary,
            'source': curriculum.source, 'source_pdf': curriculum.source_pdf, 'days': list(days),
        })


class PrepLessonView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug, day):
        curriculum = PrepCurriculum.for_course(slug)
        lesson = PrepLesson.objects.filter(curriculum=curriculum, day=day).first() if curriculum else None
        if lesson is None:
            return Response({'detail': 'Lesson not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(lesson.as_lesson())
