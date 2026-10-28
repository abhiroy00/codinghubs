from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/enrollments/', include('apps.enrollments.urls')),
    path('api/admin/', include('apps.adminpanel.urls')),
    path('api/tutors/', include('apps.tutors.urls')),
    path('api/admin/', include('apps.content.admin_urls')),
    path('api/', include('apps.content.urls')),
    path('', include('apps.content.ssr_urls')),
]

if settings.DEBUG:  # local development only; in production nginx serves /media/ from the shared volume
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
