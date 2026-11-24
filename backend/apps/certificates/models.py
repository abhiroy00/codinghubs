"""Institute course certificates: a learner applies, staff review and issue, anyone can verify by ID.

Kept separate from apps.courses.CourseCertificate, which is issued automatically for the online 30-day roadmaps.
"""
import secrets

from django.conf import settings
from django.db import models
from django.db.models import Q

# No 0/O, 1/I/L, so IDs read back correctly from paper. 12 characters = 60 bits: not guessable or enumerable.
ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'


def new_code():
    raw = ''.join(secrets.choice(ALPHABET) for _ in range(12))
    return f'CH-{raw[:4]}-{raw[4:8]}-{raw[8:]}'


def normalize_code(value):
    """Accepts 'ch-abcd-efgh-jkmn', spaces or no dashes; returns the canonical CH-XXXX-XXXX-XXXX or ''."""
    raw = ''.join(ch for ch in (value or '').upper() if ch.isalnum())
    if raw.startswith('CH'):
        raw = raw[2:]
    if len(raw) != 12 or any(ch not in ALPHABET for ch in raw):
        return ''
    return f'CH-{raw[:4]}-{raw[4:8]}-{raw[8:]}'


class CertificateApplication(models.Model):
    PENDING, APPROVED, REJECTED = 'pending', 'approved', 'rejected'
    STATUSES = [(PENDING, 'Pending review'), (APPROVED, 'Approved'), (REJECTED, 'Rejected')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificate_applications')
    full_name = models.CharField(max_length=80, help_text='Name exactly as it should appear on the certificate.')
    course_name = models.CharField(max_length=120)
    batch = models.CharField(max_length=80, blank=True, help_text='Batch, timing or trainer, to help staff find the record.')
    completed_on = models.DateField()
    phone = models.CharField(max_length=20, blank=True)
    note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING, db_index=True)
    staff_note = models.CharField(max_length=500, blank=True, help_text='Shown to the learner when an application is rejected.')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['user', 'course_name'], condition=Q(status='pending'), name='one_pending_application_per_course')]

    def __str__(self):
        return f'{self.full_name} · {self.course_name} · {self.status}'


class Certificate(models.Model):
    VALID, REVOKED, REPLACED = 'valid', 'revoked', 'replaced'
    STATUSES = [(VALID, 'Valid'), (REVOKED, 'Revoked'), (REPLACED, 'Replaced by a reissue')]

    code = models.CharField(max_length=17, unique=True, default=new_code, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='institute_certificates')
    application = models.ForeignKey(CertificateApplication, null=True, blank=True, on_delete=models.SET_NULL, related_name='certificates')
    recipient_name = models.CharField(max_length=80)
    course_name = models.CharField(max_length=120)
    completed_on = models.DateField()
    issued_on = models.DateField()
    status = models.CharField(max_length=10, choices=STATUSES, default=VALID, db_index=True)
    replaces = models.OneToOneField('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replaced_by')
    status_note = models.CharField(max_length=500, blank=True, help_text='Internal reason for a revoke or reissue; never shown publicly.')
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} · {self.recipient_name} · {self.course_name}'

    @property
    def initials(self):
        """The only part of the name public verification shows: 'Asha Kumari Sharma' -> 'A. K. S.'"""
        return ' '.join(f'{part[0].upper()}.' for part in self.recipient_name.split() if part[:1].isalpha())


class CertificateEvent(models.Model):
    """Append-only history of what happened to an application or certificate, and who did it."""
    ACTIONS = [(a, a.replace('_', ' ').capitalize()) for a in
               ('applied', 'approved', 'rejected', 'issued', 'reissued', 'revoked', 'restored', 'link_created')]

    application = models.ForeignKey(CertificateApplication, null=True, blank=True, on_delete=models.CASCADE, related_name='events')
    certificate = models.ForeignKey(Certificate, null=True, blank=True, on_delete=models.CASCADE, related_name='events')
    action = models.CharField(max_length=20, choices=ACTIONS)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    note = models.CharField(max_length=500, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at', '-id']

    @classmethod
    def log(cls, action, actor=None, application=None, certificate=None, note=''):
        user = actor if getattr(actor, 'is_authenticated', False) else None
        return cls.objects.create(action=action, actor=user, application=application, certificate=certificate, note=note[:500])
