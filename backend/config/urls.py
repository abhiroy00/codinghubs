from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from apps.accounts.interview import Resources, legacy_redirect
from apps.newsletter import ssr as newsletter_ssr
from apps.newsletter.urls import admin_urlpatterns as newsletter_admin_urls
from apps.learning.ssr import academy_page, learning_page, sitemap as learning_sitemap
from apps.content.directory_ssr import directory_page, directory_sitemap
from apps.courses import pages as course_pages

urlpatterns = [
    path('newsletter/', newsletter_ssr.newsletter),
    path('newsletter/issues/<slug:slug>/', newsletter_ssr.issue),
    path('brochures/', newsletter_ssr.brochures),
    re_path(r'^interview-prep(?:/(?P<remainder>.*))?$', legacy_redirect),
    path('api/interview/resources/', Resources.as_view()),
    path('book-a-tutor', directory_page, {'kind': 'tutors'}),
    path('book-a-tutor/', directory_page, {'kind': 'tutors'}),
    path('book-a-tutor/<str:key>', directory_page, {'kind': 'tutors'}),
    path('book-a-tutor/<str:key>/', directory_page, {'kind': 'tutors'}),
    path('latest-jobs', directory_page, {'kind': 'jobs'}),
    path('latest-jobs/', directory_page, {'kind': 'jobs'}),
    path('latest-jobs/<slug:key>', directory_page, {'kind': 'jobs'}),
    path('latest-jobs/<slug:key>/', directory_page, {'kind': 'jobs'}),
    path('sitemap-directory.xml', directory_sitemap),
    path('learn/', academy_page),
    path('learn/<slug:course>/', learning_page),
    path('learn/<slug:course>/<slug:slug>/', learning_page),
    path('sitemap-learning.xml', learning_sitemap),
    path('api/learning/', include('apps.learning.urls')),
    path('api/admin/', include('apps.learning.admin_urls')),
    path('admin/', admin.site.urls),
    path('api/newsletter/', include('apps.newsletter.urls')),
    path('api/admin/', include(newsletter_admin_urls)),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/studio/v1/', include('apps.studio.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/ai/', include('apps.aicoach.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/enrollments/', include('apps.enrollments.urls')),
    path('api/admin/', include('apps.adminpanel.urls')),
    path('api/admin/', include('apps.studio.admin_urls')),
    path('api/tutors/', include('apps.tutors.urls')),
    path('api/gigs/', include('apps.gigs.urls')),
    path('api/jobs/', include('apps.jobs.urls')),
    path('api/admin/', include('apps.content.admin_urls')),
    path('api/admin/', include('apps.shop.admin_urls')),
    path('api/', include('apps.shop.urls')),
    path('api/', include('apps.content.urls')),
    path('', include('apps.content.ssr_urls')),
    path('courses/<slug:slug>/', course_pages.course_page),
    path('', include('apps.shop.ssr_urls')),
    path('', include('apps.gigs.ssr_urls')),
]

if settings.DEBUG:  # local development only; in production nginx serves /media/ from the shared volume
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
