from django.urls import path

from . import views
from .models import Blog, CaseStudy
from .serializers import BlogAdminSerializer, CaseStudyAdminSerializer

A = views.action_view


def actions(prefix, model, serializer, revisions_name):
    out = []
    for act in ('publish', 'unpublish', 'archive', 'preview'):
        out.append(path(f'{prefix}/<int:pk>/{act}/', A(model, serializer, act).as_view()))
    rl = type(f'{revisions_name}List', (views.RevisionList,), {'model_class': model})
    rr = type(f'{revisions_name}Restore', (views.RevisionRestore,), {'model_class': model})
    out += [
        path(f'{prefix}/<int:pk>/revisions/', rl.as_view()),
        path(f'{prefix}/<int:pk>/revisions/<int:rev_id>/restore/', rr.as_view()),
    ]
    return out


urlpatterns = [
    path('content/stats/', views.ContentStats.as_view()),
    path('media/', views.MediaUpload.as_view()),
    path('blogs/', views.AdminBlogList.as_view()),
    path('blogs/<int:pk>/', views.AdminBlogDetail.as_view()),
    path('blog-categories/', views.AdminCategoryList.as_view()),
    path('case-studies/', views.AdminCaseList.as_view()),
    path('case-studies/<int:pk>/', views.AdminCaseDetail.as_view()),
    *actions('blogs', Blog, BlogAdminSerializer, 'Blog'),
    *actions('case-studies', CaseStudy, CaseStudyAdminSerializer, 'Case'),
]
