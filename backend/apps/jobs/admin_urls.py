from django.urls import path

from .views import JobAdminDetailView, JobAdminListView, JobLogoUploadView

urlpatterns = [
    path('', JobAdminListView.as_view(), name='admin-jobs'),
    path('upload-logo/', JobLogoUploadView.as_view(), name='admin-job-logo-upload'),
    path('<int:pk>/', JobAdminDetailView.as_view(), name='admin-job'),
]
