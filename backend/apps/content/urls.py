from django.urls import path

from . import views

urlpatterns = [
    path('blogs/', views.PublicBlogList.as_view()),
    path('blogs/<slug:slug>/', views.PublicBlogDetail.as_view()),
    path('blog-categories/', views.PublicBlogCategories.as_view()),
    path('blog-tags/', views.PublicBlogTags.as_view()),
    path('testimonials/', views.PublicTestimonials.as_view()),
    path('case-studies/', views.PublicCaseList.as_view()),
    path('case-studies/<slug:slug>/', views.PublicCaseDetail.as_view()),
]
