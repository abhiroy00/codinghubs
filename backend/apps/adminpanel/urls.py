from django.urls import include, path

from . import prep_views, views

urlpatterns = [
    path('login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('stats/', views.StatsView.as_view(), name='admin-stats'),
    path('change-password/', views.ChangePasswordView.as_view(), name='admin-change-password'),
    path('leads/', views.LeadListView.as_view(), name='admin-leads'),
    path('leads/export/', views.LeadExportView.as_view(), name='admin-leads-export'),
    path('leads/<int:pk>/', views.LeadDetailView.as_view(), name='admin-lead'),
    path('users/', views.UserListView.as_view(), name='admin-users'),
    path('enrollments/', views.EnrollmentListView.as_view(), name='admin-enrollments'),
    path('orders/', views.OrderListView.as_view(), name='admin-orders'),
    path('courses/', views.CourseListView.as_view(), name='admin-courses'),
    path('courses/<int:pk>/', views.CourseDetailView.as_view(), name='admin-course'),
    path('tutor-bookings/', views.TutorBookingListView.as_view(), name='admin-tutor-bookings'),
    path('tutor-bookings/<int:pk>/', views.TutorBookingDetailView.as_view(), name='admin-tutor-booking'),
    path('questions/', views.QuestionListView.as_view(), name='admin-questions'),
    path('questions/<int:pk>/', views.QuestionDetailView.as_view(), name='admin-question'),
    path('tutors/', include('apps.tutors.admin_urls')),
    path('prep/', prep_views.CurriculumListView.as_view(), name='admin-prep'),
    path('prep/<int:pk>/', prep_views.CurriculumDetailView.as_view(), name='admin-prep-curriculum'),
    path('prep/<int:pk>/upload-pdf/', prep_views.CurriculumPdfUploadView.as_view(), name='admin-prep-pdf'),
    path('prep/<int:pk>/swap/', prep_views.LessonSwapView.as_view(), name='admin-prep-swap'),
    path('prep/<int:pk>/lessons/<int:day>/', prep_views.LessonDetailView.as_view(), name='admin-prep-lesson'),
    path('prep/<int:pk>/lessons/<int:day>/reset/', prep_views.LessonResetView.as_view(), name='admin-prep-lesson-reset'),
    path('jobs/', include('apps.jobs.admin_urls')),
]
