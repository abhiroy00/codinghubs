from django.contrib import admin

from .models import Tutor, TutorBooking


@admin.register(Tutor)
class TutorAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'designation', 'experience', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('full_name', 'designation', 'bio')


@admin.register(TutorBooking)
class TutorBookingAdmin(admin.ModelAdmin):
    list_display = ('reference', 'student_name', 'student_email', 'tutor', 'course', 'preferred_date', 'status', 'created_at')
    list_filter = ('status', 'session_type', 'preferred_date', 'tutor')
    search_fields = ('student_name', 'student_email', 'course', 'tutor__full_name')
    readonly_fields = ('submission_key', 'created_at', 'updated_at')
