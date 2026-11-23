from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, permissions, serializers
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from apps.content import services as content_services
from . import audit, downloads
from .models import (
    DigitalAsset, Project, ProjectGuide,
)
from .serializers import (
    GuideAdminSerializer, ProjectAdminSerializer,
)


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


ORDERING = {'date': 'published_at', 'updated': 'updated_at', 'title': 'title', 'status': 'status', 'created': 'created_at'}


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


class ProjectList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = Project
    serializer_class = ProjectAdminSerializer

    def get_queryset(self):
        qs = Project.objects.prefetch_related('related_projects', 'related_blogs', 'related_courses', 'assets')
        if self.request.query_params.get('difficulty'):
            qs = qs.filter(difficulty=self.request.query_params['difficulty'])
        return content_list_filters(self.request, qs)


class ProjectDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = Project
    serializer_class = ProjectAdminSerializer
    queryset = Project.objects.prefetch_related('related_projects', 'related_blogs', 'related_courses', 'assets')

    def perform_destroy(self, instance):
        for a in instance.assets.all():
            a.file.delete(save=False)
        super().perform_destroy(instance)


class GuideList(Base, AuditedCRUD, generics.ListCreateAPIView):
    model_class = ProjectGuide
    serializer_class = GuideAdminSerializer

    def get_queryset(self):
        qs = ProjectGuide.objects.select_related('project').prefetch_related('related_projects', 'related_blogs', 'included_courses', 'assets')
        if self.request.query_params.get('access'):
            qs = qs.filter(access_type=self.request.query_params['access'])
        return content_list_filters(self.request, qs)


class GuideDetail(Base, AuditedCRUD, generics.RetrieveUpdateDestroyAPIView):
    model_class = ProjectGuide
    serializer_class = GuideAdminSerializer
    queryset = ProjectGuide.objects.select_related('project').prefetch_related('related_projects', 'related_blogs', 'included_courses', 'assets')

    def perform_destroy(self, instance):
        for a in instance.assets.all():
            a.file.delete(save=False)
        super().perform_destroy(instance)


PREVIEW = {'Project': ('project', '/projects'), 'ProjectGuide': ('guide', '/project-guides')}


class ActionView(Base, APIView):
    perm_action = 'change'
    model_class = None
    serializer_class = None
    action = ''

    def post(self, request, pk):
        obj = get_object_or_404(self.model_class, pk=pk)
        kind, base = PREVIEW[self.model_class.__name__]
        if self.action == 'preview':
            if self.model_class.objects.public().filter(pk=obj.pk).exists():
                return Response({'url': f'{settings.SITE_URL}{base}/{obj.slug}', 'live': True})
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


class UploadThrottle(UserRateThrottle):
    scope = 'shop_upload'
    rate = '60/hour'


class AssetUpload(Base, APIView):
    """POST multipart {file, label} to /<projects|guides>/<id>/assets/. Validated by content, stored privately."""

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
