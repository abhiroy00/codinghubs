import hashlib
import re
import uuid

from django.db import models
from django.db.models import Q
from django.conf import settings


class CourseCategory(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    color = models.CharField(max_length=20, default='#4f46e5')
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'course categories'

    def __str__(self):
        return self.name


class Course(models.Model):
    category = models.ForeignKey(CourseCategory, on_delete=models.CASCADE, related_name='courses')
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    duration_display = models.CharField(max_length=40, blank=True, help_text='e.g. "6 months"')
    placement_rate = models.PositiveSmallIntegerField(default=90, help_text='Percent, e.g. 95')
    salary_range_display = models.CharField(max_length=40, blank=True, help_text='e.g. "₹8–18 LPA"')
    price = models.PositiveIntegerField(default=4999, help_text='Enrollment fee in INR (whole rupees)')
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name

    @property
    def price_paise(self):
        return self.price * 100


class LearningProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='learning_progress')
    course_slug = models.SlugField(max_length=120)
    current_day = models.PositiveSmallIntegerField(default=1)
    completed_days = models.JSONField(default=list, blank=True)
    quiz_scores = models.JSONField(default=dict, blank=True)
    completed_challenges = models.JSONField(default=list, blank=True)
    completed_questions = models.JSONField(default=list, blank=True)
    completed_projects = models.JSONField(default=list, blank=True)
    last_learning_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'course_slug'], name='unique_user_course_learning_progress')]
        ordering = ['-updated_at']


class CourseQuestion(models.Model):
    LEVEL_BASIC = 'basic'
    LEVEL_INTERMEDIATE = 'intermediate'
    LEVEL_ADVANCED = 'advanced'
    LEVEL_CHOICES = [
        (LEVEL_BASIC, 'Basic'),
        (LEVEL_INTERMEDIATE, 'Intermediate'),
        (LEVEL_ADVANCED, 'Advanced'),
    ]
    course_slug = models.SlugField(max_length=120)
    course_name = models.CharField(max_length=160)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES)
    topic = models.CharField(max_length=180)
    question = models.TextField()
    answer = models.TextField()
    explanation = models.TextField()
    coding_prompt = models.TextField(blank=True)
    coding_solution = models.TextField(blank=True)
    example = models.TextField(blank=True)
    seed_key = models.CharField(max_length=80, blank=True, default='')
    question_key = models.CharField(max_length=64, blank=True, editable=False)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['course_name', 'level', 'topic', 'id']
        constraints = [
            models.UniqueConstraint(fields=['course_slug', 'question_key'], name='unique_course_question_text'),
            models.UniqueConstraint(fields=['course_slug', 'seed_key'], condition=~Q(seed_key=''), name='unique_seeded_course_question'),
        ]

    def save(self, *args, **kwargs):
        normalized = re.sub(r'\s+', ' ', self.question.casefold()).strip()
        self.question_key = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.course_name} · {self.get_level_display()} · {self.topic}'


class CourseCertificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_certificates')
    course_slug = models.SlugField(max_length=120)
    certificate_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_at']
        constraints = [models.UniqueConstraint(fields=['user', 'course_slug'], name='unique_user_course_certificate')]

    def __str__(self):
        return f'{self.user} · {self.course_slug} · {self.certificate_id}'
