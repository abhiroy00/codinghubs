from copy import deepcopy
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from .quality import PARTS, question_keys, validate_content
from .documents import ReferenceStorage, reference_path


def empty_content():
    return {part: {'blocks': []} for part in PARTS}


class LearningCourse(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=100)
    summary = models.TextField()
    level = models.CharField(max_length=16, default='beginner')
    effort_hours = models.PositiveSmallIntegerField(default=0)
    prerequisites = models.JSONField(default=list, blank=True)
    outcomes = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    projects = models.JSONField(default=list, blank=True)
    sources = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['position', 'title']

    def __str__(self):
        return self.title


class Module(models.Model):
    number = models.PositiveSmallIntegerField(unique=True)
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    objectives = models.JSONField(default=list)
    course = models.ForeignKey(LearningCourse, null=True, blank=True, on_delete=models.PROTECT, related_name='modules')

    class Meta:
        ordering = ['number']

    def __str__(self):
        return f'{self.number:02d} · {self.title}'


class Chapter(models.Model):
    module = models.ForeignKey(Module, on_delete=models.PROTECT, related_name='chapters')
    title = models.CharField(max_length=200)
    position = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ['position', 'pk']
        constraints = [models.UniqueConstraint(fields=['module', 'position'], name='learning_chapter_position')]

    def __str__(self):
        return self.title


class Concept(models.Model):
    STATUS = [(s, s.replace('_', ' ').title()) for s in ('not_started', 'draft', 'in_review', 'approved', 'published')]
    chapter = models.ForeignKey(Chapter, on_delete=models.PROTECT, related_name='concepts')
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    position = models.PositiveSmallIntegerField()
    difficulty = models.CharField(max_length=16, choices=[(s, s.title()) for s in ('beginner', 'intermediate', 'advanced')], default='beginner')
    prerequisites = models.ManyToManyField('self', symmetrical=False, blank=True)
    outcomes = models.JSONField(default=list, blank=True)
    references = models.JSONField(default=list, blank=True)
    content = models.JSONField(default=empty_content)
    status = models.CharField(max_length=16, choices=STATUS, default='not_started')
    seo_description = models.CharField(max_length=300, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    code_verified = models.BooleanField(default=False, help_text='Reviewer has executed all code examples and checked expected outputs.')
    published = models.JSONField(default=dict, blank=True, editable=False)
    version = models.PositiveIntegerField(default=0, editable=False)
    edit_version = models.PositiveIntegerField(default=0, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['chapter__module__number', 'chapter__position', 'position', 'pk']
        permissions = [('publish_concept', 'Can approve and publish learning concepts')]

    def __str__(self):
        return self.title

    def clean(self):
        validate_content(self.content)
        if self.pk:
            original = type(self).objects.get(pk=self.pk)
            if original.version and original.slug != self.slug:
                raise ValidationError('Published URLs cannot be changed. Add an explicit redirect migration first.')
            if self.status == 'published' and self.content != original.content:
                self.status = 'draft'
            if self.content != original.content:
                self.code_verified = False
                self.reviewed_by = None
        if self.status == 'published' and not self.version:
            raise ValidationError('Use the reviewed publication action to publish.')

    @transaction.atomic
    def publish(self, reviewer, expected_edit_version=None):
        # Lock prevents two publication actions from reusing a version number.
        current = type(self).objects.select_for_update().get(pk=self.pk)
        if expected_edit_version is not None and current.edit_version != expected_edit_version:
            raise EditConflict('This lesson changed. Reload before publishing.')
        if not reviewer.is_active or not reviewer.is_staff:
            raise ValidationError('An active staff reviewer is required.')
        if current.status != 'approved' or not current.code_verified or not current.reviewed_by_id:
            raise ValidationError('Approve the lesson, record its reviewer and verify code before publication.')
        if not current.reviewed_by.is_active or not current.reviewed_by.is_staff:
            raise ValidationError('The recorded reviewer must be active staff.')
        validate_content(current.content, publishing=True)
        if current.chapter.module.course_id:
            claims = list(current.claims.prefetch_related('sources').select_related('reviewed_by'))
            if not claims or any(c.status != 'VERIFIED' or not c.evidence.strip() or not c.reviewed_at or not c.reviewed_by_id or not c.reviewed_by.is_active or not c.reviewed_by.is_staff or c.edit_version != current.edit_version or not c.sources.exists() for c in claims):
                raise ValidationError('Course lessons require current verified claims with sources, evidence and active staff reviewers before publication.')
        keys = question_keys(current.content)
        for published in type(self).objects.filter(version__gt=0).exclude(pk=current.pk).values_list('published', flat=True):
            if keys & question_keys(published.get('content', {})):
                raise ValidationError('Assessment questions duplicate another published concept. Write concept-specific questions.')
        if not current.references or not current.outcomes or not current.seo_description:
            raise ValidationError('References, learning outcomes and an SEO description are required.')
        snapshot = {k: deepcopy(getattr(current, k)) for k in ('title', 'content', 'difficulty', 'outcomes', 'references', 'seo_description')}
        snapshot['prerequisites'] = list(current.prerequisites.values_list('slug', flat=True))
        snapshot['verification'] = [{'claim': c.claim, 'status': c.status, 'evidence': c.evidence, 'disagreements': c.disagreements, 'reviewed_at': c.reviewed_at.isoformat(), 'sources': [{'title': s.title, 'url': s.url, 'type': s.source_type, 'accessed_on': s.accessed_on.isoformat(), 'published_on': s.publication_date.isoformat() if s.publication_date else None, 'section': s.relevant_section} for s in c.sources.all()]} for c in current.claims.filter(status='VERIFIED', edit_version=current.edit_version).prefetch_related('sources') if c.reviewed_at]
        from .editing import archive_current
        archive_current(current, reviewer, 'publish')
        current.version += 1
        current.published = snapshot
        current.status = 'published'
        changed = type(self).objects.filter(pk=current.pk, edit_version=current.edit_version).update(
            published=snapshot, version=current.version, status='published',
            edit_version=current.edit_version + 1, updated_at=timezone.now())
        if not changed:
            raise EditConflict('This lesson changed. Reload before publishing.')
        Revision.objects.create(concept=current, version=current.version, snapshot=snapshot, reviewer=reviewer)


class Revision(models.Model):
    concept = models.ForeignKey(Concept, on_delete=models.PROTECT, related_name='revisions')
    version = models.PositiveIntegerField()
    snapshot = models.JSONField()
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['concept', 'version'], name='learning_revision_version')]


class EditConflict(Exception):
    """An editor submitted a stale copy. No mutation should be committed."""


class DraftRevision(models.Model):
    concept = models.ForeignKey(Concept, on_delete=models.PROTECT, related_name='draft_revisions')
    edit_version = models.PositiveIntegerField()
    snapshot = models.JSONField()
    editor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    reason = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-edit_version']
        constraints = [models.UniqueConstraint(fields=['concept', 'edit_version'], name='learning_draft_edit_version')]


class Progress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    concept = models.ForeignKey(Concept, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=0)
    parts = models.JSONField(default=list)
    bookmark = models.BooleanField(default=False)
    notes = models.TextField(blank=True, max_length=20000)
    best_score = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'concept'], name='learning_user_concept')]


class QuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    concept = models.ForeignKey(Concept, on_delete=models.PROTECT)
    concept_version = models.PositiveIntegerField()
    answers = models.JSONField()
    score = models.PositiveSmallIntegerField()
    question_count = models.PositiveSmallIntegerField()
    correct_count = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at', '-pk']
        indexes = [models.Index(fields=['user', 'concept', '-created_at'])]
        constraints = [models.CheckConstraint(condition=models.Q(score__lte=100), name='learning_quiz_score_range')]


class AssignmentSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_key = models.UUIDField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    concept = models.ForeignKey(Concept, on_delete=models.PROTECT)
    concept_version = models.PositiveIntegerField()
    assignment_snapshot = models.JSONField()
    response = models.TextField(max_length=50000)
    repository_url = models.URLField(max_length=500, blank=True)
    status = models.CharField(max_length=12, choices=[('submitted', 'Awaiting review'), ('reviewed', 'Reviewed')], default='submitted')
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    acceptance_confirmed = models.BooleanField(default=False)
    feedback = models.TextField(blank=True, max_length=20000)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    review_version = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at', '-pk']
        default_permissions = ('view',)
        permissions = [('grade_assignmentsubmission', 'Can review and grade learning assignments')]
        constraints = [
            models.UniqueConstraint(fields=['user', 'request_key'], name='learning_submission_request'),
            models.UniqueConstraint(fields=['user', 'concept', 'concept_version'], condition=models.Q(status='submitted'), name='learning_one_pending_assignment'),
            models.CheckConstraint(condition=models.Q(score__isnull=True) | models.Q(score__lte=100), name='learning_assignment_score_range'),
            models.CheckConstraint(condition=(models.Q(status='submitted', score__isnull=True, reviewed_at__isnull=True, review_version=0, acceptance_confirmed=False) | models.Q(status='reviewed', score__isnull=False, reviewed_at__isnull=False, review_version__gte=1)), name='learning_submission_review_state'),
        ]


class AssignmentReview(models.Model):
    submission = models.ForeignKey(AssignmentSubmission, on_delete=models.CASCADE, related_name='reviews')
    version = models.PositiveIntegerField()
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    score = models.PositiveSmallIntegerField()
    acceptance_confirmed = models.BooleanField()
    feedback = models.TextField(max_length=20000)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-version']
        default_permissions = ('view',)
        constraints = [
            models.UniqueConstraint(fields=['submission', 'version'], name='learning_submission_review_version'),
            models.CheckConstraint(condition=models.Q(score__lte=100), name='learning_review_score_range'),
        ]


class ResearchSource(models.Model):
    title = models.CharField(max_length=250)
    url = models.URLField(max_length=1000)
    source_type = models.CharField(max_length=40, choices=[(v, v.replace('_', ' ').title()) for v in ('official_docs', 'paper', 'standard', 'university', 'book', 'engineering', 'community')])
    publication_date = models.DateField(null=True, blank=True)
    accessed_on = models.DateField(default=timezone.localdate)
    relevant_section = models.CharField(max_length=500, blank=True)
    license_notes = models.TextField(blank=True)

    def __str__(self):
        return self.title


class ClaimVerification(models.Model):
    STATES = [(v, v.replace('_', ' ')) for v in ('VERIFIED', 'PARTIALLY_VERIFIED', 'NEEDS_REVIEW', 'OUTDATED')]
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name='claims')
    claim = models.TextField()
    sources = models.ManyToManyField(ResearchSource, blank=True)
    status = models.CharField(max_length=24, choices=STATES, default='NEEDS_REVIEW')
    disagreements = models.TextField(blank=True)
    evidence = models.TextField(blank=True, help_text='Record comparison, formula/code checks and version information.')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    edit_version = models.PositiveIntegerField(default=0, help_text='Lesson edit version this review covers.')

    def clean(self):
        if self.status == 'VERIFIED' and (not self.evidence.strip() or not self.reviewed_by_id or not self.reviewed_at):
            raise ValidationError('Verified claims require evidence, reviewer and review date.')

    def __str__(self):
        return self.claim[:100]


class ReferenceDocument(models.Model):
    title = models.CharField(max_length=250)
    author = models.CharField(max_length=250, blank=True)
    file = models.FileField(storage=ReferenceStorage(), upload_to=reference_path)
    sha256 = models.CharField(max_length=64, unique=True)
    rights_confirmed = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=24, default='QUEUED', choices=[(s, s.replace('_', ' ')) for s in ('QUEUED', 'PROCESSING', 'EXTRACTED_NEEDS_REVIEW', 'OCR_REQUIRED', 'FAILED')])
    page_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    toc = models.JSONField(default=list, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class ReferencePage(models.Model):
    document = models.ForeignKey(ReferenceDocument, on_delete=models.CASCADE, related_name='pages')
    number = models.PositiveIntegerField()
    text = models.TextField(blank=True)
    status = models.CharField(max_length=24, default='NEEDS_REVIEW')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['number']
        constraints = [models.UniqueConstraint(fields=['document', 'number'], name='learning_reference_page')]


class ExtractedConcept(models.Model):
    document = models.ForeignKey(ReferenceDocument, on_delete=models.PROTECT, related_name='extracted_concepts')
    chapter = models.CharField(max_length=250, blank=True)
    page_number = models.PositiveIntegerField()
    concept = models.TextField()
    extraction_status = models.CharField(max_length=30, default='NEEDS_REVIEW')
    verification_status = models.CharField(max_length=24, choices=ClaimVerification.STATES, default='NEEDS_REVIEW')
    lesson = models.ForeignKey(Concept, null=True, blank=True, on_delete=models.SET_NULL)

    def clean(self):
        if self.document_id and (self.page_number < 1 or self.page_number > self.document.page_count):
            raise ValidationError('Use a page number present in the source document.')

    def __str__(self):
        return f'{self.document}: page {self.page_number}'
