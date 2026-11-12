"""Startup checks that catch an accidentally unsafe production configuration.

Django runs these on `runserver`, `migrate`, `collectstatic` and `check`. Warnings are
used for things that are legitimate in some deployments; errors stop a production boot.
"""
import sys

from django.conf import settings
from django.core.checks import Error, Warning, register

DEV_HOSTS = {'localhost', '127.0.0.1', '[::1]'}


@register()
def production_settings(app_configs, **kwargs):
    issues = []
    # Django's test runner forces DEBUG=False, which would otherwise make the suite look
    # like production. Development is allowed to be loose; there is nothing to warn about.
    if settings.DEBUG or 'test' in sys.argv:
        return issues

    if settings.SECRET_KEY == 'django-insecure-dev-key-change-me':
        issues.append(Error(
            'SECRET_KEY is the development placeholder while DEBUG is off.',
            hint='Set a unique SECRET_KEY in the environment.',
            id='codinghubs.E001',
        ))
    if set(settings.ALLOWED_HOSTS) <= DEV_HOSTS:
        issues.append(Error(
            f'ALLOWED_HOSTS only contains development hosts: {settings.ALLOWED_HOSTS}.',
            hint='Set ALLOWED_HOSTS to the real domain(s).',
            id='codinghubs.E002',
        ))
    if not settings.SECURE_SSL_REDIRECT:
        issues.append(Warning(
            'SECURE_SSL_REDIRECT is off while DEBUG is off.',
            hint='Terminate TLS at nginx and set SECURE_SSL_REDIRECT=True.',
            id='codinghubs.W001',
        ))
    if 'console' in settings.EMAIL_BACKEND:
        issues.append(Warning(
            'Email uses the console backend, so customers receive no order confirmations or download links.',
            hint='Configure EMAIL_HOST/EMAIL_HOST_USER/EMAIL_HOST_PASSWORD and the SMTP backend.',
            id='codinghubs.W002',
        ))
    if bool(settings.RAZORPAY_KEY_ID) != bool(settings.RAZORPAY_KEY_SECRET):
        issues.append(Error(
            'Only one of RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET is set.',
            hint='Set both Razorpay keys, or neither to keep online payments disabled.',
            id='codinghubs.E003',
        ))
    if settings.RAZORPAY_KEY_ID and not settings.RAZORPAY_WEBHOOK_SECRET:
        issues.append(Warning(
            'Razorpay is configured but RAZORPAY_WEBHOOK_SECRET is empty, so the webhook fallback rejects every delivery.',
            hint='Create a webhook in Razorpay and store its signing secret.',
            id='codinghubs.W003',
        ))
    return issues
