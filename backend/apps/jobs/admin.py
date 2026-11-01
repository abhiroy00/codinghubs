from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('title', 'company_name', 'location', 'job_type', 'is_published', 'is_expired', 'application_deadline', 'published_at')
    list_filter = ('is_published', 'is_expired', 'job_type', 'work_mode', 'experience_level')
    search_fields = ('title', 'company_name', 'location')
    readonly_fields = ('slug', 'published_at', 'created_at', 'updated_at')
