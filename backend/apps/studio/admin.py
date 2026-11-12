from django.contrib import admin
from .models import Problem, StudioSettings, Session, Usage, Event


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ['title', 'kind', 'difficulty', 'version', 'published']
    list_filter = ['kind', 'difficulty', 'published']
    search_fields = ['title', 'slug']
    readonly_fields = ['version']

    def save_model(self, request, obj, form, change):
        if change:
            obj.version += 1
        super().save_model(request, obj, form, change)


admin.site.register(StudioSettings)


@admin.register(Session, Usage, Event)
class ReadOnlyAuditAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
