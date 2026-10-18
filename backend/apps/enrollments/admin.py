from django.contrib import admin

from .models import Enrollment


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'order', 'enrolled_at')
    list_filter = ('course',)
    search_fields = ('user__username', 'user__email', 'course__name')
