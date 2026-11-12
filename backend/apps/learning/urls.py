from django.urls import path
from .views import ConceptView, CourseCatalogView, CurriculumView, DeploymentStatusView, ProgressView, QuizView
from .assessments import LearningSummaryView, QuizHistoryView, SubmissionsView
from .documents import DocumentsView, DocumentDetailView, DocumentDownloadView
from rest_framework.routers import SimpleRouter
from .research import ClaimViewSet, SourceViewSet

router = SimpleRouter()
router.register('research/sources', SourceViewSet)
router.register('research/claims', ClaimViewSet)

urlpatterns = [
    path('release/', DeploymentStatusView.as_view()),
    path('documents/', DocumentsView.as_view()),
    path('documents/download/', DocumentDownloadView.as_view()),
    path('documents/<int:pk>/', DocumentDetailView.as_view()),
    path('courses/', CourseCatalogView.as_view()),
    path('summary/', LearningSummaryView.as_view()),
    path('concepts/<slug:slug>/submissions/', SubmissionsView.as_view()),
    path('concepts/<slug:slug>/quiz-attempts/', QuizHistoryView.as_view()),
    path('curriculum/', CurriculumView.as_view()),
    path('progress/', ProgressView.as_view()),
    path('concepts/<slug:slug>/', ConceptView.as_view()),
    path('concepts/<slug:slug>/progress/', ProgressView.as_view()),
    path('concepts/<slug:slug>/quiz/', QuizView.as_view()),
]
urlpatterns += router.urls
