import re
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET
from .services import public_issue_html
from apps.content.ssr import respond
from apps.content.services import LOGO_URL
from django.utils.dateparse import parse_datetime
from apps.courses.brochures import Metadata, size_label
from apps.courses.models import CourseBrochure
from .models import Issue


def metadata(path, title, description):
    canonical = settings.SITE_URL + path
    return {'title': title, 'description': description, 'robots': 'index, follow, max-image-preview:large', 'canonical': canonical,
            'styles': ['/community.css'], 'og': {'type': 'website', 'title': title, 'description': description, 'url': canonical, 'image': LOGO_URL},
            'json_ld': {'@context': 'https://schema.org', '@type': 'WebPage', 'url': canonical, 'name': title, 'description': description}}


@require_GET
def newsletter(request):
    context = {'issues': Issue.objects.filter(published=True).order_by('-published_at')[:25]}
    seo = metadata('/newsletter/', 'Coding & Interview Newsletter | Coding Hubs', 'Coding tips, practical interview preparation, AI updates and course announcements from Coding Hubs. Confirm your subscription and read published issues.')
    seo['preload_images'] = hero_preloads('blog')
    return respond(seo, render_to_string('newsletter/list.html', context))


@require_GET
def issue(request, slug):
    obj = get_object_or_404(Issue, slug=slug, published=True)
    seo = metadata('/newsletter/issues/' + obj.slug + '/', obj.title[:50] + ' | Coding Hubs', obj.excerpt)
    html = render_to_string('newsletter/issue.html', {'issue': obj, 'safe_content': public_issue_html(obj.content)})
    return respond(seo, html)


@require_GET
def brochures(request):
    rows = CourseBrochure.objects.select_related('course').filter(is_published=True, course__is_active=True).exclude(storage_key='').order_by('course__order')
    seo = metadata('/brochures/', 'Course PDF Brochures | Coding Hubs School of AI', 'Download published Coding Hubs course PDF brochures for free, with course descriptions and file sizes. No signup is required to download a brochure.')
    seo['preload_images'] = hero_preloads('courses')
    data = Metadata(rows, many=True).data
    # Same values the React page renders (Brochures.tsx), and the list itself embedded for its first render, so the
    # page is not replaced by a loading state and a second request.
    cards = [{**row, 'heading': re.sub(r'\bAi\b', 'AI', row['title']), 'size_label': size_label(row['size']), 'updated': parse_datetime(row['updated_at'])} for row in data]
    return respond(seo, render_to_string('newsletter/brochures.html', {'brochures': cards}), data=data)


def hero_preloads(clip):
    # Same AVIF files the hero <picture> selects first (HeroVideo.tsx); type-gated so other browsers skip them.
    return [(f"/assets/hero/video/pages/{clip}-poster-768.avif", "(max-width: 767px)"), (f"/assets/hero/video/pages/{clip}-poster-1280.avif", "(min-width: 768px)")]
