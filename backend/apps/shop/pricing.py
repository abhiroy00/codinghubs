"""All cart / order maths. Runs on the server only: prices, discounts, tax, shipping and totals sent by the browser are ignored."""
from dataclasses import dataclass, field
from decimal import Decimal

from django.utils import timezone

from .models import Coupon, CouponRedemption, Order, Product, StoreSettings
from .money import q

MAX_QTY = 10


class CartError(Exception):
    """A problem the customer can fix (unavailable item, bad coupon...). `code` is stable for the UI."""

    def __init__(self, message, code='invalid'):
        super().__init__(message)
        self.message, self.code = message, code


@dataclass
class Line:
    product: Product
    quantity: int
    unit_price: Decimal = Decimal('0')
    subtotal: Decimal = Decimal('0')
    discount: Decimal = Decimal('0')
    tax_rate: Decimal = Decimal('0')
    tax: Decimal = Decimal('0')
    total: Decimal = Decimal('0')
    problem: str = ''


@dataclass
class Totals:
    lines: list = field(default_factory=list)
    subtotal: Decimal = Decimal('0')
    discount: Decimal = Decimal('0')
    tax: Decimal = Decimal('0')
    shipping: Decimal = Decimal('0')
    total: Decimal = Decimal('0')
    coupon_code: str = ''
    coupon_error: str = ''
    tax_mode: str = 'none'
    has_physical: bool = False
    has_digital: bool = False
    currency: str = 'INR'
    problems: list = field(default_factory=list)


def normalise_qty(product: Product, qty: int) -> int:
    if qty < 1:
        raise CartError('Quantity must be at least 1.', 'bad_quantity')
    if product.is_digital and not product.is_physical:
        return 1  # a digital licence is bought once per order
    return min(qty, MAX_QTY)


def find_coupon(code: str) -> Coupon:
    coupon = Coupon.objects.filter(code__iexact=code.strip()).first() if code else None
    if not coupon or not coupon.is_active:
        raise CartError('This coupon code is not valid.', 'coupon_invalid')
    now = timezone.now()
    if coupon.valid_from and coupon.valid_from > now:
        raise CartError('This coupon is not active yet.', 'coupon_not_started')
    if coupon.valid_until and coupon.valid_until < now:
        raise CartError('This coupon has expired.', 'coupon_expired')
    return coupon


def coupon_usage(coupon: Coupon, email: str = '', exclude_order=None):
    """Redemptions that still count: orders that were cancelled / expired / failed free the use again."""
    live = CouponRedemption.objects.filter(coupon=coupon).exclude(order__status__in=[Order.ST_CANCELLED, Order.ST_EXPIRED])
    if exclude_order:
        live = live.exclude(order=exclude_order)
    total = live.count()
    mine = live.filter(email__iexact=email).count() if email else 0
    return total, mine


def price_lines(items, coupon_code: str = '', email: str = '', strict: bool = False) -> Totals:
    """items: iterable of (Product, quantity). strict=True raises CartError for anything unavailable (used at checkout);
    strict=False reports `problems` so the cart page can explain them."""
    settings = StoreSettings.load()
    t = Totals(tax_mode=settings.tax_mode, currency=settings.currency)
    for product, qty in items:
        line = Line(product=product, quantity=qty)
        problem = ''
        if not _is_buyable(product):
            problem = 'This item is no longer available.'
        elif product.tracks_stock and product.stock_quantity < qty:
            problem = 'Out of stock.' if product.stock_quantity <= 0 else f'Only {product.stock_quantity} left in stock.'
        if problem:
            if strict:
                raise CartError(f'{product.title}: {problem}', 'unavailable')
            line.problem = problem
            t.problems.append({'product': product.slug, 'message': problem})
        line.unit_price = q(product.price)
        line.subtotal = q(line.unit_price * qty)
        t.lines.append(line)
        t.has_physical |= product.is_physical
        t.has_digital |= product.is_digital
    t.subtotal = q(sum((ln.subtotal for ln in t.lines), Decimal('0')))

    # coupon
    if coupon_code:
        try:
            coupon = find_coupon(coupon_code)
            t.discount = _apply_coupon(coupon, t, email)
            t.coupon_code = coupon.code
        except CartError as exc:
            if strict:
                raise
            t.coupon_error = exc.message

    # tax
    rate_default = settings.default_tax_rate
    for ln in t.lines:
        net = ln.subtotal - ln.discount
        rate = ln.product.tax_rate if ln.product.tax_rate is not None else rate_default
        if settings.tax_mode == StoreSettings.TAX_NONE:
            ln.tax_rate, ln.tax = Decimal('0'), Decimal('0.00')
        elif settings.tax_mode == StoreSettings.TAX_EXCLUSIVE:
            ln.tax_rate, ln.tax = rate, q(net * rate / 100)
        else:  # inclusive: the price already contains the tax
            ln.tax_rate, ln.tax = rate, q(net - net / (1 + rate / 100))
        ln.total = net + (ln.tax if settings.tax_mode == StoreSettings.TAX_EXCLUSIVE else Decimal('0'))
    t.tax = q(sum((ln.tax for ln in t.lines), Decimal('0')))

    # shipping (physical items only)
    after_discount = t.subtotal - t.discount
    if t.has_physical:
        free = settings.free_shipping_over is not None and after_discount >= settings.free_shipping_over
        t.shipping = Decimal('0.00') if free else q(settings.shipping_flat)
    else:
        t.shipping = Decimal('0.00')

    exclusive_tax = t.tax if settings.tax_mode == StoreSettings.TAX_EXCLUSIVE else Decimal('0')
    t.total = q(after_discount + exclusive_tax + t.shipping)
    return t


def _is_buyable(product: Product) -> bool:
    return Product.objects.public().filter(pk=product.pk).exists()


def _apply_coupon(coupon: Coupon, t: Totals, email: str) -> Decimal:
    eligible_ids = set(coupon.eligible_products.values_list('id', flat=True))
    cat_ids = set(coupon.eligible_categories.values_list('id', flat=True))
    restricted = bool(eligible_ids or cat_ids)
    eligible = [
        ln for ln in t.lines
        if not restricted or ln.product.id in eligible_ids or (ln.product.category_id and ln.product.category_id in cat_ids)
    ]
    base = sum((ln.subtotal for ln in eligible), Decimal('0'))
    if not eligible or base <= 0:
        raise CartError('This coupon does not apply to the items in your cart.', 'coupon_not_applicable')
    if t.subtotal < coupon.min_purchase:
        raise CartError(f'Spend at least ₹{coupon.min_purchase} to use this coupon.', 'coupon_min_purchase')
    total_uses, my_uses = coupon_usage(coupon, email)
    if coupon.usage_limit is not None and total_uses >= coupon.usage_limit:
        raise CartError('This coupon has reached its usage limit.', 'coupon_exhausted')
    if coupon.per_customer_limit is not None and email and my_uses >= coupon.per_customer_limit:
        raise CartError('You have already used this coupon the allowed number of times.', 'coupon_used')
    if coupon.discount_type == Coupon.PERCENT:
        amount = q(base * coupon.value / 100)
    else:
        amount = q(coupon.value)
    if coupon.max_discount is not None:
        amount = min(amount, q(coupon.max_discount))
    amount = min(amount, base)
    # split across the eligible lines in proportion to their value; the last line takes the rounding remainder
    remaining = amount
    for i, ln in enumerate(eligible):
        share = remaining if i == len(eligible) - 1 else min(remaining, q(amount * ln.subtotal / base))
        ln.discount = share
        remaining -= share
    return amount
