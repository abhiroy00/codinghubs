from django.contrib import admin

from .models import Course, CourseCategory


@admin.register(CourseCategory)
class CourseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'color', 'order')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'duration_display', 'placement_rate', 'price', 'is_active', 'order')
    list_filter = ('category', 'is_active')
    list_editable = ('price', 'is_active', 'order')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
