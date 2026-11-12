from django.urls import path
from . import views

urlpatterns = [
    path('catalog/', views.Catalog.as_view()),
    path('problems/', views.ProblemList.as_view()),
    path('sessions/', views.Sessions.as_view()),
    path('sessions/<uuid:pk>/', views.SessionDetail.as_view()),
    path('sessions/<uuid:pk>/turn/', views.Turn.as_view()),
    path('sessions/<uuid:pk>/hint/', views.Hint.as_view()),
    path('sessions/<uuid:pk>/runs/', views.Runs.as_view()),
    path('sessions/<uuid:pk>/finish/', views.Finish.as_view()),
    path('analytics/', views.Analytics.as_view()),
    path('records/', views.Records.as_view()),
    path('tutor/', views.Tutor.as_view()),
    path('admin/problems/', views.AdminProblems.as_view()),
    path('admin/problems/<int:pk>/', views.AdminProblem.as_view()),
    path('admin/settings/', views.AdminSettings.as_view()),
    path('admin/overview/', views.AdminOverview.as_view()),
]
