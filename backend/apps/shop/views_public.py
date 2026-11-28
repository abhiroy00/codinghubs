from django.conf import settings
from django.db.models import Q
from django.http import Http404
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from apps.content import services as content_services
from . import downloads, payloads
from .models import (
    DigitalAsset, Project, ProjectGuide,
)
from .serializers import ProjectQuestionSubmissionSerializer


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


class ProjectQuestionAnonThrottle(AnonRateThrottle):
    scope = 'shop_project_question'
    rate = '5/hour'


class ProjectQuestionUserThrottle(UserRateThrottle):
    scope = 'shop_project_question_user'
    rate = '10/hour'


def load_published_or_preview(model, request, slug, qs):
    token = request.query_params.get('preview') if hasattr(request, 'query_params') else request.GET.get('preview')
    if token:
        obj = model.objects.filter(slug=slug).first()
        if obj and qs.filter(pk=obj.pk).exists():
            return obj, False  # already live: its preview is the public page (SSR drops the token with a redirect)
        kind = {'Project': 'project', 'ProjectGuide': 'guide'}[model.__name__]
        if obj and content_services.check_preview_token(token, kind, obj.pk):
            return obj, True
        raise Http404
    obj = qs.filter(slug=slug).first()
    if not obj:
        raise Http404
    return obj, False


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
        order = {'title': 'title', 'oldest': 'published_at', 'newest': '-published_at'}.get(p.get('ordering', 'newest'), '-published_at')
        page = self.paginate_queryset(qs.order_by(order, '-id'))
        gmap = payloads.guides_by_project([x.pk for x in page])
        resp = self.get_paginated_response([payloads.project_card(x, gmap.get(x.pk)) for x in page])
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


class ProjectQuestionCreate(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ProjectQuestionAnonThrottle, ProjectQuestionUserThrottle]

    def post(self, request, slug):
        project = payloads.public_projects().filter(slug=slug).first()
        if not project:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProjectQuestionSubmissionSerializer(data=request.data, context={'project': project})
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        return Response({'detail': 'Your question was submitted for review.', 'id': question.id}, status=status.HTTP_201_CREATED)


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
        resp.data = dict(resp.data) | {
            'categories': sorted(set(all_pub.exclude(category='').values_list('category', flat=True))),
            'indexable': any(payloads.guide_is_indexable(guide) for guide in page),
        }
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
            return no_cache(Response({'url': fn(request.user, asset), 'expires_in': settings.RESOURCE_DOWNLOAD_LINK_TTL}))
        except PermissionError:
            return Response({'detail': 'Please log in or contact Coding Hubs for access to this file.'}, status=status.HTTP_403_FORBIDDEN)


def serve_download(request, token):
    return downloads.serve(request, token)
