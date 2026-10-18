from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'course', 'mode', 'created_at')
    list_filter = ('mode', 'created_at')
    search_fields = ('name', 'phone', 'course')
