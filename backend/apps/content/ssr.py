"""Server-rendered (crawler-ready) HTML for /blog, /blog/<slug>, /case-studies, /case-studies/<slug> and the content
sitemap. The built single-page app is a static bundle that knows nothing about database content, so these URLs are
answered here: we take the app's HTML shell (fetched from the frontend container, cached), fill in <head> metadata,
JSON-LD and the page content, and the React app then takes over in the browser (same as the prerendered pages)."""
import json
import logging
import time
import urllib.request
from html import escape

from django.conf import settings
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, Q
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.template.loader import render_to_string
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET

from . import services
from .models import Blog, CaseStudy
from .views import SECTION_TITLES, blog_detail_payload, case_detail_payload, load_public_or_preview, public_blog_qs, public_case_qs

logger = logging.getLogger(__name__)
HEAD_MARK, ROOT_MARK = '<!--SEO_HEAD-->', '<!--SSR_ROOT-->'
_shell = {'html': None, 'at': 0.0}

FALLBACK_SHELL = (
    '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    f'{HEAD_MARK}</head><body><div id="root">{ROOT_MARK}</div></body></html>'
)


def get_shell() -> str:
    now = time.time()
    if _shell['html'] and now - _shell["at"] < 60:
        return _shell['html']
    url = settings.FRONTEND_SHELL_URL
    if url:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:  # noqa: S310 - internal URL from settings
                html = r.read().decode('utf-8')
            if HEAD_MARK in html and ROOT_MARK in html:
                _shell.update(html=html, at=now)
                return html
        except Exception:  # noqa: BLE001
            logger.warning('Could not fetch the frontend shell from %s; using the minimal fallback.', url)
    return _shell['html'] or FALLBACK_SHELL


def head_tags(seo: dict, with_og=True) -> str:
    tags = [
        f'<title>{escape(seo["title"])}</title>',
        f'<meta name="description" content="{escape(seo["description"])}">',
        f'<meta name="robots" content="{seo["robots"]}">',
    ]
    if seo['robots'].startswith('index'):
        tags.append(f'<link rel="canonical" href="{escape(seo["canonical"])}">')
    og = seo.get('og')
    if og and with_og:
        tags += [
            '<meta property="og:site_name" content="Coding Hubs School of AI">',
            '<meta property="og:locale" content="en_IN">',
            f'<meta property="og:type" content="{og["type"]}">',
            f'<meta property="og:title" content="{escape(og["title"])}">',
            f'<meta property="og:description" content="{escape(og["description"])}">',
            f'<meta property="og:url" content="{escape(og["url"])}">',
            f'<meta property="og:image" content="{escape(og["image"])}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{escape(og["title"])}">',
            f'<meta name="twitter:description" content="{escape(og["description"])}">',
            f'<meta name="twitter:image" content="{escape(og["image"])}">',
        ]
    if seo.get('json_ld'):
        tags.append('<script type="application/ld+json">' + json.dumps(seo['json_ld']).replace('<', '\\u003c') + '</script>')
    return '\n    '.join(tags)


def respond(seo, body_html, status=200, preview=False, data=None):
    shell = get_shell().replace(HEAD_MARK, head_tags(seo)).replace(ROOT_MARK, body_html)
    if data is not None:  # first-paint data for the React page (no second fetch / no flash)
        payload = json.dumps(data, default=str).replace('<', '\\u003c')
        shell = shell.replace('</body>', f'<script id="__CONTENT__" type="application/json">{payload}</script></body>', 1)
    r = HttpResponse(shell, status=status, content_type='text/html; charset=utf-8')
    r['Cache-Control'] = 'no-store' if preview or status != 200 else 'public, max-age=60'
    if preview or status != 200:
        r['X-Robots-Tag'] = 'noindex, nofollow'
    return r


def not_found(label='Page not found'):
    seo = {'title': 'Page not found | Coding Hubs School of AI', 'description': 'This page does not exist.', 'robots': 'noindex, follow', 'canonical': ''}
    html = render_to_string('content/not_found.html', {'label': label})
    return respond(seo, html, status=404)


def fmt_date(d):
    if isinstance(d, str):
        d = parse_datetime(d)
    return d.strftime('%d %b %Y').lstrip('0') if d else ''


def card_ctx(items, base):
    return [{**i, 'url': f'{base}/{i["slug"]}', 'date': fmt_date(i.get('published_at'))} for i in items]


def listing_seo(kind, page, extra_qs, indexable):
    label, path = ('Blog', '/blog') if kind == 'blog' else ('Case Studies', '/case-studies')
    if kind == 'blog':
        title = 'AI & Coding Blog | Coding Hubs School of AI' if page == 1 else f'AI & Coding Blog, page {page} | Coding Hubs School of AI'
        desc = 'Guides, tutorials and career advice on AI, programming and data from the team at Coding Hubs School of AI, Delhi.'
    else:
        title = 'Case Studies | Coding Hubs School of AI'
        desc = 'Real learning and project stories from Coding Hubs School of AI, with only the details the people involved have verified.'
    qs = extra_qs + (f'page={page}' if page > 1 else '')
    canonical = f'{settings.SITE_URL}{path}' + (f'?{qs}' if qs else '')
    return {
        'title': title, 'description': desc, 'robots': 'index, follow, max-image-preview:large' if indexable else 'noindex, follow',
        'canonical': canonical,
        'og': {'type': 'website', 'title': title, 'description': desc, 'image': services.LOGO_URL, 'url': canonical},
        'json_ld': {
            '@context': 'https://schema.org',
            '@graph': [
                {'@type': 'CollectionPage', '@id': f'{settings.SITE_URL}{path}#webpage', 'url': f'{settings.SITE_URL}{path}', 'name': title, 'description': desc, 'inLanguage': 'en-IN', 'isPartOf': {'@id': f'{settings.SITE_URL}/#website'}},
                {'@type': 'BreadcrumbList', 'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': f'{settings.SITE_URL}/'},
                    {'@type': 'ListItem', 'position': 2, 'name': label, 'item': f'{settings.SITE_URL}{path}'},
                ]},
            ],
        },
    }


@require_GET
def blog_list(request):
    p = request.GET
    page = max(1, int(p.get('page', 1) or 1)) if str(p.get('page', '1')).isdigit() else 1
    qs = public_blog_qs()
    cat = p.get('category', '')
    query = p.get('q', '').strip()[:100]
    if cat:
        qs = qs.filter(category__slug=cat)
    if query:
        qs = qs.filter(title__icontains=query)
    paginator = Paginator(qs.order_by('-published_at'), 9)
    try:
        pg = paginator.page(page)
    except EmptyPage:
        pg = paginator.page(paginator.num_pages)
        page = pg.number
    from .serializers import BlogCardSerializer

    items = BlogCardSerializer(pg.object_list, many=True).data
    extra = f'category={cat}&' if cat else ''
    seo = listing_seo('blog', page, extra, indexable=not query)
    html = render_to_string('content/blog_list.html', {'items': card_ctx(items, '/blog'), 'page': pg, 'cat': cat, 'query': query})
    from .models import BlogCategory

    public = Blog.objects.public().values('pk')
    cats = [{'name': c.name, 'slug': c.slug, 'blog_count': c.n} for c in BlogCategory.objects.annotate(n=Count('blogs', filter=Q(blogs__pk__in=public))).filter(n__gt=0)]
    data = {'kind': 'blog-list', 'page': page, 'category': cat, 'q': query, 'results': items, 'count': paginator.count, 'categories': cats}
    return respond(seo, html, data=data)


@require_GET
def blog_detail(request, slug):
    try:
        obj, preview = load_public_or_preview(Blog, request, slug, public_blog_qs())
    except Http404:
        return not_found('Article not found')
    if isinstance(obj, str):
        return HttpResponsePermanentRedirect(f'/blog/{obj}')
    data = blog_detail_payload(obj, preview)
    seo = data['seo']
    html = render_to_string('content/blog_detail.html', {'a': data, 'date': fmt_date(obj.published_at), 'preview': preview})
    return respond(seo, html, preview=preview, data={'kind': 'blog', 'slug': obj.slug, 'article': data})


@require_GET
def case_list(request):
    p = request.GET
    page = int(p['page']) if str(p.get('page', '')).isdigit() and int(p['page']) > 0 else 1
    qs = public_case_qs()
    industry = p.get('industry', '')
    query = p.get('q', '').strip()[:100]
    if industry:
        qs = qs.filter(industry__iexact=industry)
    if query:
        qs = qs.filter(title__icontains=query)
    paginator = Paginator(qs.order_by('-published_at'), 9)
    try:
        pg = paginator.page(page)
    except EmptyPage:
        pg = paginator.page(paginator.num_pages)
        page = pg.number
    from .serializers import CaseCardSerializer

    items = CaseCardSerializer(pg.object_list, many=True).data
    extra = f'industry={industry}&' if industry else ''
    seo = listing_seo('case', page, extra, indexable=not query)
    html = render_to_string('content/case_list.html', {'items': card_ctx(items, '/case-studies'), 'page': pg, 'query': query})
    industries = sorted(set(public_case_qs().exclude(industry='').values_list('industry', flat=True)))
    data = {'kind': 'case-list', 'page': page, 'industry': industry, 'q': query, 'results': items, 'count': paginator.count, 'industries': industries}
    return respond(seo, html, data=data)


@require_GET
def case_detail(request, slug):
    try:
        obj, preview = load_public_or_preview(CaseStudy, request, slug, public_case_qs())
    except Http404:
        return not_found('Case study not found')
    if isinstance(obj, str):
        return HttpResponsePermanentRedirect(f'/case-studies/{obj}')
    data = case_detail_payload(obj, preview)
    html = render_to_string('content/case_detail.html', {'a': data, 'date': fmt_date(obj.published_at), 'preview': preview})
    return respond(data['seo'], html, preview=preview, data={'kind': 'case', 'slug': obj.slug, 'article': data})


@require_GET
def content_sitemap(request):
    rows = [(f'{settings.SITE_URL}/blog', None), (f'{settings.SITE_URL}/case-studies', None)]
    rows += [(f'{settings.SITE_URL}/blog/{s}', u) for s, u in public_blog_qs().values_list('slug', 'updated_at')]
    rows += [(f'{settings.SITE_URL}/case-studies/{s}', u) for s, u in public_case_qs().values_list('slug', 'updated_at')]
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in rows:
        out.append(f'  <url><loc>{escape(loc)}</loc>' + (f'<lastmod>{mod.date().isoformat()}</lastmod>' if mod else '') + '</url>')
    out.append('</urlset>')
    r = HttpResponse('\n'.join(out) + '\n', content_type='application/xml; charset=utf-8')
    r['Cache-Control'] = 'public, max-age=300'
    return r
