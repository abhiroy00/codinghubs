from django.urls import path

from .views import JobDetailView, JobListView

urlpatterns = [
    path('', JobListView.as_view(), name='job-list'),
    path('<slug:slug>/', JobDetailView.as_view(), name='job-detail'),
]
