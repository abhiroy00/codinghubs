import uuid
import hashlib
from datetime import timedelta
import re
from urllib.parse import urlencode
from django.conf import settings
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone
from apps.content.sanitize import plain_text, sanitize_html
from .models import Campaign, Delivery, Subscriber


def mail_ready():
    return settings.NEWSLETTER_EMAIL_ENABLED and (
        settings.EMAIL_BACKEND == 'django.core.mail.backends.locmem.EmailBackend'
        or settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend' and bool(settings.EMAIL_HOST)
    )


def token_for(subscriber, purpose):
    return signing.dumps({'id': subscriber.pk, 'nonce': str(subscriber.nonce)}, salt='newsletter-' + purpose)


def token_subscriber(token, purpose):
    age = settings.NEWSLETTER_CONFIRM_TTL if purpose == 'confirm' else settings.NEWSLETTER_UNSUBSCRIBE_TTL
    value = signing.loads(token, salt='newsletter-' + purpose, max_age=age)
    return Subscriber.objects.select_for_update().get(pk=value['id'], nonce=value['nonce'])


@transaction.atomic
def subscribe(email, source):
    obj, _ = Subscriber.objects.get_or_create(email=email.strip().casefold(), defaults={'consent_at': timezone.now(), 'source': source})
    obj = Subscriber.objects.select_for_update().get(pk=obj.pk)
    if obj.status == 'confirmed':
        return
    if obj.status == 'unsubscribed':
        obj.nonce = uuid.uuid4()
        obj.status = 'pending'
        obj.confirmed_at = None
        obj.consent_at = timezone.now()
        obj.source = source
        obj.save()
    # Renew only after expiry; repeated submissions do not invalidate an in-flight link.
    last = Delivery.objects.filter(subscriber=obj, kind='confirmation', nonce=obj.nonce).first()
    if last and (timezone.now() - last.created_at).total_seconds() > settings.NEWSLETTER_CONFIRM_TTL:
        obj.nonce = uuid.uuid4()
        obj.consent_at = timezone.now()
        obj.save()
    Delivery.objects.get_or_create(subscriber=obj, nonce=obj.nonce, kind='confirmation')


@transaction.atomic
def confirm(token):
    obj = token_subscriber(token, 'confirm')
    if obj.status == 'pending':
        obj.status = 'confirmed'
        obj.confirmed_at = timezone.now()
        obj.save()
    return obj.status == 'confirmed'


@transaction.atomic
def unsubscribe(token):
    obj = token_subscriber(token, 'unsubscribe')
    obj.status = 'unsubscribed'
    obj.unsubscribed_at = obj.unsubscribed_at or timezone.now()
    obj.save()


@transaction.atomic
def queue_campaign(issue, key, actor):
    content = sanitize_html(issue.content)
    digest = hashlib.sha256((issue.title + '\0' + content).encode()).hexdigest()
    existing = Campaign.objects.filter(idempotency_key=key).first()
    if existing and (existing.issue_id != issue.pk or existing.content_digest != digest):
        raise ValueError('This request key belongs to another issue or content version.')
    campaign, created = Campaign.objects.get_or_create(issue=issue, content_digest=digest, defaults={'idempotency_key': key, 'subject': issue.title, 'content': content, 'created_by': actor})
    if created:
        batch = []
        for subscriber in Subscriber.objects.filter(status='confirmed').iterator(chunk_size=500):
            batch.append(Delivery(subscriber=subscriber, campaign=campaign, kind='campaign', nonce=subscriber.nonce))
            if len(batch) == 500:
                Delivery.objects.bulk_create(batch, batch_size=500)
                batch = []
        if batch:
            Delivery.objects.bulk_create(batch, batch_size=500)
    return campaign


def process_batch(limit=50):
    if not mail_ready():
        raise RuntimeError('Newsletter mail is disabled or SMTP is not configured.')
    # A worker may stop after SMTP accepts mail. Surface the uncertainty, never resend blindly.
    Delivery.objects.filter(status='sending', attempted_at__lt=timezone.now()-timedelta(minutes=15)).update(status='unknown', error_code='worker_interrupted', finished_at=timezone.now())
    processed = 0
    for _ in range(limit):
        # An atomic compare-and-swap claim also works on SQLite; only one worker sends a row.
        row = Delivery.objects.filter(status='pending').order_by('id').first()
        if not row:
            break
        if not Delivery.objects.filter(pk=row.pk, status='pending').update(status='sending', attempted_at=timezone.now()):
            continue
        processed += 1
        obj = Subscriber.objects.get(pk=row.subscriber_id)
        eligible = obj.nonce == row.nonce and obj.status == ('pending' if row.kind == 'confirmation' else 'confirmed')
        if not eligible:
            Delivery.objects.filter(pk=row.pk).update(status='skipped', finished_at=timezone.now())
            continue
        if row.kind == 'confirmation':
            url = settings.SITE_URL + '/newsletter/confirm/?' + urlencode({'token': token_for(obj, 'confirm')})
            subject = 'Confirm your Coding Hubs newsletter subscription'
            text = 'You requested coding tips, interview preparation, AI updates and course announcements.\n\nConfirm your subscription: ' + url + '\n\nIf this was not you, ignore this email.'
            html = None
        else:
            campaign = Campaign.objects.get(pk=row.campaign_id)
            url = settings.SITE_URL + '/newsletter/unsubscribe/?' + urlencode({'token': token_for(obj, 'unsubscribe')})
            subject = campaign.subject
            html = sanitize_html(campaign.content) + f'<p><a href="{url}">Unsubscribe</a></p>'
            text = plain_text(campaign.content) + '\n\nUnsubscribe: ' + url
        mail = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [obj.email], headers={'Message-ID': f'<newsletter-{row.pk}@codinghubs.in>'})
        if html:
            mail.attach_alternative(html, 'text/html')
        try:
            count = mail.send(fail_silently=False)
        except Exception:  # SMTP errors can be ambiguous; do not automatically resend.
            Delivery.objects.filter(pk=row.pk).update(status='unknown', error_code='provider_error', finished_at=timezone.now())
        else:
            Delivery.objects.filter(pk=row.pk).update(status='sent' if count else 'failed', error_code='' if count else 'not_accepted', finished_at=timezone.now())
    return processed


def public_issue_html(value):
    return re.sub(r"<img\b", '<img loading="lazy" decoding="async"', sanitize_html(value))
