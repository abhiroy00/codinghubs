import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.content.sanitize import sanitize_html


class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    status = models.CharField(max_length=16, default='pending', choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('unsubscribed', 'Unsubscribed')], db_index=True)
    source = models.CharField(max_length=120, blank=True)
    consent_at = models.DateTimeField()
    nonce = models.UUIDField(default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def save(self, *args, **kwargs):
        self.email = self.email.strip().casefold()
        super().save(*args, **kwargs)


class Issue(models.Model):
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    excerpt = models.CharField(max_length=300)
    content = models.TextField()
    published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-id']

    def save(self, *args, **kwargs):
        self.content = sanitize_html(self.content)
        if self.published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class Campaign(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.PROTECT)
    idempotency_key = models.UUIDField(unique=True)
    subject = models.CharField(max_length=160)
    content = models.TextField()
    content_digest = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        constraints = [models.UniqueConstraint(fields=['issue', 'content_digest'], name='newsletter_issue_content_once')]


class Delivery(models.Model):
    # A sending row is never retried automatically: SMTP may accept mail just before a worker dies.
    subscriber = models.ForeignKey(Subscriber, on_delete=models.CASCADE)
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.CASCADE, related_name='deliveries')
    kind = models.CharField(max_length=16, choices=[('confirmation', 'Confirmation'), ('campaign', 'Campaign')])
    nonce = models.UUIDField()
    status = models.CharField(max_length=16, default='pending', db_index=True, choices=[(s, s.title()) for s in ['pending', 'sending', 'sent', 'failed', 'skipped', 'unknown']])
    created_at = models.DateTimeField(auto_now_add=True)
    attempted_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['campaign', 'subscriber'], name='newsletter_campaign_recipient'),
            models.UniqueConstraint(fields=['subscriber', 'nonce', 'kind'], condition=models.Q(kind='confirmation'), name='newsletter_confirmation_nonce'),
        ]
