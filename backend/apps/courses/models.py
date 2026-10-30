from django.db import models
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
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'course_slug'], name='unique_user_course_learning_progress')]
        ordering = ['-updated_at']
