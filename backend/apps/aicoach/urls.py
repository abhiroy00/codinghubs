from django.urls import path

from .views import EvaluateAnswerView, EvaluationDetailView, EvaluationHistoryView

urlpatterns = [
    path('evaluate-answer/', EvaluateAnswerView.as_view(), name='ai-evaluate-answer'),
    path('evaluate-answer/history/', EvaluationHistoryView.as_view(), name='ai-evaluate-history'),
    path('evaluate-answer/<int:pk>/', EvaluationDetailView.as_view(), name='ai-evaluate-detail'),
]
