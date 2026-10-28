import logging
import os
import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db.models import Count, Q
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import generics, permissions, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from . import services
from .models import Blog, BlogCategory, BlogTag, CaseStudy, ContentRevision
from .serializers import (
    BlogAdminSerializer,
    BlogCardSerializer,
    CaseCardSerializer,
    CaseStudyAdminSerializer,
    CategorySerializer,
    TagSerializer,
    public_client,
)

logger = logging.getLogger(__name__)


class PublicPage(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 24


class AdminPage(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff and request.user.is_active)


class ContentPermission(IsStaff):
    """Staff only, and the matching Django model permission (superusers have all). A staff account without the
    'delete' permission cannot delete; without 'change' it cannot edit or publish."""

    PERM_FOR = {'GET': None, 'HEAD': None, 'OPTIONS': None, 'POST': 'add', 'PUT': 'change', 'PATCH': 'change', 'DELETE': 'delete'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        action = getattr(view, 'perm_action', None) or self.PERM_FOR.get(request.method)
        if action is None:
            return True
        model = view.model_class
        return request.user.has_perm(f'content.{action}_{model._meta.model_name}')


def public_cache(response, seconds=60):
    response['Cache-Control'] = f'public, max-age={seconds}'
    return response


# ================= public API =================
def public_blog_qs():
    return Blog.objects.public().select_related('category').prefetch_related('tags')


def public_case_qs():
    return CaseStudy.objects.public()


class PublicBlogList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = BlogCardSerializer
    pagination_class = PublicPage

    def get_queryset(self):
        qs = public_blog_qs()
        p = self.request.query_params
        if q := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=q) | Q(excerpt__icontains=q) | Q(tags__name__icontains=q)).distinct()
        if c := p.get('category'):
            qs = qs.filter(category__slug=c)
        if t := p.get('tag'):
            qs = qs.filter(tags__slug=t)
        if p.get('featured') in ('1', 'true'):
            qs = qs.filter(is_featured=True)
        return qs.order_by('-published_at')

    def list(self, request, *args, **kwargs):
        return public_cache(super().list(request, *args, **kwargs))


def body_payload(html):
    body, toc = services.render_body(html)
    return body, toc


class PublicBlogDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        obj, preview = load_public_or_preview(Blog, request, slug, public_blog_qs())
        if isinstance(obj, str):  # renamed slug
            return HttpResponsePermanentRedirect(f'/api/blogs/{obj}/')
        return Response(blog_detail_payload(obj, preview)) if preview else public_cache(Response(blog_detail_payload(obj, False)))


def load_public_or_preview(model, request, slug, qs):
    """Returns (object, is_preview). Preview needs a valid, unexpired signed token for exactly this object."""
    token = (getattr(request, 'query_params', None) or request.GET).get('preview')
    if token:
        obj = model.objects.filter(slug=slug).first()
        if obj and services.check_preview_token(token, model.KIND, obj.pk):
            return obj, True
        raise Http404
    obj = qs.filter(slug=slug).first()
    if obj:
        return obj, False
    new = services.resolve_redirect(model.KIND, slug)
    if new and qs.filter(slug=new).exists():
        return new, False
    raise Http404


def blog_detail_payload(obj, preview=False):
    body, toc = body_payload(obj.content)
    related = obj.related.all() if preview else obj.related.filter(pk__in=public_blog_qs().values('pk'))
    related = list(related.select_related('category')[:3])
    if not related and obj.category_id:
        related = list(public_blog_qs().filter(category_id=obj.category_id).exclude(pk=obj.pk)[:3])
    data = BlogCardSerializer(obj).data | {
        'content_html': body,
        'toc': toc if len(toc) >= 3 else [],
        'author_title': obj.author_title,
        'updated_at': obj.updated_at,
        'faq': [{'q': f['q'], 'a': services.sanitize_html(f['a'])} for f in obj.faq if f.get('q') and f.get('a')],
        'related': BlogCardSerializer(related, many=True).data,
        'seo': services.seo_for(obj, 'blog', preview),
        'preview': preview,
    }
    return data


class PublicBlogCategories(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        public = Blog.objects.public().values('pk')
        return BlogCategory.objects.annotate(blog_count=Count('blogs', filter=Q(blogs__pk__in=public))).filter(blog_count__gt=0)

    def list(self, request, *args, **kwargs):
        return public_cache(super().list(request, *args, **kwargs))


class PublicBlogTags(PublicBlogCategories):
    serializer_class = TagSerializer

    def get_queryset(self):
        public = Blog.objects.public().values('pk')
        return BlogTag.objects.annotate(blog_count=Count('blogs', filter=Q(blogs__pk__in=public))).filter(blog_count__gt=0)


class PublicCaseList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CaseCardSerializer
    pagination_class = PublicPage

    def get_queryset(self):
        qs = public_case_qs()
        p = self.request.query_params
        if q := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=q) | Q(summary__icontains=q) | Q(industry__icontains=q))
        if i := p.get('industry'):
            qs = qs.filter(industry__iexact=i)
        if t := p.get('technology'):
            qs = qs.filter(technologies__icontains=t)
        return qs.order_by('-published_at')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data = dict(response.data) | {
            'industries': sorted(set(public_case_qs().exclude(industry='').values_list('industry', flat=True))),
            'technologies': sorted({t for ts in public_case_qs().values_list('technologies', flat=True) for t in ts}),
        }
        return public_cache(response)


SECTION_TITLES = (
    ('overview', 'Executive summary'),
    ('background', 'Client background'),
    ('challenge', 'Business challenge'),
    ('objectives', 'Business objectives'),
    ('solution', 'Solution architecture'),
    ('implementation', 'Implementation approach'),
    ('results', 'Results and business impact'),
    ('lessons', 'Lessons learned'),
)


def case_detail_payload(obj, preview=False):
    hidden = set(obj.hidden_sections or [])
    sections, toc = [], []
    for key, title in SECTION_TITLES:
        if key in hidden or not getattr(obj, key):
            continue
        body, _ = services.render_body(getattr(obj, key))
        sections.append({'key': key, 'title': title, 'html': body})
        toc.append({'id': key, 'text': title, 'level': 2})
    related_qs = obj.related.all() if preview else obj.related.filter(pk__in=public_case_qs().values('pk'))
    related = list(related_qs[:3]) or list(public_case_qs().filter(industry=obj.industry).exclude(pk=obj.pk)[:3] if obj.industry else [])
    return CaseCardSerializer(obj).data | {
        'sections': sections,
        'toc': toc,
        'duration': obj.duration,
        'technologies': [] if 'technologies' in hidden else obj.technologies,
        'metrics': [m for m in obj.metrics if m.get('label') and m.get('value')],
        'related_services': [] if 'services' in hidden else obj.related_services,
        'gallery': [] if 'gallery' in hidden else obj.gallery,
        'author_name': obj.author_name,
        'author_title': obj.author_title,
        'reading_time': obj.reading_time,
        'updated_at': obj.updated_at,
        'related': CaseCardSerializer(related, many=True).data,
        'seo': services.seo_for(obj, 'case', preview),
        'preview': preview,
    }


class PublicCaseDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        obj, preview = load_public_or_preview(CaseStudy, request, slug, public_case_qs())
        if isinstance(obj, str):
            return HttpResponsePermanentRedirect(f'/api/case-studies/{obj}/')
        return Response(case_detail_payload(obj, True)) if preview else public_cache(Response(case_detail_payload(obj, False)))


# ================= admin API =================
class AdminListMixin:
    pagination_class = AdminPage
    permission_classes = [ContentPermission]

    ORDERING = {'date': 'published_at', 'updated': 'updated_at', 'title': 'title', 'status': 'status', 'created': 'created_at'}

    def filter_common(self, qs):
        p = self.request.query_params
        if q := p.get('q', '').strip()[:100]:
            qs = qs.filter(Q(title__icontains=q) | Q(slug__icontains=q))
        if s := p.get('status'):
            qs = qs.filter(status=s)
        order = p.get('ordering', '-updated')
        field = self.ORDERING.get(order.lstrip('-'), 'updated_at')
        return qs.order_by(('-' if order.startswith('-') else '') + field, '-id')


class AdminBlogList(AdminListMixin, generics.ListCreateAPIView):
    model_class = Blog
    serializer_class = BlogAdminSerializer

    def get_queryset(self):
        qs = Blog.objects.select_related('category').prefetch_related('tags', 'related')
        if c := self.request.query_params.get('category'):
            qs = qs.filter(category_id=c)
        return self.filter_common(qs)


class AdminBlogDetail(generics.RetrieveUpdateDestroyAPIView):
    model_class = Blog
    permission_classes = [ContentPermission]
    serializer_class = BlogAdminSerializer
    queryset = Blog.objects.select_related('category').prefetch_related('tags', 'related')


class AdminCaseList(AdminListMixin, generics.ListCreateAPIView):
    model_class = CaseStudy
    serializer_class = CaseStudyAdminSerializer

    def get_queryset(self):
        qs = CaseStudy.objects.prefetch_related('related')
        if i := self.request.query_params.get('industry'):
            qs = qs.filter(industry__iexact=i)
        return self.filter_common(qs)


class AdminCaseDetail(generics.RetrieveUpdateDestroyAPIView):
    model_class = CaseStudy
    permission_classes = [ContentPermission]
    serializer_class = CaseStudyAdminSerializer
    queryset = CaseStudy.objects.prefetch_related('related')


class ActionView(APIView):
    """POST /<id>/publish|unpublish|archive|preview — changing state needs the 'change' permission."""

    permission_classes = [ContentPermission]
    perm_action = 'change'
    action = ''
    model_class = None
    serializer_class = None

    def post(self, request, pk):
        obj = get_object_or_404(self.model_class, pk=pk)
        kind = self.model_class.KIND
        if self.action == 'preview':
            token = services.make_preview_token(kind, obj.pk)
            return Response({'url': f'{services.BASE_PATH[kind]}/{obj.slug}?preview={token}', 'expires_in': services.PREVIEW_MAX_AGE})
        if self.action == 'publish':
            when = request.data.get('published_at')
            if when:
                s = serializers.DateTimeField()
                try:
                    when = s.to_internal_value(when)
                except serializers.ValidationError:
                    return Response({'published_at': ['Invalid date and time.']}, status=400)
            try:
                services.publish(obj, when or None)
            except Exception as exc:  # ValidationError from full_clean
                detail = getattr(exc, 'message_dict', None) or {'detail': [str(exc)]}
                return Response(detail, status=400)
        else:
            services.save_revision(obj, request.user)
            {'unpublish': services.unpublish, 'archive': services.archive}[self.action](obj)
        return Response(self.serializer_class(obj, context={'request': request}).data)


def action_view(model, serializer, action):
    return type(f'{model.__name__}{action.title()}', (ActionView,), {'model_class': model, 'serializer_class': serializer, 'action': action})


class RevisionList(APIView):
    permission_classes = [ContentPermission]
    model_class = None

    def get(self, request, pk):
        get_object_or_404(self.model_class, pk=pk)
        rows = ContentRevision.objects.filter(kind=self.model_class.KIND, object_id=pk)[:20]
        return Response([{'id': r.id, 'created_at': r.created_at, 'title': r.snapshot.get('title'), 'status': r.snapshot.get('status')} for r in rows])


class RevisionRestore(APIView):
    permission_classes = [ContentPermission]
    perm_action = 'change'
    model_class = None

    def post(self, request, pk, rev_id):
        obj = get_object_or_404(self.model_class, pk=pk)
        rev = get_object_or_404(ContentRevision, pk=rev_id, kind=self.model_class.KIND, object_id=pk)
        services.save_revision(obj, request.user)
        old_slug = obj.slug
        editable = {f.attname for f in obj._meta.concrete_fields} - services.SNAPSHOT_SKIP - {'status', 'published_at', 'slug'}
        for k, v in rev.snapshot.items():
            if k in editable:
                setattr(obj, k, v)
        obj.save()
        services.record_slug_change(obj, old_slug)
        return Response({'restored': rev.id})


class AdminCategoryList(generics.ListCreateAPIView):
    model_class = BlogCategory
    permission_classes = [ContentPermission]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return BlogCategory.objects.annotate(blog_count=Count('blogs'))


class AdminCategoryDetail(generics.RetrieveUpdateDestroyAPIView):
    model_class = BlogCategory
    permission_classes = [ContentPermission]
    serializer_class = CategorySerializer
    queryset = BlogCategory.objects.all()


class AdminTagList(generics.ListCreateAPIView):
    model_class = BlogTag
    permission_classes = [ContentPermission]
    serializer_class = TagSerializer
    pagination_class = None

    def get_queryset(self):
        return BlogTag.objects.annotate(blog_count=Count('blogs'))


class AdminTagDetail(generics.RetrieveUpdateDestroyAPIView):
    model_class = BlogTag
    permission_classes = [ContentPermission]
    serializer_class = TagSerializer
    queryset = BlogTag.objects.all()


class ContentStats(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        now = timezone.now()

        def counts(model):
            rows = dict(model.objects.values_list('status').annotate(n=Count('id')))
            return {
                'total': sum(rows.values()),
                'published': model.objects.public().count(),
                'draft': rows.get('draft', 0),
                'scheduled': model.objects.filter(status='scheduled', published_at__gt=now).count(),
                'archived': rows.get('archived', 0),
            }

        recent = []
        for model, label in ((Blog, 'blog'), (CaseStudy, 'case')):
            for o in model.objects.order_by('-updated_at')[:6]:
                recent.append({'id': o.id, 'kind': label, 'title': o.title, 'status': o.status, 'updated_at': o.updated_at})
        recent.sort(key=lambda r: r['updated_at'], reverse=True)
        return Response({'blogs': counts(Blog), 'case_studies': counts(CaseStudy), 'recent': recent[:8]})


# ================= media upload =================
MAX_UPLOAD = 5 * 1024 * 1024
FORMATS = {'JPEG': ('jpg', 'image/jpeg'), 'PNG': ('png', 'image/png'), 'WEBP': ('webp', 'image/webp'), 'GIF': ('gif', 'image/gif')}
MAX_PIXELS = 40_000_000


class UploadThrottle(UserRateThrottle):
    scope = 'content_upload'
    rate = '40/hour'


class MediaUpload(APIView):
    """Image upload for the editor. The file is decoded and re-encoded with Pillow (drops metadata and any payload hidden
    in the file), named with a random id (never the uploaded name) and stored below MEDIA_ROOT/uploads/."""

    permission_classes = [ContentPermission]
    perm_action = 'add'
    model_class = Blog
    throttle_classes = [UploadThrottle]

    def post(self, request):
        f = request.FILES.get('file')
        if not f:
            return Response({'detail': 'No file uploaded.'}, status=400)
        if f.size > MAX_UPLOAD:
            return Response({'detail': 'Image is larger than 5 MB.'}, status=413)
        try:
            img = Image.open(f)
            fmt = img.format
            if fmt not in FORMATS or img.width * img.height > MAX_PIXELS:
                raise ValueError
            img.load()
        except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError):
            return Response({'detail': 'Upload a JPEG, PNG, WebP or GIF image (max 5 MB).'}, status=400)
        ext, _ = FORMATS[fmt]
        out = BytesIO()
        if fmt == 'JPEG':
            img.convert('RGB').save(out, 'JPEG', quality=88, optimize=True)
        elif fmt == 'GIF':
            img.save(out, 'GIF')
        else:
            img.save(out, fmt)
        now = timezone.now()
        name = f'uploads/{now:%Y/%m}/{uuid.uuid4().hex}.{ext}'
        saved = default_storage.save(name, ContentFile(out.getvalue()))
        return Response({'url': f'{settings.MEDIA_URL}{saved}', 'width': img.width, 'height': img.height}, status=status.HTTP_201_CREATED)
