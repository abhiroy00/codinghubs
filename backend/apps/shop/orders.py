"""Order lifecycle: create (server-priced, stock reserved), pay (verified), fulfil (idempotent), cancel, refund, ship."""
import logging
import re
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from . import audit, emails, gateway, inventory
from .models import (
    Coupon, CouponRedemption, DigitalAsset, DownloadPermission, Order, OrderItem, Payment, Product, Refund, StoreSettings,
)
from .money import q, to_minor
from .pricing import CartError, Totals, price_lines

logger = logging.getLogger(__name__)

PHONE = re.compile(r'^\+?[0-9 ()-]{7,18}$')
ADDRESS_FIELDS = ('line1', 'line2', 'city', 'state', 'postal_code', 'country')


def new_number() -> str:
    return f'CH-{timezone.now():%y%m%d}-{uuid.uuid4().hex[:6].upper()}'


def clean_address(data, required: bool) -> dict:
    data = data or {}
    out = {k: str(data.get(k, '')).strip()[:120] for k in ADDRESS_FIELDS}
    out['country'] = out['country'] or 'India'
    if required:
        for k in ('line1', 'city', 'state', 'postal_code'):
            if not out[k]:
                raise CartError('Please complete the delivery address.', 'address_required')
        if out['country'].lower() == 'india' and not re.fullmatch(r'[1-9][0-9]{5}', out['postal_code']):
            raise CartError('Enter a valid 6-digit PIN code.', 'bad_pin')
    return out


@transaction.atomic
def create_order(items, *, name, email, phone, shipping_address, billing_address=None, coupon_code='', user=None, note='') -> tuple[Order, Totals]:
    """items: list of (product_id, qty). Re-prices everything from the database, locks the rows and reserves stock."""
    name, email, phone = name.strip(), email.strip().lower(), phone.strip()
    if len(name) < 2:
        raise CartError('Please enter your name.', 'name_required')
    if '@' not in email:
        raise CartError('Please enter a valid email address.', 'email_required')
    if phone and not PHONE.match(phone):
        raise CartError('Please enter a valid phone number.', 'bad_phone')
    if not items:
        raise CartError('Your cart is empty.', 'empty_cart')

    ids = sorted({pid for pid, _ in items})
    inventory.expire_stale_orders(ids)
    locked = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=ids)}  # serialises concurrent checkouts per product
    pairs = []
    for pid, qty in items:
        product = locked.get(pid)
        if not product:
            raise CartError('An item in your cart is no longer available.', 'unavailable')
        if not isinstance(qty, int) or qty < 1:
            raise CartError('Invalid quantity.', 'bad_quantity')
        pairs.append((product, qty if (product.is_physical) else 1))
    totals = price_lines(pairs, coupon_code, email, strict=True)

    cfg = StoreSettings.load()
    if user is None and not cfg.allow_guest_checkout:
        raise CartError('Please log in to check out.', 'login_required')
    ship = clean_address(shipping_address, required=totals.has_physical) if totals.has_physical else {}
    bill = clean_address(billing_address or shipping_address, required=False) if (billing_address or shipping_address) else {}

    order = Order.objects.create(
        number=new_number(), user=user, email=email, name=name[:120], phone=phone, currency=totals.currency,
        subtotal=totals.subtotal, discount=totals.discount, tax=totals.tax, shipping=totals.shipping, total=totals.total,
        tax_mode=totals.tax_mode, coupon_code=totals.coupon_code, has_physical=totals.has_physical, has_digital=totals.has_digital,
        billing_address=bill, shipping_address=ship, customer_note=note.strip()[:300],
        fulfilment_status=Order.FUL_UNFULFILLED if totals.has_physical else Order.FUL_NA,
    )
    for ln in totals.lines:
        OrderItem.objects.create(
            order=order, product=ln.product, title=ln.product.title, sku=ln.product.sku, product_type=ln.product.product_type,
            unit_price=ln.unit_price, quantity=ln.quantity, discount=ln.discount, tax=ln.tax, tax_rate=ln.tax_rate, line_total=ln.total,
        )
    if totals.coupon_code:
        CouponRedemption.objects.create(order=order, coupon=Coupon.objects.get(code=totals.coupon_code), email=email, amount=totals.discount)
    inventory.reserve_for_order(order, locked)
    return order, totals


def start_payment(order: Order) -> dict:
    """Create the provider order for an unpaid order. A free order (total 0) is completed without the gateway."""
    if order.total <= 0:
        mark_paid(order, provider_payment_id='', provider_order_id='', method='free')
        return {'free': True, 'order_number': order.number, 'token': order.public_token}
    if not gateway.configured():
        raise CartError('Online payment is not set up yet. Please contact us to order.', 'gateway_not_configured')
    rp = gateway.create_order(to_minor(order.total), order.number, {'order_number': order.number})
    Payment.objects.create(order=order, provider_order_id=rp['id'], amount=order.total, currency=order.currency)
    Order.objects.filter(pk=order.pk).update(payment_status=Order.PAY_PENDING)
    return {
        'free': False, 'order_number': order.number, 'token': order.public_token, 'razorpay_order_id': rp['id'],
        'amount': to_minor(order.total), 'currency': order.currency, 'key': gateway.public_key(),
        'name': order.name, 'email': order.email, 'phone': order.phone,
    }


def mark_paid(order: Order, *, provider_payment_id: str, provider_order_id: str, method='razorpay') -> bool:
    """Idempotent: returns True only for the call that actually moved the order to paid (so e-mails and files go out once)."""
    with transaction.atomic():
        o = Order.objects.select_for_update().get(pk=order.pk)
        if o.payment_status in (Order.PAY_PAID, Order.PAY_PART, Order.PAY_REFUNDED):
            return False
        if o.status in (Order.ST_CANCELLED, Order.ST_EXPIRED):
            # the money arrived for an order we already released: keep it paid so support can fulfil or refund it
            logger.warning('Payment received for %s order %s', o.status, o.number)
            _reserve_again(o)
        o.status = Order.ST_PAID
        o.payment_status = Order.PAY_PAID
        o.paid_at = timezone.now()
        o.fulfilment_status = Order.FUL_UNFULFILLED if o.has_physical else Order.FUL_NA
        if not o.has_physical:
            o.status = Order.ST_DELIVERED  # digital only: access is granted below
        o.save()
        if provider_order_id or provider_payment_id:
            pay = o.payments.filter(provider_order_id=provider_order_id).first() if provider_order_id else None
            pay = pay or o.payments.first()
            if pay:
                pay.status, pay.signature_verified = Payment.S_CAPTURED, True
                if provider_payment_id and not Payment.objects.filter(provider_payment_id=provider_payment_id).exclude(pk=pay.pk).exists():
                    pay.provider_payment_id = provider_payment_id
                pay.save()
        grant_downloads(o)
        audit.log(None, 'order.paid', o, {'method': method})
    emails.order_confirmation(o)
    return True


def _reserve_again(order: Order):
    ids = sorted(i.product_id for i in order.items.all() if i.product_id)
    locked = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=ids)}
    for item in order.items.all():
        p = locked.get(item.product_id)
        if p and p.tracks_stock and item.is_physical:
            inventory.move(p, -item.quantity, 'reserve', order=order, note='late payment')


def mark_failed(order: Order, reason=''):
    with transaction.atomic():
        o = Order.objects.select_for_update().get(pk=order.pk)
        if o.payment_status in (Order.PAY_PAID, Order.PAY_PART, Order.PAY_REFUNDED) or o.status != Order.ST_PENDING:
            return
        o.payment_status = Order.PAY_FAILED
        o.save(update_fields=['payment_status', 'updated_at'])
        o.payments.filter(status=Payment.S_CREATED).update(status=Payment.S_FAILED, failure_reason=reason[:300])
        audit.log(None, 'order.payment_failed', o, {'reason': reason[:200]})
    # the order stays open for a retry until it expires; stock stays reserved until then


def grant_downloads(order: Order):
    for item in order.items.select_related('product'):
        if not (item.product and item.is_digital):
            continue
        for asset in item.product.assets.all():
            DownloadPermission.objects.get_or_create(
                order_item=item, asset=asset, defaults={'order': order, 'max_downloads': item.product.download_limit},
            )


def revoke_downloads(order: Order):
    order.permissions.filter(revoked_at__isnull=True).update(revoked_at=timezone.now())


@transaction.atomic
def cancel_order(order: Order, actor=None, request=None, reason=''):
    o = Order.objects.select_for_update().get(pk=order.pk)
    if o.status in (Order.ST_SHIPPED, Order.ST_DELIVERED) and o.has_physical:
        raise CartError('A shipped order cannot be cancelled. Use a refund or return instead.', 'too_late')
    if o.status in (Order.ST_CANCELLED, Order.ST_EXPIRED, Order.ST_REFUNDED):
        return o
    was_paid = o.payment_status in (Order.PAY_PAID, Order.PAY_PART)
    o.status, o.fulfilment_status = Order.ST_CANCELLED, Order.FUL_CANCELLED
    if not was_paid:
        o.payment_status = Order.PAY_UNPAID if o.payment_status != Order.PAY_FAILED else Order.PAY_FAILED
    o.save()
    inventory.release_for_order(o, note=f'cancelled: {reason}'[:200])
    revoke_downloads(o)
    audit.log(actor, 'order.cancelled', o, {'reason': reason, 'paid': was_paid}, request)
    return o


@transaction.atomic
def refund_order(order: Order, amount: Decimal | None, actor=None, request=None, reason='') -> Refund:
    o = Order.objects.select_for_update().get(pk=order.pk)
    if o.payment_status not in (Order.PAY_PAID, Order.PAY_PART):
        raise CartError('Only a paid order can be refunded.', 'not_paid')
    remaining = q(o.total - o.refunded_amount)
    amount = q(amount) if amount is not None else remaining
    if amount <= 0 or amount > remaining:
        raise CartError(f'Refund must be between ₹0.01 and ₹{remaining}.', 'bad_amount')
    payment = o.payments.filter(status__in=[Payment.S_CAPTURED, Payment.S_PART_REFUNDED]).exclude(provider_payment_id='').first()
    provider_id = ''
    if payment:
        res = gateway.refund(payment.provider_payment_id, to_minor(amount), {'order_number': o.number, 'reason': reason[:100]})
        provider_id = res.get('id', '')
    elif o.total > 0:
        raise CartError('This order has no gateway payment to refund. Refund it outside the system and note it on the order.', 'no_payment')
    refund = Refund.objects.create(order=o, payment=payment, provider_refund_id=provider_id, amount=amount, reason=reason[:300], created_by=actor if getattr(actor, 'is_authenticated', False) else None)
    apply_refund_totals(o, amount)
    audit.log(actor, 'order.refunded', o, {'amount': str(amount), 'reason': reason}, request)
    emails.refunded(o, amount)
    return refund


def apply_refund_totals(o: Order, amount: Decimal):
    o.refunded_amount = q(o.refunded_amount + amount)
    full = o.refunded_amount >= o.total
    o.payment_status = Order.PAY_REFUNDED if full else Order.PAY_PART
    o.status = Order.ST_REFUNDED if full else Order.ST_PART_REFUNDED
    if full:
        o.fulfilment_status = Order.FUL_CANCELLED if o.fulfilment_status in (Order.FUL_UNFULFILLED, Order.FUL_PROCESSING) else o.fulfilment_status
        revoke_downloads(o)  # a fully refunded purchase no longer gives access to the files
        o.payments.update(status=Payment.S_REFUNDED)
    else:
        o.payments.update(status=Payment.S_PART_REFUNDED)
    o.save()


FULFILMENT_FLOW = {
    Order.ST_PAID: (Order.ST_PROCESSING, Order.ST_CANCELLED),
    Order.ST_PROCESSING: (Order.ST_SHIPPED, Order.ST_CANCELLED),
    Order.ST_SHIPPED: (Order.ST_DELIVERED,),
    Order.ST_PART_REFUNDED: (Order.ST_PROCESSING, Order.ST_SHIPPED, Order.ST_DELIVERED),
    Order.ST_REFUND_REQ: (Order.ST_PROCESSING, Order.ST_CANCELLED),
}


@transaction.atomic
def set_status(order: Order, new: str, actor=None, request=None, carrier='', tracking=''):
    """The only way an admin moves a physical order forward; arbitrary jumps are rejected."""
    o = Order.objects.select_for_update().get(pk=order.pk)
    if o.payment_status not in (Order.PAY_PAID, Order.PAY_PART):
        raise CartError('Only a paid order can be fulfilled.', 'not_paid')
    if new == Order.ST_CANCELLED:
        return cancel_order(o, actor, request, 'cancelled by admin')
    if new not in FULFILMENT_FLOW.get(o.status, ()):
        raise CartError(f'Cannot move an order from “{o.status}” to “{new}”.', 'bad_transition')
    o.status = new
    if new == Order.ST_PROCESSING:
        o.fulfilment_status = Order.FUL_PROCESSING
    elif new == Order.ST_SHIPPED:
        o.fulfilment_status, o.shipped_at = Order.FUL_SHIPPED, timezone.now()
        o.carrier, o.tracking_number = carrier[:60], tracking[:80]
    elif new == Order.ST_DELIVERED:
        o.fulfilment_status, o.delivered_at = Order.FUL_DELIVERED, timezone.now()
    o.save()
    audit.log(actor, 'order.status', o, {'to': new, 'carrier': carrier, 'tracking': tracking}, request)
    if new == Order.ST_SHIPPED:
        emails.shipped(o)
    return o


def request_refund(order: Order):
    if order.payment_status not in (Order.PAY_PAID, Order.PAY_PART):
        raise CartError('Only a paid order can be refunded.', 'not_paid')
    if order.status == Order.ST_REFUND_REQ:
        return order
    Order.objects.filter(pk=order.pk).update(status=Order.ST_REFUND_REQ)
    order.refresh_from_db()
    audit.log(order.user, 'order.refund_requested', order)
    return order


# ---- provider reconciliation ----
def reconcile_payment(order: Order, provider_order_id: str, provider_payment_id: str, signature: str | None) -> str:
    """Browser callback or webhook arrives here. Never trusts the browser: the signature is checked AND the gateway is asked
    for the payment, whose status and amount must match. Returns 'paid' | 'pending' | 'failed'."""
    if signature is not None and not gateway.verify_signature(provider_order_id, provider_payment_id, signature):
        raise CartError('Payment signature could not be verified.', 'bad_signature')
    payment = order.payments.filter(provider_order_id=provider_order_id).first()
    if not payment:
        raise CartError('Unknown payment for this order.', 'unknown_payment')
    info = gateway.fetch_payment(provider_payment_id)
    if info.get('order_id') != provider_order_id or int(info.get('amount', -1)) != to_minor(payment.amount) or info.get('currency') != payment.currency:
        logger.error('Payment mismatch for order %s: %s', order.number, {k: info.get(k) for k in ('order_id', 'amount', 'currency')})
        raise CartError('The payment does not match this order.', 'mismatch')
    status = info.get('status')
    if status == 'captured':
        mark_paid(order, provider_payment_id=provider_payment_id, provider_order_id=provider_order_id)
        return 'paid'
    if status == 'failed':
        mark_failed(order, info.get('error_description') or 'payment failed')
        return 'failed'
    return 'pending'  # created / authorized: wait for the capture webhook
