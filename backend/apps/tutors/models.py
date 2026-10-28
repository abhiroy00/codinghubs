import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Tutor(models.Model):
    full_name = models.CharField(max_length=160)
    profile_image = models.CharField(max_length=500, blank=True)
    designation = models.CharField(max_length=160)
    bio = models.TextField()
    experience = models.CharField(max_length=100, blank=True)
    expertise = models.JSONField(default=list, blank=True)
    courses = models.JSONField(default=list, blank=True)
    teaching_approach = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def clean(self):
        errors = {}
        for field in ('expertise', 'courses'):
            value = getattr(self, field)
            if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
                errors[field] = 'Enter a JSON array of text values.'
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f'{self.full_name} — {self.designation}'


class TutorBooking(models.Model):
    SESSION_ONLINE = 'online'
    SESSION_CHOICES = ((SESSION_ONLINE, 'Online'),)

    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    submission_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    student_name = models.CharField(max_length=160)
    student_email = models.EmailField()
    tutor = models.ForeignKey(Tutor, on_delete=models.PROTECT, related_name='bookings')
    course = models.CharField(max_length=120)
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    session_type = models.CharField(max_length=12, choices=SESSION_CHOICES, default=SESSION_ONLINE)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        if self.preferred_date and self.preferred_date < timezone.localdate():
            raise ValidationError({'preferred_date': 'The preferred date cannot be in the past.'})

    @property
    def reference(self):
        return f'CH-{self.pk:06d}' if self.pk else ''

    def __str__(self):
        return f'{self.reference} — {self.student_name} ({self.status})'
