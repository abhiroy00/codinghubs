import logging
from datetime import datetime, time, timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, permissions, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.content import services as content_services

from . import audit, downloads, gateway, inventory, orders
from .models import (
    AuditLog, Coupon, DigitalAsset, InventoryMovement, Order, Product, ProductCategory, Project, ProjectGuide, ProjectQuestion, StoreSettings,
)
from .money import q
from .pricing import CartError
from .serializers import (
    AdminOrderSerializer, CategoryAdminSerializer, CouponSerializer, GuideAdminSerializer, ProductAdminSerializer, ProjectAdminSerializer,
    ProjectQuestionAdminSerializer, StoreSettingsSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class AdminPage(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ShopPermission(permissions.BasePermission):
    """Staff only, plus the matching Django model permission (superusers have all): server-side, per object type and action."""

    PERM_FOR = {'GET': 'view', 'HEAD': 'view', 'OPTIONS': 'view', 'POST': 'add', 'PUT': 'change', 'PATCH': 'change', 'DELETE': 'delete'}

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_staff and u.is_active):
            return False
        action = getattr(view, 'perm_action', None) or self.PERM_FOR.get(request.method)
        return u.has_perm(f'shop.{action}_{view.model_class._meta.model_name}')


class Base:
    permission_classes = [ShopPermission]
    pagination_class = AdminPage


def audited(view, action, obj, detail=None):
    audit.log(view.request.user, action, obj, detail, view.request)


ORDERING = {'date': 'published_at', 'updated': 'updated_at', 'title': 'title', 'status': 'status', 'created': 'created_at', 'price': 'price'}


def content_list_filters(request, qs):
    p = request.query_params
    if q := p.get('q', '').strip()[:100]:
        qs = qs.filter(Q(title__icontains=q) | Q(slug__icontains=q))
    if s := p.get('status'):
        qs = qs.filter(status=s)
    order = p.get('ordering', '-updated')
    return qs.order_by(('-' if order.startswith('-') else '') + ORDERING.get(order.lstrip('-'), 'updated_at'), '-id')


class AuditedCRUD:
    def perform_create(self, serializer):
        obj = serializer.save()
        audited(self, f'{obj.__class__.__name__.lower()}.created', obj, {'title': getattr(obj, 'title', str(obj))})

    def perform_update(self, serializer):
        obj = serializer.save()
        audited(self, f'{obj.__class__.__name__.lower()}.updated', obj)

    def perform_destroy(self, instance):
        audited(self, f'{instance.__class__.__name__.lower()}.deleted', instance, {'title': getattr(instance, 'title', str(instance))})
        instance.delete()


# ---------- products ----------
class ProductList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = Product
    serializer_class = ProductAdminSerializer

    def get_queryset(self):
        qs = Product.objects.select_related('category').prefetch_related('images', 'assets', 'related_products')
        p = self.request.query_params
        if p.get('type'):
            qs = qs.filter(product_type=p['type'])
        if p.get('category'):
            qs = qs.filter(category_id=p['category'])
        return content_list_filters(self.request, qs)


class ProductDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = Product
    serializer_class = ProductAdminSerializer
    queryset = Product.objects.select_related('category').prefetch_related('images', 'assets', 'related_products')

    def perform_destroy(self, instance):
        # order history keeps its snapshots (OrderItem.product is SET_NULL); files go with the product
        for a in instance.assets.all():
            a.file.delete(save=False)
        super().perform_destroy(instance)


class ProjectList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = Project
    serializer_class = ProjectAdminSerializer

    def get_queryset(self):
        qs = Project.objects.select_related('product').prefetch_related('related_projects', 'related_blogs', 'related_courses', 'assets')
        if self.request.query_params.get('difficulty'):
            qs = qs.filter(difficulty=self.request.query_params['difficulty'])
        return content_list_filters(self.request, qs)


class ProjectDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = Project
    serializer_class = ProjectAdminSerializer
    queryset = Project.objects.select_related('product').prefetch_related('related_projects', 'related_blogs', 'related_courses', 'assets')

    def perform_destroy(self, instance):
        for a in instance.assets.all():
            a.file.delete(save=False)
        super().perform_destroy(instance)


class ProjectQuestionList(Base, generics.ListAPIView):
    model_class = Project
    serializer_class = ProjectQuestionAdminSerializer

    def get_queryset(self):
        qs = ProjectQuestion.objects.select_related('project')
        status_filter = self.request.query_params.get('status')
        if status_filter == 'unanswered':
            qs = qs.filter(answer='')
        elif status_filter == 'answered':
            qs = qs.exclude(answer='')
        return qs.order_by('answered_at', '-created_at')


class ProjectQuestionDetail(Base, generics.RetrieveUpdateAPIView):
    model_class = Project
    serializer_class = ProjectQuestionAdminSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return ProjectQuestion.objects.select_related('project')

    def perform_update(self, serializer):
        question = serializer.save()
        audited(self, 'projectquestion.answered', question, {'project': question.project.title})


class GuideList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = ProjectGuide
    serializer_class = GuideAdminSerializer

    def get_queryset(self):
        qs = ProjectGuide.objects.select_related('project', 'product').prefetch_related('related_projects', 'related_blogs', 'included_courses', 'assets')
        if self.request.query_params.get('access'):
            qs = qs.filter(access_type=self.request.query_params['access'])
        return content_list_filters(self.request, qs)


class GuideDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = ProjectGuide
    serializer_class = GuideAdminSerializer
    queryset = ProjectGuide.objects.select_related('project', 'product').prefetch_related('related_projects', 'related_blogs', 'included_courses', 'assets')

    def perform_destroy(self, instance):
        for a in instance.assets.all():
            a.file.delete(save=False)
        super().perform_destroy(instance)


PREVIEW = {'Product': ('product', '/store'), 'Project': ('project', '/projects'), 'ProjectGuide': ('guide', '/project-guides')}


class ActionView(Base, APIView):
    perm_action = 'change'
    model_class = None
    serializer_class = None
    action = ''

    def post(self, request, pk):
        obj = get_object_or_404(self.model_class, pk=pk)
        kind, base = PREVIEW[self.model_class.__name__]
        if self.action == 'preview':
            token = content_services.make_preview_token(kind, obj.pk)
            return Response({'url': f'{base}/{obj.slug}?preview={token}', 'expires_in': content_services.PREVIEW_MAX_AGE})
        if self.action == 'publish':
            when = request.data.get('published_at')
            if when:
                try:
                    when = serializers.DateTimeField().to_internal_value(when)
                except serializers.ValidationError:
                    return Response({'published_at': ['Invalid date and time.']}, status=400)
            try:
                content_services.publish(obj, when or None)
            except DjangoValidationError as exc:
                return Response(exc.message_dict if hasattr(exc, 'error_dict') else {'detail': exc.messages}, status=400)
        elif self.action == 'unpublish':
            obj.status = 'draft'
            obj.save(update_fields=['status', 'updated_at'])
        elif self.action == 'archive':
            obj.status = 'archived'
            obj.save(update_fields=['status', 'updated_at'])
        audit.log(request.user, f'{kind}.{self.action}', obj, request=request)
        return Response(self.serializer_class(obj, context={'request': request}).data)


def action_view(model, serializer, action):
    return type(f'{model.__name__}{action.title()}', (ActionView,), {'model_class': model, 'serializer_class': serializer, 'action': action})


# ---------- private files ----------
class UploadThrottle(UserRateThrottle):
    scope = 'shop_upload'
    rate = '60/hour'


class AssetUpload(Base, APIView):
    """POST multipart {file, label} to /<products|projects|guides>/<id>/assets/. Validated by content, stored privately."""

    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UploadThrottle]
    perm_action = 'add'
    model_class = DigitalAsset
    owner_model = None
    owner_field = ''

    def post(self, request, pk):
        owner = get_object_or_404(self.owner_model, pk=pk)
        f = request.FILES.get('file')
        if not f:
            return Response({'detail': 'No file uploaded.'}, status=400)
        try:
            asset = downloads.create_asset({self.owner_field: owner}, f, request.data.get('label', ''), owner.assets.count())
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=400)
        audit.log(request.user, 'asset.uploaded', asset, {'owner': str(owner), 'name': asset.original_name, 'size': asset.size}, request)
        return Response({'id': asset.id, 'label': asset.label, 'size': asset.size, 'content_type': asset.content_type, 'original_name': asset.original_name}, status=201)


def asset_upload_view(owner_model, field):
    return type(f'{owner_model.__name__}AssetUpload', (AssetUpload,), {'owner_model': owner_model, 'owner_field': field})


class AssetDelete(Base, APIView):
    perm_action = 'delete'
    model_class = DigitalAsset

    def delete(self, request, pk):
        asset = get_object_or_404(DigitalAsset, pk=pk)
        audit.log(request.user, 'asset.deleted', asset, {'name': asset.original_name}, request)
        asset.file.delete(save=False)
        asset.delete()
        return Response(status=204)


# ---------- categories, coupons, settings ----------
class CategoryList(Base, generics.ListCreateAPIView):
    model_class = ProductCategory
    serializer_class = CategoryAdminSerializer
    pagination_class = None

    def get_queryset(self):
        return ProductCategory.objects.annotate(product_count=Count('products'))


class CategoryDetail(Base, generics.RetrieveUpdateDestroyAPIView):
    model_class = ProductCategory
    serializer_class = CategoryAdminSerializer
    queryset = ProductCategory.objects.all()


class CouponList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = Coupon
    serializer_class = CouponSerializer

    def get_queryset(self):
        qs = Coupon.objects.prefetch_related('eligible_products', 'eligible_categories')
        if q := self.request.query_params.get('q'):
            qs = qs.filter(code__icontains=q)
        return qs


class CouponDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = Coupon
    serializer_class = CouponSerializer
    queryset = Coupon.objects.prefetch_related('eligible_products', 'eligible_categories')


class SettingsView(Base, APIView):
    model_class = StoreSettings

    def get(self, request):
        return Response(StoreSettingsSerializer(StoreSettings.load()).data)

    def patch(self, request):
        s = StoreSettings.load()
        ser = StoreSettingsSerializer(s, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        audit.log(request.user, 'settings.updated', s, {'fields': list(request.data.keys())}, request)
        return Response(ser.data)


# ---------- orders ----------
class OrderList(Base, generics.ListAPIView):
    model_class = Order
    serializer_class = AdminOrderSerializer

    def get_queryset(self):
        qs = Order.objects.prefetch_related('items').select_related('user')
        p = self.request.query_params
        if v := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(number__icontains=v) | Q(email__icontains=v) | Q(name__icontains=v) | Q(phone__icontains=v))
        for key in ('status', 'payment_status', 'fulfilment_status'):
            if p.get(key):
                qs = qs.filter(**{key: p[key]})
        if p.get('product_type') == 'physical':
            qs = qs.filter(has_physical=True)
        elif p.get('product_type') == 'digital':
            qs = qs.filter(has_digital=True)
        if p.get('customer'):
            qs = qs.filter(user_id=p['customer'])
        for key, op in (('date_from', 'gte'), ('date_to', 'lte')):
            if p.get(key):
                try:
                    d = datetime.strptime(p[key], '%Y-%m-%d').date()
                except ValueError:
                    continue
                edge = datetime.combine(d, time.min if op == 'gte' else time.max)
                qs = qs.filter(**{f'created_at__{op}': timezone.make_aware(edge)})
        return qs.order_by('-created_at', '-id')


class OrderDetail(Base, generics.RetrieveUpdateAPIView):
    model_class = Order
    serializer_class = AdminOrderSerializer
    queryset = Order.objects.prefetch_related('items', 'refunds', 'payments').select_related('user')
    lookup_field = 'number'
    http_method_names = ['get', 'patch', 'head', 'options']

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        if 'admin_note' in request.data:  # the only free-text field an admin may edit; status changes go through the actions below
            order.admin_note = str(request.data['admin_note'])[:2000]
            order.save(update_fields=['admin_note', 'updated_at'])
            audit.log(request.user, 'order.note', order, request=request)
        return Response(self.get_serializer(order).data)


class OrderAction(Base, APIView):
    model_class = Order
    perm_action = 'change'
    action = ''

    def post(self, request, number):
        order = get_object_or_404(Order, number=number)
        try:
            if self.action == 'status':
                orders.set_status(order, str(request.data.get('status', '')), request.user, request, str(request.data.get('carrier', '')), str(request.data.get('tracking_number', '')))
            elif self.action == 'cancel':
                orders.cancel_order(order, request.user, request, str(request.data.get('reason', '')))
            elif self.action == 'refund':
                raw = request.data.get('amount')
                try:
                    amount = Decimal(str(raw)) if raw not in (None, '') else None
                except InvalidOperation:
                    return Response({'detail': 'Invalid amount.'}, status=400)
                orders.refund_order(order, amount, request.user, request, str(request.data.get('reason', '')))
                if request.data.get('restock') and order.has_physical:
                    _restock_physical(order, request.user)
        except CartError as exc:
            return Response({'detail': exc.message, 'code': exc.code}, status=400)
        except gateway.GatewayError as exc:
            return Response({'detail': str(exc)}, status=502)
        order.refresh_from_db()
        return Response(AdminOrderSerializer(order).data)


@transaction.atomic
def _restock_physical(order, user):
    ids = sorted(i.product_id for i in order.items.all() if i.product_id)
    locked = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=ids)}
    for item in order.items.all():
        p = locked.get(item.product_id)
        if p and p.tracks_stock and item.is_physical and not order.movements.filter(reason='return', note__startswith=f'item {item.id}').exists():
            inventory.move(p, item.quantity, 'return', order=order, note=f'item {item.id} returned', user=user)


def order_action_view(action):
    return type(f'Order{action.title()}', (OrderAction,), {'action': action})


# ---------- inventory ----------
class InventoryList(Base, generics.ListAPIView):
    model_class = Product
    perm_action = 'view'

    def list(self, request, *args, **kwargs):
        qs = Product.objects.filter(product_type__in=['physical', 'mixed'], track_stock=True)
        if v := request.query_params.get('q'):
            qs = qs.filter(Q(title__icontains=v) | Q(sku__icontains=v))
        if request.query_params.get('low') in ('1', 'true'):
            qs = qs.filter(stock_quantity__lte=F('low_stock_threshold'))
        page = self.paginate_queryset(qs.order_by('stock_quantity', 'title'))
        return self.get_paginated_response([{
            'id': p.id, 'title': p.title, 'sku': p.sku, 'stock': p.stock_quantity, 'threshold': p.low_stock_threshold,
            'status': 'out' if p.stock_quantity <= 0 else 'low' if p.stock_quantity <= p.low_stock_threshold else 'ok', 'published': p.status,
        } for p in page])


class InventoryAdjust(Base, APIView):
    model_class = Product
    perm_action = 'change'

    def post(self, request, pk):
        try:
            with transaction.atomic():
                p = get_object_or_404(Product.objects.select_for_update(), pk=pk)
                if not p.tracks_stock:
                    return Response({'detail': 'This product does not track stock.'}, status=400)
                if request.data.get('set_to') not in (None, ''):
                    delta = int(request.data['set_to']) - p.stock_quantity
                else:
                    delta = int(request.data.get('delta', 0))
                if delta == 0:
                    return Response({'detail': 'Nothing to change.'}, status=400)
                if p.stock_quantity + delta < 0:
                    return Response({'detail': 'Stock cannot go below zero.'}, status=400)
                reason = request.data.get('reason') if request.data.get('reason') in ('adjustment', 'restock', 'return') else 'adjustment'
                inventory.move(p, delta, reason, note=str(request.data.get('note', '')), user=request.user)
                audit.log(request.user, 'inventory.adjusted', p, {'delta': delta, 'note': str(request.data.get('note', ''))[:100]}, request)
        except (TypeError, ValueError):
            return Response({'detail': 'Enter whole numbers only.'}, status=400)
        return Response({'id': p.id, 'stock': p.stock_quantity})


class InventoryMovements(Base, generics.ListAPIView):
    model_class = Product
    perm_action = 'view'

    def list(self, request, pk, *args, **kwargs):
        rows = InventoryMovement.objects.filter(product_id=pk).select_related('order', 'created_by')[:100]
        return Response([{'delta': m.delta, 'balance_after': m.balance_after, 'reason': m.reason, 'order': m.order.number if m.order else None,
                          'note': m.note, 'by': m.created_by.username if m.created_by else None, 'created_at': m.created_at} for m in rows])


# ---------- customers, audit, stats ----------
class CustomerList(Base, generics.ListAPIView):
    model_class = Order
    perm_action = 'view'

    def list(self, request, *args, **kwargs):
        paid = Q(shop_orders__payment_status__in=['paid', 'partially_refunded'])
        qs = User.objects.filter(shop_orders__isnull=False).annotate(
            order_count=Count('shop_orders', distinct=True), paid_orders=Count('shop_orders', filter=paid, distinct=True),
            spent=Sum('shop_orders__total', filter=paid),
        )
        if v := request.query_params.get('q', '').strip()[:100]:
            qs = qs.filter(Q(username__icontains=v) | Q(email__icontains=v))
        page = self.paginate_queryset(qs.order_by('-order_count', 'id'))
        return self.get_paginated_response([{
            'id': u.id, 'username': u.username, 'email': u.email, 'phone': u.phone, 'joined': u.date_joined, 'orders': u.order_count,
            'paid_orders': u.paid_orders, 'spent': str(q(u.spent or 0)),
        } for u in page])


class AuditList(Base, generics.ListAPIView):
    model_class = AuditLog
    perm_action = 'view'

    def list(self, request, *args, **kwargs):
        qs = AuditLog.objects.select_related('actor')
        if v := request.query_params.get('action'):
            qs = qs.filter(action__startswith=v)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response([{
            'id': a.id, 'action': a.action, 'object': f'{a.object_type} {a.object_id}', 'actor': a.actor.username if a.actor else 'system',
            'detail': a.detail, 'created_at': a.created_at,
        } for a in page])


class ShopStats(Base, APIView):
    model_class = Product
    perm_action = 'view'

    def get(self, request):
        def counts(model):
            rows = dict(model.objects.values_list('status').annotate(n=Count('id')))
            return {'total': sum(rows.values()), 'published': model.objects.public().count(), 'draft': rows.get('draft', 0),
                    'scheduled': model.objects.filter(status='scheduled', published_at__gt=timezone.now()).count()}

        paid = Order.objects.filter(payment_status__in=['paid', 'partially_refunded'])
        sales = lambda **kw: paid.filter(**kw).aggregate(n=Count('id'), amount=Sum('total'))  # noqa: E731
        digital, physical = sales(has_digital=True), sales(has_physical=True)
        low = Product.objects.filter(product_type__in=['physical', 'mixed'], track_stock=True, stock_quantity__lte=F('low_stock_threshold'))
        return Response({
            'projects': counts(Project), 'guides': counts(ProjectGuide), 'products': counts(Product),
            'orders': {'total': Order.objects.exclude(status='expired').count(), 'pending': Order.objects.filter(status='pending_payment').count(), 'paid': paid.count()},
            'digital_sales': {'orders': digital['n'], 'amount': str(q(digital['amount'] or 0))},
            'physical_sales': {'orders': physical['n'], 'amount': str(q(physical['amount'] or 0))},
            'low_stock': [{'id': p.id, 'title': p.title, 'stock': p.stock_quantity} for p in low[:10]],
            'recent_orders': [{'number': o.number, 'name': o.name, 'total': str(o.total), 'status': o.status, 'payment_status': o.payment_status, 'created_at': o.created_at}
                              for o in Order.objects.exclude(status='expired').order_by('-created_at')[:8]],
            'payments_configured': gateway.configured(), 'payments_live': gateway.is_live(),
        })
