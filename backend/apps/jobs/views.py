from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination

from apps.tutors.views import IsActiveStaff, TutorImageUploadView

from .models import Job
from .serializers import JobAdminSerializer, JobSerializer


class JobListView(generics.ListAPIView):
    """Published jobs still accepting applications, newest first."""
    permission_classes = [permissions.AllowAny]
    serializer_class = JobSerializer

    def get_queryset(self):
        return Job.open_listings()


class JobDetailView(generics.RetrieveAPIView):
    """Any published job, including expired ones, so old links show an "expired" notice instead of a 404."""
    permission_classes = [permissions.AllowAny]
    serializer_class = JobSerializer
    queryset = Job.objects.filter(is_published=True)
    lookup_field = 'slug'


class JobAdminPage(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class JobAdminListView(generics.ListCreateAPIView):
    permission_classes = [IsActiveStaff]
    serializer_class = JobAdminSerializer
    pagination_class = JobAdminPage

    def get_queryset(self):
        queryset = Job.objects.all()
        if query := self.request.query_params.get('q', '').strip():
            queryset = queryset.filter(Q(title__icontains=query) | Q(company_name__icontains=query))
        status = self.request.query_params.get('status')
        if status == 'published':
            queryset = queryset.filter(is_published=True)
        elif status == 'draft':
            queryset = queryset.filter(is_published=False)
        elif status == 'expired':
            queryset = queryset.filter(is_expired=True)
        return queryset


class JobAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsActiveStaff]
    serializer_class = JobAdminSerializer
    queryset = Job.objects.all()


class JobLogoUploadView(TutorImageUploadView):
    UPLOAD_DIR = 'jobs'
