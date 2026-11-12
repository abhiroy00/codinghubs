from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import HttpResponse
from .models import AssignmentReview, AssignmentSubmission, Chapter, Concept, DraftRevision, EditConflict, Module, Progress, QuizAttempt, Revision
from .forms import ConceptForm
from .editing import EDITABLE, save_draft


@admin.register(Concept)
class ConceptAdmin(admin.ModelAdmin):
    form = ConceptForm
    list_display = ('title', 'chapter', 'status', 'version', 'code_verified')
    list_filter = ('status', 'chapter__module', 'difficulty')
    search_fields = ('title', 'slug')
    filter_horizontal = ('prerequisites',)
    readonly_fields = ('version', 'published', 'updated_at')
    actions = ['publish_reviewed']

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        try:
            return super().changeform_view(request, object_id, form_url, extra_context)
        except EditConflict:
            return HttpResponse('Another editor saved this lesson. Your changes were not saved. Go back to copy your text, then reload.', status=409)

    def save_model(self, request, obj, form, change):
        original = Concept.objects.get(pk=obj.pk) if change else None
        if not self.has_publish_permission(request):
            protected = {'status': obj.status, 'code_verified': obj.code_verified, 'reviewed_by_id': obj.reviewed_by_id}
            if any(value and (key != 'status' or value in ('approved', 'published')) and
                   (original is None or value != getattr(original, key)) for key, value in protected.items()):
                raise PermissionDenied('Review and publication permission is required for these fields.')
        if not change:
            return super().save_model(request, obj, form, change)
        saved = save_draft(obj.pk, form.cleaned_data['expected_edit_version'], request.user,
                           {**{k: getattr(obj, k) for k in EDITABLE},
                            'prerequisites': [c.pk for c in form.cleaned_data['prerequisites']]})
        obj.__dict__.update(saved.__dict__)

    def has_publish_permission(self, request):
        return request.user.has_perm('learning.publish_concept')

    def view_on_site(self, obj):
        return f'/learn/{obj.chapter.module.course.slug if obj.chapter.module.course_id else "ai-engineering"}/{obj.slug}/?preview=1'

    @admin.action(description='Publish approved lessons (validate all four parts)', permissions=['publish'])
    def publish_reviewed(self, request, queryset):
        for concept in queryset:
            try:
                concept.publish(request.user)
                self.message_user(request, f'Published {concept.title}.')
            except ValidationError as error:
                self.message_user(request, f'{concept.title}: {"; ".join(error.messages)}', messages.ERROR)


@admin.register(DraftRevision)
class DraftRevisionAdmin(admin.ModelAdmin):
    list_display = ('concept', 'edit_version', 'editor', 'reason', 'created_at')
    readonly_fields = ('concept', 'edit_version', 'snapshot', 'editor', 'reason', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Revision)
class RevisionAdmin(admin.ModelAdmin):
    list_display = ('concept', 'version', 'reviewer', 'created_at')
    readonly_fields = ('concept', 'version', 'snapshot', 'reviewer', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Module)
admin.site.register(Chapter)

from .models import ClaimVerification, ExtractedConcept, LearningCourse, ReferenceDocument, ReferencePage, ResearchSource


@admin.register(ReferenceDocument)
class ReferenceDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'page_count', 'created_at')
    list_filter = ('status',)
    search_fields = ('title', 'author', 'sha256')
    readonly_fields = ('file', 'sha256', 'uploaded_by', 'status', 'page_count', 'metadata', 'toc', 'error', 'created_at')

    def has_add_permission(self, request):
        return False  # Upload through the authenticated research desk, including rights and size validation.


@admin.register(ReferencePage)
class ReferencePageAdmin(admin.ModelAdmin):
    list_display = ('document', 'number', 'status')
    list_filter = ('status', 'document')
    readonly_fields = ('document', 'number', 'text', 'notes')

    def has_add_permission(self, request):
        return False


@admin.register(ExtractedConcept)
class ExtractedConceptAdmin(admin.ModelAdmin):
    list_display = ('document', 'page_number', 'extraction_status', 'verification_status', 'lesson')
    list_filter = ('verification_status', 'extraction_status')
    search_fields = ('concept', 'document__title', 'lesson__title')


@admin.register(LearningCourse)
class LearningCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'level', 'is_active')
    list_filter = ('category', 'level', 'is_active')
    search_fields = ('title', 'summary')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ResearchSource)
class ResearchSourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_type', 'accessed_on')
    search_fields = ('title', 'url')
    list_filter = ('source_type',)


@admin.register(ClaimVerification)
class ClaimVerificationAdmin(admin.ModelAdmin):
    list_display = ('concept', 'status', 'edit_version', 'reviewed_by', 'reviewed_at')
    list_filter = ('status',)
    search_fields = ('claim', 'concept__title')
    filter_horizontal = ('sources',)

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm('learning.publish_concept') and super().has_change_permission(request, obj)

    def has_add_permission(self, request):
        return request.user.has_perm('learning.publish_concept') and super().has_add_permission(request)


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'concept', 'version', 'best_score', 'updated_at')
    exclude = ('notes',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ReadOnlyEvidenceAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(ReadOnlyEvidenceAdmin):
    list_display = ('user', 'concept', 'concept_version', 'status', 'score', 'submitted_at')
    list_filter = ('status', 'concept')


@admin.register(AssignmentReview)
class AssignmentReviewAdmin(ReadOnlyEvidenceAdmin):
    list_display = ('submission', 'version', 'reviewer', 'score', 'created_at')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ReadOnlyEvidenceAdmin):
    list_display = ('user', 'concept', 'concept_version', 'score', 'created_at')
