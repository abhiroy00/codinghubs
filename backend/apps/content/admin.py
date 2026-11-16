from django.contrib import admin

from .models import Testimonial


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'rating', 'submitted_by_user', 'is_published', 'permission_confirmed', 'position', 'created_at')
    list_filter = ('is_published', 'permission_confirmed', 'submitted_by_user', 'rating')
    search_fields = ('name', 'course', 'text')
    readonly_fields = ('submitted_by_user', 'created_at')
    actions = ['publish_selected']

    @admin.action(description='Publish selected reviews (permission confirmed only)')
    def publish_selected(self, request, queryset):
        updated = queryset.filter(permission_confirmed=True).update(is_published=True)
        self.message_user(request, f'{updated} review(s) published.')
