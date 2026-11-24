from django.urls import path

from . import admin_api as v

urlpatterns = [
    path('certificate-applications/', v.ApplicationList.as_view()),
    path('certificate-applications/<int:pk>/approve/', v.ApplicationApprove.as_view()),
    path('certificate-applications/<int:pk>/reject/', v.ApplicationReject.as_view()),
    path('certificates/', v.CertificateList.as_view()),
    path('certificates/<int:pk>/reissue/', v.CertificateReissue.as_view()),
    path('certificates/<int:pk>/revoke/', v.CertificateRevoke.as_view()),
    path('certificates/<int:pk>/link/', v.CertificateLink.as_view()),
]
