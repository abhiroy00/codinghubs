"""Stock: stock_quantity is what can still be sold. Unpaid orders hold a reservation (stock is deducted at checkout) that
is released on cancellation, payment failure or expiry. All changes happen inside a transaction with the row locked."""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import InventoryMovement, Order, Product


def move(product: Product, delta: int, reason: str, order=None, note='', user=None) -> Product:
    """Must be called inside transaction.atomic() with the product row locked (select_for_update)."""
    product.stock_quantity += delta
    product.save(update_fields=['stock_quantity', 'updated_at'])
    InventoryMovement.objects.create(product=product, delta=delta, balance_after=product.stock_quantity, reason=reason, order=order, note=note[:200], created_by=user)
    return product


def reserve_for_order(order: Order, locked: dict):
    for item in order.items.all():
        p = locked.get(item.product_id)
        if p and p.tracks_stock and item.is_physical:
            move(p, -item.quantity, 'reserve', order=order)


def release_for_order(order: Order, reason='release', note=''):
    """Give back whatever is still reserved for this order, and only that.

    The net of the reserve/release movements is the outstanding reservation. Using the net
    (instead of "a release already happened") also covers a late payment that reserved the
    stock again after an expiry: cancelling that order returns those units too.
    """
    with transaction.atomic():
        rows = (
            order.movements.filter(reason__in=('reserve', 'release'))
            .values('product_id')
            .annotate(net=Sum('delta'))
        )
        outstanding = {row['product_id']: -row['net'] for row in rows if row['net'] < 0}
        if not outstanding:
            return
        locked = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=sorted(outstanding))}
        for product_id, quantity in outstanding.items():
            product = locked.get(product_id)
            if product and product.tracks_stock:
                move(product, quantity, reason, order=order, note=note)


def expire_stale_orders(product_ids=None) -> int:
    """Lazy expiry (no scheduler needed): unpaid orders older than STORE_PENDING_ORDER_MINUTES lose their reservation."""
    cutoff = timezone.now() - timedelta(minutes=settings.STORE_PENDING_ORDER_MINUTES)
    qs = Order.objects.filter(status=Order.ST_PENDING, created_at__lt=cutoff)
    if product_ids:
        qs = qs.filter(items__product_id__in=product_ids).distinct()
    n = 0
    for order in qs[:50]:
        with transaction.atomic():
            fresh = Order.objects.select_for_update().get(pk=order.pk)
            if fresh.status != Order.ST_PENDING:
                continue
            fresh.status, fresh.payment_status, fresh.fulfilment_status = Order.ST_EXPIRED, Order.PAY_UNPAID, Order.FUL_CANCELLED
            fresh.save(update_fields=['status', 'payment_status', 'fulfilment_status', 'updated_at'])
            release_for_order(fresh, note='order expired')
            n += 1
    return n
