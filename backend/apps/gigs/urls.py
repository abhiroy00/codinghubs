from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.PilotStatus.as_view()),
    path('', views.Briefs.as_view()),
    path('workspace/', views.Workspace.as_view()),
    path('<slug:slug>/', views.BriefDetail.as_view()),
    path('<slug:slug>/submit/', views.OwnerAction.as_view()),
    path('<slug:slug>/close/', views.CloseBrief.as_view()),
    path('<slug:slug>/proposals/', views.Proposals.as_view()),
    path('<slug:slug>/report/', views.ReportBrief.as_view()),
]
