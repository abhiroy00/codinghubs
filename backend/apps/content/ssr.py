"""Server-rendered (crawler-ready) HTML for /blog, /blog/<slug>, /case-studies, /case-studies/<slug> and the content
sitemap. The built single-page app is a static bundle that knows nothing about database content, so these URLs are
answered here: we take the app's HTML shell (fetched from the frontend container, cached), fill in <head> metadata,
JSON-LD and the page content, and the React app then takes over in the browser (same as the prerendered pages)."""
import json
import re
import logging
import time
import urllib.request
from html import escape
from urllib.parse import urlencode

from django.conf import settings
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, Q
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.template.loader import render_to_string
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET

from . import services
from .robots import clean_canonical
from .models import Blog, CaseStudy
from .views import blog_detail_payload, case_detail_payload, load_public_or_preview, public_blog_qs, public_case_qs

logger = logging.getLogger(__name__)
HEAD_MARK, ROOT_MARK = '<!--SEO_HEAD-->', '<!--SSR_ROOT-->'
# The frontend build puts the real React header/footer in the shell (CHROME_* blocks, see frontend/scripts/prerender.mjs).
# They replace the template chrome (chrome:* spans, whose content is only a fallback) and are removed from the shell.
SHELL_CHROME = re.compile(r'<!--CHROME_(TOP|BOTTOM)-->(.*?)<!--/CHROME_\1-->', re.S)
PAGE_CHROME = re.compile(r'<!--chrome:(top|bottom)-->(.*?)<!--/chrome:\1-->', re.S)


def apply_chrome(shell, body_html):
    parts = {m.group(1).lower(): m.group(2) for m in SHELL_CHROME.finditer(shell)}
    body_html = PAGE_CHROME.sub(lambda m: parts.get(m.group(1), m.group(2)), body_html)
    return SHELL_CHROME.sub('', shell), body_html
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
    tags.extend(f'<link rel="stylesheet" href="{escape(url)}">' for url in seo.get('styles', []))
    tags.extend(f'<link rel="preload" as="image" type="{"image/avif" if url.endswith(".avif") else "image/webp"}" href="{escape(url)}" media="{escape(media)}" fetchpriority="high">' for url, media in seo.get('preload_images', []))
    if seo['robots'].startswith('index'):
        tags.append(f'<link rel="canonical" href="{escape(clean_canonical(seo["canonical"]))}">')
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
    if og and with_og:
        image_alt = 'Coding Hubs School of AI logo' if og['image'] == services.LOGO_URL else og['title']
        tags += [f'<meta property="og:image:alt" content="{escape(image_alt)}">', f'<meta name="twitter:image:alt" content="{escape(image_alt)}">']
        if og['image'] == services.LOGO_URL:
            tags += ['<meta property="og:image:width" content="1254">', '<meta property="og:image:height" content="1254">']
    if seo.get('json_ld'):
        tags.append('<script type="application/ld+json">' + json.dumps(seo['json_ld']).replace('<', '\\u003c') + '</script>')
    return '\n    '.join(tags)


def respond(seo, body_html, status=200, preview=False, data=None):
    shell, body_html = apply_chrome(get_shell(), body_html)
    shell = shell.replace(HEAD_MARK, head_tags(seo)).replace(ROOT_MARK, body_html)
    if data is not None:  # first-paint data for the React page (no second fetch / no flash)
        payload = json.dumps(data, default=str).replace('<', '\\u003c')
        shell = shell.replace('</body>', f'<script id="__CONTENT__" type="application/json">{payload}</script></body>', 1)
    r = HttpResponse(shell, status=status, content_type='text/html; charset=utf-8')
    r['Cache-Control'] = 'no-store' if preview or status != 200 else 'public, max-age=0, must-revalidate'
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


def listing_seo(kind, page, filters, indexable, topic=''):
    """`filters` is an ordered list of (key, value) pairs kept in the canonical; page 1 never carries `page=`."""
    path = '/blog' if kind == 'blog' else '/case-studies'
    suffix = '' if page == 1 else f', page {page}'
    if kind == 'blog':
        if topic:
            title = f'{topic} Articles{suffix} | Coding Hubs Blog'
            desc = f'{topic} guides, tutorials and career advice from Coding Hubs School of AI, Delhi.'
        else:
            title = f'AI & Coding Blog{suffix} | Coding Hubs School of AI'
            desc = 'Guides, tutorials and career advice on AI, programming and data from the team at Coding Hubs School of AI, Delhi.'
    else:
        title = f'Case Studies{suffix} | Coding Hubs School of AI'
        desc = 'Real learning and project stories from Coding Hubs School of AI, with only the details the people involved have verified.'
    params = [(k, v) for k, v in filters if v] + ([('page', page)] if page > 1 else [])
    canonical = f'{settings.SITE_URL}{path}' + (f'?{urlencode(params)}' if params else '')
    return {
        'title': title, 'description': desc, 'robots': 'index, follow, max-image-preview:large' if indexable else 'noindex, follow',
        'canonical': canonical,
        'og': {'type': 'website', 'title': title, 'description': desc, 'image': services.LOGO_URL, 'url': canonical},
        'json_ld': {
            '@context': 'https://schema.org',
            '@graph': [
                {'@type': 'CollectionPage', '@id': f'{canonical}#webpage', 'url': canonical, 'name': title, 'description': desc, 'inLanguage': 'en-IN', 'isPartOf': {'@id': f'{settings.SITE_URL}/#website'}},
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
    from .models import BlogCategory

    topic = ''
    if cat:
        category = BlogCategory.objects.filter(slug=cat).first()
        if category is None:
            return not_found('Category not found')
        topic = category.name
        qs = qs.filter(category=category)
    if query:
        qs = qs.filter(title__icontains=query)
    paginator = Paginator(qs.order_by('-published_at', '-created_at', '-id'), 9)
    try:
        pg = paginator.page(page)
    except EmptyPage:
        if query:  # a search past its last page still shows the last results; it is noindex anyway
            pg = paginator.page(paginator.num_pages)
            page = pg.number
        else:  # a listing page that does not exist is a real 404, not a copy of the last page
            return not_found('Page not found')
    from .serializers import BlogCardSerializer

    items = BlogCardSerializer(pg.object_list, many=True).data
    seo = listing_seo('blog', page, [('category', cat)], indexable=not query and paginator.count > 0, topic=topic)
    public = Blog.objects.public().values('pk')
    cats = [{'name': c.name, 'slug': c.slug, 'blog_count': c.n} for c in BlogCategory.objects.annotate(n=Count('blogs', filter=Q(blogs__pk__in=public))).filter(n__gt=0).order_by('name')]
    html = render_to_string('content/blog_list.html', {'items': card_ctx(items, '/blog'), 'page': pg, 'cat': cat, 'topic': topic, 'categories': cats, 'query': query})
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
    if not preview and 'preview' in request.GET:  # a preview link to a live item: send people and crawlers to the clean URL
        return HttpResponsePermanentRedirect(f'/blog/{obj.slug}')
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
    paginator = Paginator(qs.order_by('-published_at', '-created_at', '-id'), 9)
    try:
        pg = paginator.page(page)
    except EmptyPage:
        if query:
            pg = paginator.page(paginator.num_pages)
            page = pg.number
        else:
            return not_found('Page not found')
    from .serializers import CaseCardSerializer

    items = CaseCardSerializer(pg.object_list, many=True).data
    seo = listing_seo('case', page, [('industry', industry)], indexable=not query and paginator.count > 0)
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
    if not preview and 'preview' in request.GET:  # a preview link to a live item: send people and crawlers to the clean URL
        return HttpResponsePermanentRedirect(f'/case-studies/{obj.slug}')
    data = case_detail_payload(obj, preview)
    html = render_to_string('content/case_detail.html', {'a': data, 'date': fmt_date(obj.published_at), 'preview': preview})
    return respond(data['seo'], html, preview=preview, data={'kind': 'case', 'slug': obj.slug, 'article': data})


@require_GET
def content_sitemap(request):
    rows = [(f'{settings.SITE_URL}/newsletter/', None), (f'{settings.SITE_URL}/brochures/', None)]
    # A listing with nothing published is served noindex (listing_seo), so it stays out of the sitemap until it has items.
    rows += [(f'{settings.SITE_URL}{path}', None) for path, qs in (('/blog', public_blog_qs()), ('/case-studies', public_case_qs())) if qs.exists()]
    from apps.newsletter.models import Issue
    rows += [(f'{settings.SITE_URL}/newsletter/issues/{slug}/', modified) for slug, modified in Issue.objects.filter(published=True).values_list('slug', 'updated_at')]
    rows += list(services.canonical_sitemap_rows(public_blog_qs(), '/blog'))
    rows += list(services.canonical_sitemap_rows(public_case_qs(), '/case-studies'))
    from apps.courses.pages import sitemap_rows as course_rows
    rows += course_rows()  # courses created in the admin panel (the prerendered ones are in sitemap.xml)
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in rows:
        out.append(f'  <url><loc>{escape(loc)}</loc>' + (f'<lastmod>{mod.date().isoformat()}</lastmod>' if mod else '') + '</url>')
    out.append('</urlset>')
    r = HttpResponse('\n'.join(out) + '\n', content_type='application/xml; charset=utf-8')
    r['Cache-Control'] = 'public, max-age=0, must-revalidate'
    return r
