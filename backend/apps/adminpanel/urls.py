from django.urls import path

from . import views

urlpatterns = [
    path('login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('stats/', views.StatsView.as_view(), name='admin-stats'),
    path('leads/', views.LeadListView.as_view(), name='admin-leads'),
    path('leads/export/', views.LeadExportView.as_view(), name='admin-leads-export'),
    path('leads/<int:pk>/', views.LeadDetailView.as_view(), name='admin-lead'),
    path('users/', views.UserListView.as_view(), name='admin-users'),
    path('enrollments/', views.EnrollmentListView.as_view(), name='admin-enrollments'),
    path('orders/', views.OrderListView.as_view(), name='admin-orders'),
    path('courses/', views.CourseListView.as_view(), name='admin-courses'),
    path('courses/<int:pk>/', views.CourseDetailView.as_view(), name='admin-course'),
]
