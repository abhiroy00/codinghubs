import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_password_reset(to_email: str, link: str) -> bool:
    """Send the reset link. A mail failure must not reveal whether the address exists."""
    body = (
        'Someone asked to reset the password for your Coding Hubs account.\n\n'
        f'Choose a new password here (valid for a limited time):\n{link}\n\n'
        'If this was not you, ignore this email: your password has not changed.\n\n'
        'Coding Hubs School of AI'
    )
    try:
        send_mail(
            'Reset your Coding Hubs password',
            body,
            settings.DEFAULT_FROM_EMAIL,
            [to_email],
            fail_silently=False,
        )
        return True
    except Exception:  # noqa: BLE001 - never turn a mail outage into an account-enumeration signal
        logger.exception('Could not send the password reset email')
        return False
