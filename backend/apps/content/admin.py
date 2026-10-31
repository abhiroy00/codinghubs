from django.contrib import admin

from .models import Testimonial


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'is_published', 'permission_confirmed', 'position', 'created_at')
    list_filter = ('is_published', 'permission_confirmed')
    search_fields = ('name', 'course', 'text')
