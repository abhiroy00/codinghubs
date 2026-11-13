from django.urls import path

from . import views_admin as a
from .models import Project, ProjectGuide
from .serializers import GuideAdminSerializer, ProjectAdminSerializer

urlpatterns = [
    path('projects/', a.ProjectList.as_view()),
    path('projects/<int:pk>/', a.ProjectDetail.as_view()),
    path('project-guides/', a.GuideList.as_view()),
    path('project-guides/<int:pk>/', a.GuideDetail.as_view()),
    path('projects/<int:pk>/assets/', a.asset_upload_view(Project, 'project').as_view()),
    path('project-guides/<int:pk>/assets/', a.asset_upload_view(ProjectGuide, 'guide').as_view()),
    path('assets/<int:pk>/', a.AssetDelete.as_view()),
]
for model, ser, prefix in ((Project, ProjectAdminSerializer, 'projects'), (ProjectGuide, GuideAdminSerializer, 'project-guides')):
    for act in ('publish', 'unpublish', 'archive', 'preview'):
        urlpatterns.append(path(f'{prefix}/<int:pk>/{act}/', a.action_view(model, ser, act).as_view()))
