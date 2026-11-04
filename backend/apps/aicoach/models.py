from django.conf import settings
from django.db import models


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
