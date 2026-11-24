"""Issue, reissue, revoke and download-link rules, shared by the learner and admin APIs."""
from django.core import signing
from django.db import transaction
from django.utils import timezone

from .models import Certificate, CertificateApplication, CertificateEvent

LINK_SALT = 'apps.certificates.download'
LINK_MAX_AGE = 600  # seconds a download link stays valid


def download_link(certificate, actor):
    token = signing.TimestampSigner(salt=LINK_SALT).sign(str(certificate.pk))
    CertificateEvent.log('link_created', actor, certificate=certificate)
    return {'url': f'/api/certificates/download/?t={token}', 'expires_in': LINK_MAX_AGE}


def certificate_from_token(token):
    try:
        pk = signing.TimestampSigner(salt=LINK_SALT).unsign(token or '', max_age=LINK_MAX_AGE)
    except signing.BadSignature:  # also covers SignatureExpired
        return None
    return Certificate.objects.filter(pk=pk, status=Certificate.VALID).first()


@transaction.atomic
def approve(application, actor, *, recipient_name=None, course_name=None, completed_on=None, issued_on=None, note=''):
    application = CertificateApplication.objects.select_for_update().get(pk=application.pk)
    if application.status != CertificateApplication.PENDING:
        raise ValueError('This application has already been reviewed.')
    application.status = CertificateApplication.APPROVED
    application.reviewed_by = actor
    application.reviewed_at = timezone.now()
    application.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
    certificate = Certificate.objects.create(
        user=application.user, application=application, issued_by=actor,
        recipient_name=recipient_name or application.full_name, course_name=course_name or application.course_name,
        completed_on=completed_on or application.completed_on, issued_on=issued_on or timezone.localdate())
    CertificateEvent.log('approved', actor, application=application, note=note)
    CertificateEvent.log('issued', actor, application=application, certificate=certificate, note=note)
    return certificate


@transaction.atomic
def reject(application, actor, note):
    application = CertificateApplication.objects.select_for_update().get(pk=application.pk)
    if application.status != CertificateApplication.PENDING:
        raise ValueError('This application has already been reviewed.')
    application.status = CertificateApplication.REJECTED
    application.staff_note = note
    application.reviewed_by = actor
    application.reviewed_at = timezone.now()
    application.save(update_fields=['status', 'staff_note', 'reviewed_by', 'reviewed_at'])
    CertificateEvent.log('rejected', actor, application=application, note=note)
    return application


@transaction.atomic
def issue_direct(actor, *, user=None, recipient_name, course_name, completed_on, issued_on=None, note=''):
    certificate = Certificate.objects.create(user=user, issued_by=actor, recipient_name=recipient_name, course_name=course_name,
                                             completed_on=completed_on, issued_on=issued_on or timezone.localdate())
    CertificateEvent.log('issued', actor, certificate=certificate, note=note)
    return certificate


@transaction.atomic
def reissue(certificate, actor, *, note, **changes):
    """A correction gets a new ID; the old one verifies as 'replaced' so printed copies can be told apart."""
    old = Certificate.objects.select_for_update().get(pk=certificate.pk)
    if old.status == Certificate.REPLACED:
        raise ValueError('This certificate was already reissued. Reissue the newest one.')
    new = Certificate.objects.create(
        user=old.user, application=old.application, issued_by=actor, replaces=old,
        recipient_name=changes.get('recipient_name') or old.recipient_name, course_name=changes.get('course_name') or old.course_name,
        completed_on=changes.get('completed_on') or old.completed_on, issued_on=timezone.localdate())
    old.status, old.status_note = Certificate.REPLACED, note
    old.save(update_fields=['status', 'status_note'])
    CertificateEvent.log('reissued', actor, certificate=old, note=f'Replaced by {new.code}. {note}'.strip())
    CertificateEvent.log('issued', actor, certificate=new, note=f'Reissue of {old.code}. {note}'.strip())
    return new


@transaction.atomic
def set_revoked(certificate, actor, revoked, note):
    certificate = Certificate.objects.select_for_update().get(pk=certificate.pk)
    if certificate.status == Certificate.REPLACED:
        raise ValueError('A replaced certificate cannot be changed. Use the newest one.')
    certificate.status = Certificate.REVOKED if revoked else Certificate.VALID
    certificate.status_note = note
    certificate.save(update_fields=['status', 'status_note'])
    CertificateEvent.log('revoked' if revoked else 'restored', actor, certificate=certificate, note=note)
    return certificate
