from django.contrib import admin
from django import forms

from .course_catalog import COURSE_CHOICES
from .models import Course, CourseCategory, CourseCertificate, CourseQuestion


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


class CourseQuestionAdminForm(forms.ModelForm):
    course_slug = forms.ChoiceField(choices=COURSE_CHOICES, label='Course')

    class Meta:
        model = CourseQuestion
        fields = '__all__'

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.course_name = dict(COURSE_CHOICES)[instance.course_slug]
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(CourseQuestion)
class CourseQuestionAdmin(admin.ModelAdmin):
    form = CourseQuestionAdminForm
    list_display = ('course_name', 'level', 'topic', 'question_preview', 'is_published', 'updated_at')
    list_filter = ('course_slug', 'level', 'is_published')
    list_editable = ('is_published',)
    search_fields = ('course_name', 'topic', 'question', 'answer')
    readonly_fields = ('seed_key', 'question_key', 'created_at', 'updated_at')
    actions = ('publish_questions', 'unpublish_questions')
    fieldsets = (
        ('Placement', {'fields': ('course_slug', 'level', 'topic', 'is_published')}),
        ('Interview question', {'fields': ('question', 'answer', 'explanation', 'example')}),
        ('Coding exercise (optional)', {'fields': ('coding_prompt', 'coding_solution')}),
        ('Seed metadata', {'classes': ('collapse',), 'fields': ('seed_key', 'question_key', 'created_at', 'updated_at')}),
    )

    @admin.display(description='Question')
    def question_preview(self, obj):
        return obj.question[:100]

    @admin.action(description='Publish selected questions')
    def publish_questions(self, request, queryset):
        queryset.update(is_published=True)

    @admin.action(description='Unpublish selected questions')
    def unpublish_questions(self, request, queryset):
        queryset.update(is_published=False)


@admin.register(CourseCertificate)
class CourseCertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_id', 'user', 'course_slug', 'completed_at')
    list_filter = ('course_slug',)
    search_fields = ('user__username', 'user__email', 'course_slug')
    readonly_fields = ('user', 'course_slug', 'certificate_id', 'completed_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
