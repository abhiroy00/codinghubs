from django.contrib import admin

from .models import AIUsage


@admin.register(AIUsage)
class AIUsageAdmin(admin.ModelAdmin):
    """Read-only log so staff can review AI usage, token counts and provider errors."""
    list_display = ('created_at', 'feature', 'provider', 'model', 'status', 'user', 'prompt_tokens', 'completion_tokens', 'latency_ms')
    list_filter = ('status', 'provider', 'feature')
    search_fields = ('user__username', 'error')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
