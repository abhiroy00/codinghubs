import json
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from rest_framework import generics, permissions, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.content import services as content_services

from . import access, downloads, gateway, orders, payloads
from .models import (
    Cart, CartItem, DigitalAsset, DownloadPermission, Order, PaymentEvent, Product, ProductCategory, Project, ProjectGuide, StoreSettings,
)
from .money import q
from .pricing import MAX_QTY, CartError, normalise_qty, price_lines

logger = logging.getLogger(__name__)


class PublicPage(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 48


def no_cache(response):
    response['Cache-Control'] = 'no-store'
    return response


def revalidate(response):
    response['Cache-Control'] = 'public, max-age=0, must-revalidate'
    return response


def cart_error(exc: CartError, code=400):
    return Response({'detail': exc.message, 'code': exc.code}, status=code)


class CheckoutThrottle(AnonRateThrottle):
    scope = 'shop_checkout'
    rate = '20/hour'


class CouponThrottle(AnonRateThrottle):
    scope = 'shop_coupon'
    rate = '30/hour'


# ============ catalogue ============
class ProductList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    pagination_class = PublicPage

    def get_serializer_class(self):  # not used: payload dicts below
        raise NotImplementedError

    def filter_queryset(self, qs=None):
        qs = payloads.public_products()
        p = self.request.query_params
        if t := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=t) | Q(short_description__icontains=t) | Q(author__icontains=t) | Q(topics__icontains=t))
        if c := p.get('category'):
            qs = qs.filter(category__slug=c)
        if t := p.get('type'):
            qs = qs.filter(product_type=t)
        if k := p.get('kind'):
            qs = qs.filter(item_kind=k)
        for key, op in (('min_price', 'gte'), ('max_price', 'lte')):
            if p.get(key):
                try:
                    qs = qs.filter(**{f'price__{op}': Decimal(p[key])})
                except InvalidOperation:
                    pass
        if p.get('featured') in ('1', 'true'):
            qs = qs.filter(is_featured=True)
        if p.get('free') in ('1', 'true'):
            qs = qs.filter(price=0)
        order = {'price_asc': 'price', 'price_desc': '-price', 'title': 'title', 'newest': '-published_at'}.get(p.get('ordering', 'newest'), '-published_at')
        return qs.order_by(order, '-id')

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset())
        resp = self.get_paginated_response([payloads.product_card(p) for p in page])
        public = Product.objects.public().values('pk')
        resp.data = dict(resp.data) | {'categories': [
            {'name': c.name, 'slug': c.slug, 'count': c.n}
            for c in ProductCategory.objects.annotate(n=Count('products', filter=Q(products__pk__in=public))).filter(n__gt=0)
        ]}
        return revalidate(resp)


def load_published_or_preview(model, request, slug, qs):
    token = request.query_params.get('preview') if hasattr(request, 'query_params') else request.GET.get('preview')
    if token:
        obj = model.objects.filter(slug=slug).first()
        kind = {'Product': 'product', 'Project': 'project', 'ProjectGuide': 'guide'}[model.__name__]
        if obj and content_services.check_preview_token(token, kind, obj.pk):
            return obj, True
        raise Http404
    obj = qs.filter(slug=slug).first()
    if not obj:
        raise Http404
    return obj, False


class ProductDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        obj, preview = load_published_or_preview(Product, request, slug, payloads.public_products())
        resp = Response(payloads.product_detail(obj, preview))
        return no_cache(resp) if preview else revalidate(resp)


class StoreCategories(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        public = Product.objects.public().values('pk')
        rows = ProductCategory.objects.annotate(n=Count('products', filter=Q(products__pk__in=public))).filter(n__gt=0)
        return revalidate(Response([{'name': c.name, 'slug': c.slug, 'count': c.n} for c in rows]))


class StorePublicSettings(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        c = StoreSettings.load()
        return revalidate(Response({
            'currency': c.currency, 'tax_mode': c.tax_mode, 'allow_guest_checkout': c.allow_guest_checkout, 'contact_email': c.contact_email,
            'contact_phone': c.contact_phone, 'refund_policy': c.refund_policy, 'return_policy': c.return_policy,
            'digital_delivery_policy': c.digital_delivery_policy, 'shipping_policy': c.shipping_policy,
            'payments_enabled': gateway.configured(), 'free_shipping_over': str(c.free_shipping_over) if c.free_shipping_over is not None else None,
            'shipping_flat': str(c.shipping_flat),
        }))


class ProjectList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    pagination_class = PublicPage

    def list(self, request, *args, **kwargs):
        qs = payloads.public_projects()
        p = request.query_params
        if t := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=t) | Q(summary__icontains=t) | Q(technologies__icontains=t))
        if v := p.get('category'):
            qs = qs.filter(category__iexact=v)
        if v := p.get('difficulty'):
            qs = qs.filter(difficulty=v)
        if v := p.get('technology'):
            qs = qs.filter(technologies__icontains=v)
        if p.get('paid') in ('1', 'true'):
            qs = qs.filter(product__price__gt=0)
        if p.get('free') in ('1', 'true'):
            qs = qs.exclude(product__price__gt=0)
        order = {'title': 'title', 'oldest': 'published_at', 'newest': '-published_at'}.get(p.get('ordering', 'newest'), '-published_at')
        page = self.paginate_queryset(qs.order_by(order, '-id'))
        resp = self.get_paginated_response([payloads.project_card(x) for x in page])
        all_pub = payloads.public_projects()
        resp.data = dict(resp.data) | {
            'categories': sorted(set(all_pub.exclude(category='').values_list('category', flat=True))),
            'technologies': sorted({t for ts in all_pub.values_list('technologies', flat=True) for t in ts}),
        }
        return revalidate(resp)


class ProjectDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        obj, preview = load_published_or_preview(Project, request, slug, payloads.public_projects())
        resp = Response(payloads.project_detail(obj, request.user, preview))
        return no_cache(resp)  # depends on who is asking


class GuideList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    pagination_class = PublicPage

    def list(self, request, *args, **kwargs):
        qs = payloads.public_guides()
        p = request.query_params
        if t := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=t) | Q(summary__icontains=t) | Q(technologies__icontains=t))
        for key, field in (('category', 'category__iexact'), ('difficulty', 'difficulty'), ('access', 'access_type')):
            if p.get(key):
                qs = qs.filter(**{field: p[key]})
        if v := p.get('technology'):
            qs = qs.filter(technologies__icontains=v)
        order = {'title': 'title', 'newest': '-published_at'}.get(p.get('ordering', 'newest'), '-published_at')
        page = self.paginate_queryset(qs.order_by(order, '-id'))
        resp = self.get_paginated_response([payloads.guide_card(x) for x in page])
        all_pub = payloads.public_guides()
        resp.data = dict(resp.data) | {'categories': sorted(set(all_pub.exclude(category='').values_list('category', flat=True)))}
        return revalidate(resp)


class GuideDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        obj, preview = load_published_or_preview(ProjectGuide, request, slug, payloads.public_guides())
        return no_cache(Response(payloads.guide_detail(obj, request.user, preview)))


class ResourceDownloadLink(APIView):
    """POST /guides/<slug>/files/<id>/link/ or /projects/<slug>/files/<id>/link/ -> short-lived signed link, only if entitled."""

    permission_classes = [permissions.AllowAny]
    kind = 'guide'

    def post(self, request, slug, asset_id):
        if self.kind == 'guide':
            owner = payloads.public_guides().filter(slug=slug).first()
            asset = DigitalAsset.objects.filter(pk=asset_id, guide=owner).first() if owner else None
            fn = downloads.link_for_guide_asset
        else:
            owner = payloads.public_projects().filter(slug=slug).first()
            asset = DigitalAsset.objects.filter(pk=asset_id, project=owner).first() if owner else None
            fn = downloads.link_for_project_asset
        if not asset:
            raise Http404
        try:
            return no_cache(Response({'url': fn(request.user, asset), 'expires_in': settings.STORE_DOWNLOAD_LINK_TTL}))
        except PermissionError:
            return Response({'detail': 'Please log in or purchase to download this file.'}, status=status.HTTP_403_FORBIDDEN)


# ============ cart ============
def get_cart(request, create=False):
    """Logged-in customers have a server-side cart tied to the account; guests use a random token kept in their browser.
    A guest cart is merged into the account cart on the first logged-in request."""
    token = request.headers.get('X-Cart-Token', '')
    guest = None
    if token:
        try:
            guest = Cart.objects.filter(token=token, user__isnull=True).first()
        except (ValueError, Exception):  # malformed uuid
            guest = None
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        if guest and guest.pk != cart.pk:
            with transaction.atomic():
                for it in guest.items.all():
                    mine, made = CartItem.objects.get_or_create(cart=cart, product=it.product, defaults={'quantity': it.quantity})
                    if not made:
                        mine.quantity = min(MAX_QTY, mine.quantity + it.quantity)
                        mine.save(update_fields=['quantity'])
                if guest.coupon_code and not cart.coupon_code:
                    cart.coupon_code = guest.coupon_code
                    cart.save(update_fields=['coupon_code'])
                guest.delete()
        return cart
    if guest:
        return guest
    return Cart.objects.create() if create else None


def cart_payload(cart, email=''):
    pairs = [(i.product, i.quantity) for i in cart.items.select_related('product', 'product__category').prefetch_related('product__images')] if cart else []
    t = price_lines(pairs, cart.coupon_code if cart else '', email)
    return {
        'token': str(cart.token) if cart and not cart.user_id else None,
        'items': [{
            'product': payloads.product_card(l.product), 'quantity': l.quantity, 'unit_price': str(l.unit_price), 'subtotal': str(l.subtotal),
            'discount': str(l.discount), 'tax': str(l.tax), 'problem': l.problem, 'max_quantity': 1 if (l.product.is_digital and not l.product.is_physical) else MAX_QTY,
        } for l in t.lines],
        'subtotal': str(t.subtotal), 'discount': str(t.discount), 'tax': str(t.tax), 'shipping': str(t.shipping), 'total': str(t.total),
        'coupon': t.coupon_code, 'coupon_error': t.coupon_error, 'tax_mode': t.tax_mode, 'currency': t.currency, 'has_physical': t.has_physical,
        'has_digital': t.has_digital, 'problems': t.problems, 'count': sum(l.quantity for l in t.lines),
    }


class CartView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return no_cache(Response(cart_payload(get_cart(request))))


class CartItems(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            product_id, qty = int(request.data.get('product')), int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid request.', 'code': 'invalid'}, status=400)
        product = Product.objects.public().filter(pk=product_id).first()
        if not product:
            return Response({'detail': 'This item is not available.', 'code': 'unavailable'}, status=404)
        try:
            qty = normalise_qty(product, qty)
        except CartError as exc:
            return cart_error(exc)
        cart = get_cart(request, create=True)
        item, made = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': qty})
        if not made:
            item.quantity = min(MAX_QTY, item.quantity + qty) if product.is_physical else 1
            item.save(update_fields=['quantity'])
        return no_cache(Response(cart_payload(cart), status=201))


class CartItemDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def _item(self, request, product_id):
        cart = get_cart(request)
        return cart, (cart.items.filter(product_id=product_id).select_related('product').first() if cart else None)

    def patch(self, request, product_id):
        cart, item = self._item(request, product_id)
        if not item:
            raise Http404
        try:
            qty = normalise_qty(item.product, int(request.data.get('quantity')))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid quantity.', 'code': 'bad_quantity'}, status=400)
        except CartError as exc:
            return cart_error(exc)
        item.quantity = qty
        item.save(update_fields=['quantity'])
        return no_cache(Response(cart_payload(cart)))

    def delete(self, request, product_id):
        cart, item = self._item(request, product_id)
        if item:
            item.delete()
        return no_cache(Response(cart_payload(cart)))


class CartCoupon(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [CouponThrottle]

    def post(self, request):
        cart = get_cart(request, create=True)
        code = str(request.data.get('code', '')).strip().upper()[:40]
        cart.coupon_code = code
        cart.save(update_fields=['coupon_code'])
        data = cart_payload(cart, str(request.data.get('email', '')))
        if code and data['coupon_error']:
            cart.coupon_code = ''
            cart.save(update_fields=['coupon_code'])
            return no_cache(Response(data | {'coupon': ''}, status=400))
        return no_cache(Response(data))


# ============ checkout & payment ============
class Checkout(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [CheckoutThrottle]

    def post(self, request):
        cart = get_cart(request)
        if not cart or not cart.items.exists():
            return Response({'detail': 'Your cart is empty.', 'code': 'empty_cart'}, status=400)
        d = request.data
        items = [(i.product_id, i.quantity) for i in cart.items.all()]
        try:
            order, _ = orders.create_order(
                items, name=str(d.get('name', '')), email=str(d.get('email', '')), phone=str(d.get('phone', '')),
                shipping_address=d.get('shipping_address'), billing_address=d.get('billing_address'), coupon_code=cart.coupon_code,
                user=request.user if request.user.is_authenticated else None, note=str(d.get('note', '')),
            )
        except CartError as exc:
            return cart_error(exc, 401 if exc.code == 'login_required' else 400)
        try:
            result = orders.start_payment(order)
        except CartError as exc:
            orders.cancel_order(order, reason='payment could not be started')
            return cart_error(exc, 503)
        except gateway.GatewayError as exc:
            orders.cancel_order(order, reason='gateway unavailable')
            return Response({'detail': str(exc), 'code': 'gateway_error'}, status=503)
        cart.items.all().delete()
        cart.coupon_code = ''
        cart.save(update_fields=['coupon_code'])
        return no_cache(Response(result, status=201))


class VerifyPayment(APIView):
    """The browser reports what Razorpay Checkout returned. It is only a hint: we verify the signature and then ask the
    gateway for the payment before anything is marked paid. A visit to the success URL alone never does that."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [CheckoutThrottle]

    def post(self, request):
        d = request.data
        order = access.order_for_request(request, str(d.get('order_number', '')))
        if not order:
            raise Http404
        try:
            outcome = orders.reconcile_payment(order, str(d.get('razorpay_order_id', '')), str(d.get('razorpay_payment_id', '')), str(d.get('razorpay_signature', '')))
        except CartError as exc:
            return cart_error(exc)
        except gateway.GatewayError as exc:
            return Response({'detail': str(exc), 'code': 'gateway_error'}, status=503)
        order.refresh_from_db()
        return no_cache(Response({'status': outcome, 'order_status': order.status, 'payment_status': order.payment_status}))


class PaymentFailed(APIView):
    """The customer closed or failed the payment window: keep the order open for a retry, record the failure."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order = access.order_for_request(request, str(request.data.get('order_number', '')))
        if not order:
            raise Http404
        orders.mark_failed(order, str(request.data.get('reason', ''))[:200])
        return no_cache(Response({'status': 'recorded'}))


class RetryPayment(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [CheckoutThrottle]

    def post(self, request, number):
        order = access.order_for_request(request, number)
        if not order or order.status != Order.ST_PENDING:
            raise Http404
        try:
            return no_cache(Response(orders.start_payment(order)))
        except CartError as exc:
            return cart_error(exc, 503)
        except gateway.GatewayError as exc:
            return Response({'detail': str(exc)}, status=503)


class Webhook(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.body
        if not gateway.verify_webhook(body, request.headers.get('X-Razorpay-Signature', '')):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = json.loads(body)
        except ValueError:
            return Response({'detail': 'Bad payload.'}, status=400)
        event_id = request.headers.get('X-Razorpay-Event-Id', '') or f"{payload.get('event')}:{payload.get('payload', {}).get('payment', {}).get('entity', {}).get('id', '')}:{payload.get('created_at', '')}"
        try:
            with transaction.atomic():
                ev = PaymentEvent.objects.create(event_id=event_id[:100], event_type=str(payload.get('event', ''))[:60], payload=payload)
        except IntegrityError:  # this delivery was already received: processing is idempotent
            return HttpResponse(status=200)
        try:
            handle_event(payload)
            ev.processed = True
            ev.save(update_fields=['processed'])
        except Exception as exc:  # noqa: BLE001 - never 5xx forever: the provider retries; we keep the error for support
            logger.exception('Webhook handling failed')
            ev.error = str(exc)[:300]
            ev.save(update_fields=['error'])
            return Response({'detail': 'Could not process.'}, status=500)
        return HttpResponse(status=200)


def handle_event(payload):
    event = payload.get('event', '')
    ent = payload.get('payload', {}).get('payment', {}).get('entity', {})
    rp_order, rp_payment = ent.get('order_id'), ent.get('id')
    if not rp_order:
        return
    order = Order.objects.filter(payments__provider_order_id=rp_order).distinct().first()
    if not order:
        return  # not a store order (e.g. a course payment handled by apps.payments)
    if event in ('payment.captured', 'order.paid'):
        orders.reconcile_payment(order, rp_order, rp_payment, None)
    elif event == 'payment.failed':
        orders.mark_failed(order, ent.get('error_description') or 'payment failed')
    elif event in ('refund.processed', 'refund.created'):
        ref = payload.get('payload', {}).get('refund', {}).get('entity', {})
        from .models import Refund

        rid = ref.get('id', '')
        if rid and not Refund.objects.filter(provider_refund_id=rid).exists():
            amount = q(Decimal(ref.get('amount', 0)) / 100)
            with transaction.atomic():
                o = Order.objects.select_for_update().get(pk=order.pk)
                Refund.objects.create(order=o, payment=o.payments.first(), provider_refund_id=rid, amount=amount, reason='refund recorded from gateway')
                orders.apply_refund_totals(o, amount)


# ============ customer account ============
class MyOrders(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PublicPage

    def list(self, request, *args, **kwargs):
        from .serializers import OrderSerializer

        qs = Order.objects.filter(user=request.user).exclude(status__in=[Order.ST_EXPIRED]).prefetch_related('items').order_by('-created_at')
        page = self.paginate_queryset(qs)
        return no_cache(self.get_paginated_response(OrderSerializer(page, many=True).data))


class OrderDetail(APIView):
    """Owner (logged in) or a guest holding the order token. Anyone else gets a 404, never a hint that the order exists."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, number):
        from .serializers import OrderSerializer

        order = access.order_for_request(request, number)
        if not order:
            raise Http404
        data = OrderSerializer(order).data
        data['downloads'] = download_rows(order)
        return no_cache(Response(data))


def download_rows(order):
    rows = []
    if not order.is_paid:
        return rows
    for perm in order.permissions.select_related('asset', 'order_item'):
        rows.append({
            'id': perm.id, 'label': perm.asset.label, 'product': perm.order_item.title, 'size': perm.asset.size, 'type': perm.asset.content_type,
            'available': perm.active, 'remaining': None if perm.max_downloads is None else max(0, perm.max_downloads - perm.download_count),
        })
    return rows


class MyDownloads(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        perms = DownloadPermission.objects.filter(order__user=request.user, order__payment_status__in=[Order.PAY_PAID, Order.PAY_PART]).select_related('asset', 'order_item', 'order')
        return no_cache(Response([{
            'id': p.id, 'label': p.asset.label, 'product': p.order_item.title, 'order': p.order.number, 'size': p.asset.size, 'type': p.asset.content_type,
            'available': p.active, 'remaining': None if p.max_downloads is None else max(0, p.max_downloads - p.download_count),
        } for p in perms]))


class DownloadLink(APIView):
    """POST /downloads/<permission id>/link/ -> expiring signed link. Ownership is checked on every call."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def post(self, request, perm_id):
        perm = DownloadPermission.objects.select_related('order').filter(pk=perm_id).first()
        order = access.order_for_request(request, perm.order.number) if perm else None
        if not perm or not order or order.pk != perm.order_id or not order.is_paid:
            raise Http404
        try:
            return no_cache(Response({'url': downloads.link_for_permission(perm, request.user), 'expires_in': settings.STORE_DOWNLOAD_LINK_TTL}))
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=403)


def serve_download(request, token):
    return downloads.serve(request, token)


class ClaimOrder(APIView):
    """Attach a guest order to the logged-in account (needs the order number + the private token from the email/link)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order = Order.objects.filter(number=str(request.data.get('order_number', '')), user__isnull=True).first()
        from secrets import compare_digest

        if not order or not compare_digest(str(request.data.get('token', '')), order.public_token):
            raise Http404
        order.user = request.user
        order.save(update_fields=['user', 'updated_at'])
        return no_cache(Response({'claimed': order.number}))


class RequestRefund(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, number):
        order = access.order_for_request(request, number)
        if not order:
            raise Http404
        try:
            orders.request_refund(order)
        except CartError as exc:
            return cart_error(exc)
        return no_cache(Response({'status': 'refund_requested'}))
