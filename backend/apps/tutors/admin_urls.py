from django.urls import path

from .views import TutorAdminDetailView, TutorAdminListView, TutorImageUploadView

urlpatterns = [
    path('', TutorAdminListView.as_view(), name='admin-tutors'),
    path('upload-image/', TutorImageUploadView.as_view(), name='admin-tutor-image-upload'),
    path('<int:pk>/', TutorAdminDetailView.as_view(), name='admin-tutor'),
]
