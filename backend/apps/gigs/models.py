import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def gig_slug():
    return 'gig-' + uuid.uuid4().hex


class Gig(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending review'
        OPEN = 'open', 'Open'
        REJECTED = 'rejected', 'Rejected'
        CLOSED = 'closed', 'Closed'

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gigs')
    slug = models.SlugField(max_length=40, unique=True, default=gig_slug, editable=False)
    title = models.CharField(max_length=120)
    scope = models.TextField(max_length=5000)
    deliverable = models.TextField(max_length=1200)
    skills = models.JSONField(default=list)
    status = models.CharField(max_length=12, choices=Status, default=Status.DRAFT, db_index=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_gigs')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-pk']

    def __str__(self):
        return self.title

    def clean(self):
        if self.status == self.Status.OPEN and not (self.approved_by_id and self.approved_at):
            raise ValidationError('Open briefs need explicit staff approval.')

    @classmethod
    def public(cls):
        return cls.objects.filter(status=cls.Status.OPEN, approved_by__isnull=False, approved_at__isnull=False)


class Proposal(models.Model):
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='proposals')
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gig_proposals')
    pitch = models.TextField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-pk']
        constraints = [models.UniqueConstraint(fields=['gig', 'applicant'], name='gigs_one_proposal_per_person')]


class GigReport(models.Model):
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField(max_length=1500)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-pk']
        constraints = [models.UniqueConstraint(fields=['gig', 'reporter'], name='gigs_one_report_per_person')]
