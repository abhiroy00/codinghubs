from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import CourseCategoryViewSet, CourseCertificateListView, CourseQuestionListView, CourseViewSet, LearningProgressListView, LearningProgressView, PrepCurriculumView, PrepLessonView

router = DefaultRouter()
router.register('categories', CourseCategoryViewSet, basename='course-category')
router.register('', CourseViewSet, basename='course')

urlpatterns = [
    path('prep/<slug:slug>/', PrepCurriculumView.as_view(), name='prep-curriculum'),
    path('prep/<slug:slug>/<int:day>/', PrepLessonView.as_view(), name='prep-lesson'),
    path('questions/<slug:slug>/', CourseQuestionListView.as_view(), name='course-questions'),
    path('certificates/', CourseCertificateListView.as_view(), name='course-certificates'),
    path('learning/progress/', LearningProgressListView.as_view(), name='learning-progress-list'),
    path('learning/progress/<slug:slug>/', LearningProgressView.as_view(), name='learning-progress'),
] + router.urls
