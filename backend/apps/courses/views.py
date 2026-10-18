from rest_framework import permissions, viewsets

from .models import Course, CourseCategory
from .serializers import CourseCategorySerializer, CourseSerializer


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
