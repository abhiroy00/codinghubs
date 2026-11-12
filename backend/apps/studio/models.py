import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


DIMENSIONS = ['understanding', 'approach', 'implementation', 'testing', 'complexity', 'communication']
DEFAULT_WEIGHTS = dict(zip(DIMENSIONS, [10, 25, 25, 15, 15, 10]))


def default_weights():
    return DEFAULT_WEIGHTS.copy()


def validate_weights(value):
    if (not isinstance(value, dict) or set(value) != set(DIMENSIONS)
            or any(type(v) is not int or v < 0 or v > 100 for v in value.values())
            or sum(value.values()) != 100):
        raise ValidationError('Provide all six dimensions with integer weights totaling 100.')


class Problem(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    kind = models.CharField(max_length=20, choices=[(s, s) for s in ['coding', 'system-design', 'low-level-design']], default='coding')
    difficulty = models.CharField(max_length=10, choices=[(s, s) for s in ['easy', 'medium', 'hard']])
    topics = models.JSONField(default=list)
    companies = models.JSONField(default=list)
    description = models.TextField()
    constraints = models.TextField(blank=True)
    examples = models.JSONField(default=list)
    starters = models.JSONField(default=dict)
    tests = models.JSONField(default=list, help_text='Server-only: stdin, expected, hidden.')
    hints = models.JSONField(default=list)
    editorial = models.TextField(blank=True)
    complexity = models.CharField(max_length=200, blank=True)
    provenance = models.CharField(max_length=250, default='Independently authored for Coding Hubs; original educational content.')
    version = models.PositiveIntegerField(default=1)
    published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class StudioSettings(models.Model):
    name = models.CharField(max_length=40, unique=True, default='default')
    weights = models.JSONField(default=default_weights, validators=[validate_weights])
    # Server enforces hint limits independently of model output.
    persona_policies = models.JSONField(default=dict, blank=True)


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    problem = models.ForeignKey(Problem, on_delete=models.PROTECT)
    snapshot = models.JSONField()  # Private, immutable version; never serialize wholesale.
    configuration = models.JSONField()
    status = models.CharField(max_length=16, default='active')
    stage = models.PositiveSmallIntegerField(default=0)
    hint_level = models.PositiveSmallIntegerField(default=0)
    code = models.TextField(blank=True)
    diagram = models.JSONField(default=dict)
    revision = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField()
    completed_at = models.DateTimeField(null=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [models.Index(fields=['user', '-started_at'])]


class Message(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=12)
    content = models.TextField()
    request_id = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        constraints = [models.UniqueConstraint(fields=['session', 'role', 'request_id'], name='studio_message_idempotency')]


class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='submissions')
    code = models.TextField()
    language = models.CharField(max_length=20)
    mode = models.CharField(max_length=10)
    custom_input = models.TextField(blank=True)
    status = models.CharField(max_length=16, default='queued', db_index=True)
    results = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True)
    claimed_at = models.DateTimeField(null=True)


class Evaluation(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='evaluation')
    score = models.FloatField()
    dimensions = models.JSONField()
    feedback = models.JSONField()
    weights = models.JSONField()
    evidence = models.JSONField()
    prompt_version = models.CharField(max_length=40, default='studio-v1')
    created_at = models.DateTimeField(auto_now_add=True)


class LearningRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(max_length=20)
    key = models.CharField(max_length=120)
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'kind', 'key'], name='studio_unique_learning_record')]


class Usage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    operation = models.CharField(max_length=30)
    model = models.CharField(max_length=100, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Event(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='events')
    action = models.CharField(max_length=40)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeDocument(models.Model):
    slug = models.SlugField(unique=True, max_length=160)
    title = models.CharField(max_length=200)
    topic = models.CharField(max_length=100, blank=True)
    body = models.TextField()
    source = models.CharField(max_length=300)
    license = models.CharField(max_length=200)
    approved = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        previous = type(self).objects.filter(pk=self.pk).first() if self.pk else None
        changed = previous and any(getattr(previous, key) != getattr(self, key) for key in ['body', 'title', 'source', 'license', 'topic'])
        if changed:
            self.version = previous.version + 1
        super().save(*args, **kwargs)
        if changed:
            self.chunks.all().delete()

    def __str__(self):
        return self.title


class KnowledgeChunk(models.Model):
    document = models.ForeignKey(KnowledgeDocument, on_delete=models.CASCADE, related_name='chunks')
    position = models.PositiveIntegerField()
    text = models.TextField()
    embedding = models.JSONField(default=list)
    embedding_model = models.CharField(max_length=100, blank=True)
    source_version = models.PositiveIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['document', 'position'], name='studio_unique_document_chunk')]


class DraftVersion(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='drafts')
    revision = models.PositiveIntegerField()
    code = models.TextField()
    diagram = models.JSONField(default=dict)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-revision']
        constraints = [models.UniqueConstraint(fields=['session', 'revision'], name='studio_unique_draft_revision')]


class AdminAudit(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=60)
    object_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
