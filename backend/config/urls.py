from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/enrollments/', include('apps.enrollments.urls')),
]
