from django.urls import path

from .interview_views import (EndInterviewView, InterviewDetailView, InterviewHistoryView, NextQuestionView, StartInterviewView, SubmitAnswerView)
from .views import EvaluateAnswerView, EvaluationDetailView, EvaluationHistoryView

urlpatterns = [
    path('evaluate-answer/', EvaluateAnswerView.as_view(), name='ai-evaluate-answer'),
    path('evaluate-answer/history/', EvaluationHistoryView.as_view(), name='ai-evaluate-history'),
    path('evaluate-answer/<int:pk>/', EvaluationDetailView.as_view(), name='ai-evaluate-detail'),
    path('mock-interview/start/', StartInterviewView.as_view(), name='ai-interview-start'),
    path('mock-interview/submit-answer/', SubmitAnswerView.as_view(), name='ai-interview-submit'),
    path('mock-interview/next-question/', NextQuestionView.as_view(), name='ai-interview-next'),
    path('mock-interview/end/', EndInterviewView.as_view(), name='ai-interview-end'),
    path('mock-interview/history/', InterviewHistoryView.as_view(), name='ai-interview-history'),
    path('mock-interview/history/<int:pk>/', InterviewDetailView.as_view(), name='ai-interview-detail'),
]
