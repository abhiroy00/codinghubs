import uuid

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.shop.storage import private_storage


class AIUsage(models.Model):
    """One attempt to call an AI provider. Drives the per-user and site-wide daily limits and the admin usage/error review."""
    OK, RATE_LIMITED, UNAVAILABLE, INVALID, NOT_CONFIGURED = 'ok', 'rate_limited', 'unavailable', 'invalid', 'not_configured'
    STATUS_CHOICES = [(OK, 'OK'), (RATE_LIMITED, 'Rate limited'), (UNAVAILABLE, 'Unavailable'), (INVALID, 'Invalid output'), (NOT_CONFIGURED, 'Not configured')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='ai_usage')
    feature = models.CharField(max_length=40)
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    error = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'AI usage'
        verbose_name_plural = 'AI usage'
        indexes = [
            models.Index(fields=['user', 'status', 'created_at'], name='aiusage_user_status_time'),
            models.Index(fields=['status', 'created_at'], name='aiusage_status_time'),
        ]

    def __str__(self):
        return f'{self.feature} · {self.provider} · {self.status}'


class AnswerEvaluation(models.Model):
    """A candidate's answer to an interview question and the AI's evaluation. Private to the user who submitted it."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answer_evaluations')
    course_slug = models.SlugField(max_length=120, blank=True)
    day = models.PositiveSmallIntegerField(null=True, blank=True)
    question_index = models.PositiveSmallIntegerField(null=True, blank=True)
    question = models.TextField()
    answer = models.TextField()
    score = models.FloatField(help_text='Overall score out of 10, computed from the six sub-scores.')
    result = models.JSONField(default=dict)
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'], name='answereval_user_time')]

    def __str__(self):
        return f'{self.user} · {self.score}/10 · {self.created_at:%Y-%m-%d}'


class MockInterview(models.Model):
    """One AI mock interview session. Private to the user who started it."""
    IN_PROGRESS, COMPLETED = 'in_progress', 'completed'
    EXPERIENCE = [('fresher', 'Fresher (0-1 years)'), ('junior', 'Junior (1-3 years)'), ('mid', 'Mid-level (3-5 years)'), ('senior', 'Senior (5+ years)')]
    DIFFICULTY = [('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]
    TYPES = [('technical', 'Technical'), ('hr', 'HR'), ('mixed', 'Mixed')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mock_interviews')
    job_role = models.CharField(max_length=80)
    technology = models.CharField(max_length=80)
    experience_level = models.CharField(max_length=10, choices=EXPERIENCE)
    difficulty = models.CharField(max_length=14, choices=DIFFICULTY, help_text='The level the candidate chose.')
    current_difficulty = models.CharField(max_length=14, choices=DIFFICULTY, help_text='Moves up or down with the candidate\'s scores.')
    interview_type = models.CharField(max_length=10, choices=TYPES)
    total_questions = models.PositiveSmallIntegerField(help_text='Counts follow-up questions too.')
    status = models.CharField(max_length=12, default=IN_PROGRESS)
    overall_score = models.FloatField(null=True, blank=True)
    report = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'status'], name='mockinterview_user_status'), models.Index(fields=['user', '-created_at'], name='mockinterview_user_time')]

    def __str__(self):
        return f'{self.user} · {self.job_role} · {self.status}'


class MockInterviewTurn(models.Model):
    """One question in an interview and the candidate's answer. `next_candidates` holds questions prepared while evaluating the answer."""
    interview = models.ForeignKey(MockInterview, on_delete=models.CASCADE, related_name='turns')
    number = models.PositiveSmallIntegerField()
    category = models.CharField(max_length=10)  # technical | hr
    kind = models.CharField(max_length=10, default='main')  # main | follow_up
    difficulty = models.CharField(max_length=14)
    question = models.TextField()
    answer = models.TextField(blank=True)
    skipped = models.BooleanField(default=False)
    evaluation = models.JSONField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    next_candidates = models.JSONField(null=True, blank=True)
    asked_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['number']
        constraints = [models.UniqueConstraint(fields=['interview', 'number'], name='unique_interview_turn_number')]

    def __str__(self):
        return f'{self.interview_id} · Q{self.number}'


def resume_path(instance, filename):
    """Random server-side name in a per-user folder; the uploaded file name is only kept as metadata."""
    return f'resumes/{instance.user_id}/{uuid.uuid4().hex}.pdf'


class Resume(models.Model):
    """An uploaded PDF resume and the text pulled out of it. The file lives in private storage (never served by nginx)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resumes')
    file = models.FileField(storage=private_storage, upload_to=resume_path, max_length=200)
    original_name = models.CharField(max_length=120)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    page_count = models.PositiveSmallIntegerField(default=0)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['user', 'sha256'], name='unique_resume_per_user')]

    def __str__(self):
        return f'{self.user} · {self.original_name}'


@receiver(post_delete, sender=Resume)
def remove_resume_file(sender, instance, **kwargs):
    """Deleting a resume (or the user who owns it) also deletes the stored PDF, so no personal file is left behind."""
    if instance.file:
        instance.file.delete(save=False)


class ResumeAnalysis(models.Model):
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='analyses')
    target_role = models.CharField(max_length=80, blank=True)
    result = models.JSONField(default=dict)
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'resume analyses'
