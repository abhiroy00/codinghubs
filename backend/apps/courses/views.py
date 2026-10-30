from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, CourseCategory, LearningProgress
from .serializers import CourseCategorySerializer, CourseSerializer, LearningProgressSerializer


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
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class LearningProgressListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        progress = LearningProgress.objects.filter(user=request.user)
        return Response(LearningProgressSerializer(progress, many=True).data)
