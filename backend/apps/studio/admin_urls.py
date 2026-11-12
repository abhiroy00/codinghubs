from django.urls import path
from . import views
urlpatterns = [
    path('studio/problems/', views.AdminProblems.as_view()),
    path('studio/problems/<int:pk>/', views.AdminProblem.as_view()),
    path('studio/settings/', views.AdminSettings.as_view()),
    path('studio/overview/', views.AdminOverview.as_view()),
]
