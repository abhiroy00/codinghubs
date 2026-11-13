from django.urls import path

from . import views_public as v

urlpatterns = [
    path('resources/download/<str:token>/', v.serve_download),
    path('projects/', v.ProjectList.as_view()),
    path('projects/<slug:slug>/', v.ProjectDetail.as_view()),
    path('projects/<slug:slug>/questions/', v.ProjectQuestionCreate.as_view()),
    path('projects/<slug:slug>/files/<int:asset_id>/link/', type('ProjectLink', (v.ResourceDownloadLink,), {'kind': 'project'}).as_view()),
    path('project-guides/', v.GuideList.as_view()),
    path('project-guides/<slug:slug>/', v.GuideDetail.as_view()),
    path('project-guides/<slug:slug>/files/<int:asset_id>/link/', v.ResourceDownloadLink.as_view()),
]
