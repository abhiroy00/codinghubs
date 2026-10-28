"""Razorpay wrapper. Everything that talks to the provider goes through here so tests can replace it and the rest of the
code never sees keys. Keys come from the server environment only."""
import hashlib
import hmac
import logging

import razorpay
from django.conf import settings

from apps.payments.razorpay_client import get_client

logger = logging.getLogger(__name__)


class GatewayError(Exception):
    pass


def configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def public_key() -> str:
    return settings.RAZORPAY_KEY_ID


def is_live() -> bool:
    return settings.RAZORPAY_KEY_ID.startswith('rzp_live_')


def create_order(amount_minor: int, receipt: str, notes: dict) -> dict:
    try:
        return get_client().order.create({'amount': amount_minor, 'currency': 'INR', 'receipt': receipt[:40], 'notes': notes, 'payment_capture': 1})
    except (razorpay.errors.BadRequestError, razorpay.errors.GatewayError, razorpay.errors.ServerError) as exc:
        logger.error('Razorpay order.create failed: %s', exc)
        raise GatewayError('The payment gateway is not available right now.') from exc


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), f'{order_id}|{payment_id}'.encode(), hashlib.sha256).hexdigest()
    return bool(signature) and hmac.compare_digest(expected, signature)


def verify_webhook(body: bytes, signature: str) -> bool:
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    return hmac.compare_digest(hmac.new(secret.encode(), body, hashlib.sha256).hexdigest(), signature)


def fetch_payment(payment_id: str) -> dict:
    try:
        return get_client().payment.fetch(payment_id)
    except Exception as exc:  # noqa: BLE001 - provider SDK raises several types
        logger.error('Razorpay payment.fetch failed: %s', exc)
        raise GatewayError('Could not confirm the payment with the gateway.') from exc


def refund(payment_id: str, amount_minor: int, notes: dict) -> dict:
    try:
        return get_client().payment.refund(payment_id, {'amount': amount_minor, 'notes': notes})
    except Exception as exc:  # noqa: BLE001
        logger.error('Razorpay refund failed: %s', exc)
        raise GatewayError('The refund could not be processed by the gateway.') from exc
