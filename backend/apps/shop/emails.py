import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import StoreSettings

logger = logging.getLogger(__name__)


def _send(subject, body, to):
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
    except Exception:  # noqa: BLE001 - a mail problem must never break an order
        logger.exception('Could not send e-mail "%s"', subject)


def order_confirmation(order):
    cfg = StoreSettings.load()
    if not cfg.email_orders:
        return
    lines = '\n'.join(f'  {i.quantity} x {i.title}  ₹{i.line_total}' for i in order.items.all())
    link = f'{settings.SITE_URL}/payment/success?order={order.number}&token={order.public_token}'
    body = (
        f'Hi {order.name},\n\nThank you for your order {order.number}.\n\n{lines}\n\nTotal: ₹{order.total}\n\n'
        + ('Your digital files are ready. Download them here (keep this link private):\n' + link + '\n\n' if order.has_digital else '')
        + ('We will email you when your printed items ship.\n\n' if order.has_physical else '')
        + f'Questions? Reply to this email or write to {cfg.contact_email or "us"}.\n\nCoding Hubs School of AI'
    )
    _send(f'Your Coding Hubs order {order.number}', body, order.email)
    if cfg.notify_email:
        _send(f'New paid order {order.number}', f'{order.name} <{order.email}> paid ₹{order.total} for order {order.number}.', cfg.notify_email)


def shipped(order):
    if not StoreSettings.load().email_orders:
        return
    track = f'\nCarrier: {order.carrier}\nTracking number: {order.tracking_number}\n' if order.tracking_number else ''
    _send(f'Your order {order.number} has shipped', f'Hi {order.name},\n\nYour order {order.number} is on its way.{track}\nCoding Hubs School of AI', order.email)


def refunded(order, amount):
    if not StoreSettings.load().email_orders:
        return
    _send(f'Refund for order {order.number}', f'Hi {order.name},\n\nWe have refunded ₹{amount} for order {order.number}. It can take a few days to show in your account.\n\nCoding Hubs School of AI', order.email)
