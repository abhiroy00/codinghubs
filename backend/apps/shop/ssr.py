"""Server-rendered HTML for /projects, /project-guides, /store (+ detail pages) and /sitemap-shop.xml. Same approach as the blog:
real HTML with metadata for crawlers, then the React app takes over. Locked guide / project content is never put in the HTML."""
from html import escape

from django.conf import settings
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, Q
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET

from apps.content.ssr import fmt_date, not_found, respond
from apps.content import services as content_services

from . import payloads
from .models import Product, ProductCategory, Project, ProjectGuide
from .views_public import load_published_or_preview

PAGE = 12
TITLES = {
    'store': ('Store: Notes, Books and Project Material | Coding Hubs', 'Study notes, books, project reports and source code from Coding Hubs School of AI, as instant downloads or printed copies.'),
    'projects': ('AI & Coding Projects for Students | Coding Hubs', 'Real project ideas with objectives, features, technology stack and learning outcomes, from the team at Coding Hubs School of AI.'),
    'guides': ('Project Guides: Step-by-Step Tutorials | Coding Hubs', 'Step-by-step project guides with setup, code, testing and deployment, from Coding Hubs School of AI.'),
}
BASES = {'store': ('/store', 'Store'), 'projects': ('/projects', 'Projects'), 'guides': ('/project-guides', 'Project Guides')}


def listing_seo(kind, page, extra_qs, indexable):
    base, label = BASES[kind]
    title, desc = TITLES[kind]
    if page > 1:
        title = f'{title.split(" | ")[0]}, page {page} | Coding Hubs'
    qs = extra_qs + (f'page={page}' if page > 1 else '')
    canonical = f'{settings.SITE_URL}{base}' + (f'?{qs}' if qs else '')
    return {
        'title': title, 'description': desc, 'canonical': canonical,
        'robots': 'index, follow, max-image-preview:large' if indexable else 'noindex, follow',
        'og': {'type': 'website', 'title': title, 'description': desc, 'image': content_services.LOGO_URL, 'url': canonical},
        'json_ld': {'@context': 'https://schema.org', '@graph': [
            {'@type': 'CollectionPage', '@id': f'{settings.SITE_URL}{base}#webpage', 'url': f'{settings.SITE_URL}{base}', 'name': title, 'description': desc, 'inLanguage': 'en-IN'},
        ]},
    }


def with_urls(cards, base):
    for c in cards:
        c['url'] = f'{base}/{c["slug"]}'
    return cards


def page_number(request, total_pages_hint=None):
    v = request.GET.get('page', '1')
    return int(v) if v.isdigit() and int(v) > 0 else 1


def paginate(qs, page):
    pg = Paginator(qs, PAGE)
    try:
        return pg.page(page), pg
    except EmptyPage:
        return pg.page(pg.num_pages), pg


@require_GET
def store_list(request):
    qs = payloads.public_products()
    cat, query = request.GET.get('category', ''), request.GET.get('q', '').strip()[:100]
    if cat:
        qs = qs.filter(category__slug=cat)
    if query:
        qs = qs.filter(title__icontains=query)
    pg, pager = paginate(qs.order_by('-published_at', '-id'), page_number(request))
    cards = with_urls([payloads.product_card(p) for p in pg.object_list], '/store')
    public = Product.objects.public().values('pk')
    cats = [{'name': c.name, 'slug': c.slug, 'count': c.n} for c in ProductCategory.objects.annotate(n=Count('products', filter=Q(products__pk__in=public))).filter(n__gt=0)]
    seo = listing_seo('store', pg.number, f'category={cat}&' if cat else '', indexable=not query)
    html = render_to_string('shop/store_list.html', {'items': cards, 'page': pg, 'cat': cat, 'cats': cats, 'query': query})
    return respond(seo, html, data={'kind': 'store-list', 'page': pg.number, 'category': cat, 'q': query, 'results': cards, 'count': pager.count, 'categories': cats})


@require_GET
def store_detail(request, slug):
    try:
        obj, preview = load_published_or_preview(Product, request, slug, payloads.public_products())
    except Http404:
        return not_found('Product not found')
    data = payloads.product_detail(obj, preview)
    html = render_to_string('shop/store_detail.html', {'a': data, 'preview': preview})
    return respond(data['seo'], html, preview=preview, data={'kind': 'product', 'slug': obj.slug, 'article': data})


@require_GET
def projects_list(request):
    qs = payloads.public_projects()
    cat, diff, query = request.GET.get('category', ''), request.GET.get('difficulty', ''), request.GET.get('q', '').strip()[:100]
    if cat:
        qs = qs.filter(category__iexact=cat)
    if diff:
        qs = qs.filter(difficulty=diff)
    if query:
        qs = qs.filter(title__icontains=query)
    pg, pager = paginate(qs.order_by('-published_at', '-id'), page_number(request))
    cards = with_urls([payloads.project_card(p) for p in pg.object_list], '/projects')
    seo = listing_seo('projects', pg.number, ''.join(f'{k}={v}&' for k, v in (('category', cat), ('difficulty', diff)) if v), indexable=not query)
    html = render_to_string('shop/project_list.html', {'items': cards, 'page': pg, 'query': query})
    all_pub = payloads.public_projects()
    return respond(seo, html, data={'kind': 'project-list', 'page': pg.number, 'category': cat, 'difficulty': diff, 'q': query, 'results': cards, 'count': pager.count,
                                    'categories': sorted(set(all_pub.exclude(category='').values_list('category', flat=True)))})


@require_GET
def project_detail(request, slug):
    try:
        obj, preview = load_published_or_preview(Project, request, slug, payloads.public_projects())
    except Http404:
        return not_found('Project not found')
    # the HTML is the same for everyone (public data only); the browser app re-fetches the per-user view
    data = payloads.project_detail(obj, None, preview)
    html = render_to_string('shop/project_detail.html', {'a': data, 'preview': preview})
    return respond(data['seo'], html, preview=preview, data={'kind': 'project', 'slug': obj.slug, 'article': data})


@require_GET
def guides_list(request):
    qs = payloads.public_guides()
    cat, query = request.GET.get('category', ''), request.GET.get('q', '').strip()[:100]
    if cat:
        qs = qs.filter(category__iexact=cat)
    if query:
        qs = qs.filter(title__icontains=query)
    pg, pager = paginate(qs.order_by('-published_at', '-id'), page_number(request))
    cards = with_urls([payloads.guide_card(g) for g in pg.object_list], '/project-guides')
    seo = listing_seo('guides', pg.number, f'category={cat}&' if cat else '', indexable=not query)
    html = render_to_string('shop/guide_list.html', {'items': cards, 'page': pg, 'query': query})
    return respond(seo, html, data={'kind': 'guide-list', 'page': pg.number, 'category': cat, 'q': query, 'results': cards, 'count': pager.count,
                                    'categories': sorted(set(payloads.public_guides().exclude(category='').values_list('category', flat=True)))})


@require_GET
def guide_detail(request, slug):
    try:
        obj, preview = load_published_or_preview(ProjectGuide, request, slug, payloads.public_guides())
    except Http404:
        return not_found('Guide not found')
    data = payloads.guide_detail(obj, None, preview)  # anonymous view: locked sections are empty, so nothing paid reaches the HTML
    html = render_to_string('shop/guide_detail.html', {'a': data, 'date': fmt_date(obj.published_at), 'preview': preview})
    return respond(data['seo'], html, preview=preview, data={'kind': 'guide', 'slug': obj.slug, 'article': data})


@require_GET
def shop_sitemap(request):
    rows = [f'{settings.SITE_URL}{b}' for b in ('/store', '/projects', '/project-guides')]
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in rows:
        out.append(f'  <url><loc>{escape(u)}</loc></url>')
    for qs, base in ((payloads.public_products(), '/store'), (payloads.public_projects(), '/projects'), (payloads.public_guides(), '/project-guides')):
        for slug, mod in qs.values_list('slug', 'updated_at'):
            out.append(f'  <url><loc>{escape(settings.SITE_URL + base + "/" + slug)}</loc><lastmod>{mod.date().isoformat()}</lastmod></url>')
    out.append('</urlset>')
    r = HttpResponse('\n'.join(out) + '\n', content_type='application/xml; charset=utf-8')
    r['Cache-Control'] = 'public, max-age=0, must-revalidate'
    return r
