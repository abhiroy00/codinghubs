from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'course', 'mode', 'status', 'whatsapp_consent', 'source_page', 'created_at')
    list_filter = ('status', 'mode', 'whatsapp_consent', 'created_at')
    search_fields = ('name', 'phone', 'email', 'course')
