from django.contrib import admin

from .models import Certificate, CertificateApplication, CertificateEvent


@admin.register(CertificateApplication)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'course_name', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('full_name', 'course_name', 'user__email')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('code', 'recipient_name', 'course_name', 'status', 'issued_on')
    list_filter = ('status',)
    search_fields = ('code', 'recipient_name', 'course_name')
    readonly_fields = ('code',)


@admin.register(CertificateEvent)
class EventAdmin(admin.ModelAdmin):
    list_display = ('action', 'certificate', 'application', 'actor', 'at')
    list_filter = ('action',)

    def has_change_permission(self, request, obj=None):
        return False
