"""Public (and SSR) representations. Only published data; file URLs and gated content never appear here."""
from django.conf import settings
from django.db.models import Count, Q

from apps.content import services as content_services
from apps.content.sanitize import add_heading_ids, sanitize_html

from . import access
from .models import Product, ProductCategory, Project, ProjectGuide, StoreSettings


def public_products():
    return Product.objects.public().select_related('category').prefetch_related('images')


def public_projects():
    return Project.objects.public().select_related('product')


def public_guides():
    return ProjectGuide.objects.public().select_related('project', 'product')


def stock_label(p: Product) -> str:
    if not p.tracks_stock:
        return 'Instant digital delivery' if p.product_type == 'digital' else 'Available'
    if p.stock_quantity <= 0:
        return 'Out of stock'
    return f'Only {p.stock_quantity} left' if p.stock_quantity <= p.low_stock_threshold else 'In stock'


def product_card(p: Product) -> dict:
    img = next(iter(p.images.all()), None)
    return {
        'id': p.id, 'title': p.title, 'slug': p.slug, 'short_description': p.short_description, 'price': str(p.price),
        'original_price': str(p.original_price) if p.original_price and p.original_price > p.price else None, 'currency': p.currency,
        'product_type': p.product_type, 'item_kind': p.item_kind, 'format': p.format, 'author': p.author,
        'category': {'name': p.category.name, 'slug': p.category.slug} if p.category else None,
        'image': {'src': img.src, 'alt': img.alt} if img else None, 'in_stock': p.in_stock, 'stock_label': stock_label(p),
        'is_featured': p.is_featured, 'is_free': p.price <= 0, 'published_at': p.published_at,
    }


def product_detail(p: Product, preview=False) -> dict:
    body, toc = add_heading_ids(sanitize_html(p.description))
    cfg = StoreSettings.load()
    related = [r for r in p.related_products.all() if preview or Product.objects.public().filter(pk=r.pk).exists()][:4]
    guides = [g for g in p.guides.all() if ProjectGuide.objects.public().filter(pk=g.pk).exists()][:3]
    data = product_card(p) | {
        'description_html': body, 'toc': toc if len(toc) >= 3 else [], 'included_materials': p.included_materials,
        'publisher': p.publisher, 'isbn': p.isbn, 'language': p.language, 'edition': p.edition, 'publication_year': p.publication_year,
        'pages': p.pages, 'topics': p.topics, 'images': [{'src': i.src, 'alt': i.alt} for i in p.images.all()], 'sku': p.sku,
        'weight_grams': p.weight_grams, 'dimensions': p.dimensions, 'tracks_stock': p.tracks_stock, 'is_physical': p.is_physical, 'is_digital': p.is_digital,
        'files': [{'label': a.label, 'size': a.size, 'type': a.content_type} for a in p.assets.all()] if p.is_digital else [],
        'delivery': delivery_note(p, cfg), 'tax_note': tax_note(cfg), 'shipping_flat': str(cfg.shipping_flat) if p.is_physical else None,
        'free_shipping_over': str(cfg.free_shipping_over) if p.is_physical and cfg.free_shipping_over is not None else None,
        'related': [product_card(r) for r in related], 'guides': [guide_card(g) for g in guides],
        'seo': product_seo(p, preview), 'preview': preview,
    }
    return data


def delivery_note(p, cfg):
    parts = []
    if p.is_digital:
        parts.append('Digital files are available to download from your account (or the order link) as soon as payment is confirmed.')
    if p.is_physical:
        parts.append('Printed items are shipped to your address after payment; you receive tracking details by email.')
    return ' '.join(parts)


def tax_note(cfg):
    if cfg.tax_mode == StoreSettings.TAX_EXCLUSIVE:
        return 'Taxes are added at checkout.'
    if cfg.tax_mode == StoreSettings.TAX_INCLUSIVE:
        return 'Prices include applicable taxes.'
    return ''


def fill_description(desc: str, title: str, what: str) -> str:
    """Meta descriptions under ~70 characters are too thin to be useful in results; pad with factual context."""
    desc = (desc or '').strip()
    if len(desc) >= 70:
        return desc[:158]
    lead = f'{title}: {desc.rstrip(".")}. ' if desc else f'{title}. '
    return (lead + f'{what} from Coding Hubs School of AI, Netaji Subhash Place, Delhi.')[:158]


def product_seo(p: Product, preview=False) -> dict:
    url = f'{settings.SITE_URL}/store/{p.slug}'
    canonical = p.canonical_url or url
    title = p.seo_title or f'{p.title} | Coding Hubs Store'
    desc = p.meta_description or fill_description((p.short_description or content_services.plain_text(p.description))[:158], p.title, 'Study notes and learning material')
    image = next(iter(p.images.all()), None)
    img_url = content_services.absolute(p.og_image or (image.src if image else '')) or content_services.LOGO_URL
    availability = 'https://schema.org/InStock' if p.in_stock else 'https://schema.org/OutOfStock'
    product_node = {
        '@type': 'Product', '@id': f'{url}#product', 'name': p.title, 'description': desc, 'sku': p.sku, 'image': [img_url],
        'url': canonical,
        'offers': {'@type': 'Offer', 'url': canonical, 'price': str(p.price), 'priceCurrency': p.currency, 'availability': availability,
                   'seller': {'@id': content_services.ORG_ID, '@type': 'EducationalOrganization', 'name': 'Coding Hubs School of AI'}},
    }
    if p.author:
        product_node['author'] = {'@type': 'Person', 'name': p.author}
    graph = [product_node, content_services.breadcrumb_node([
        ('Home', f'{settings.SITE_URL}/'), ('Store', f'{settings.SITE_URL}/store'), (p.title[:110], canonical)])]
    return {
        'title': title, 'description': desc, 'canonical': canonical,
        'robots': 'noindex, nofollow' if preview else 'index, follow, max-image-preview:large',
        'og': {'type': 'product', 'title': p.og_title or p.seo_title or p.title, 'description': p.og_description or desc, 'image': img_url, 'url': canonical},
        'json_ld': {'@context': 'https://schema.org', '@graph': graph},
    }


# ---------- projects ----------
def project_card(p: Project) -> dict:
    return {
        'title': p.title, 'slug': p.slug, 'summary': p.summary, 'category': p.category, 'difficulty': p.difficulty, 'technologies': p.technologies,
        'featured_image': p.featured_image, 'featured_image_alt': p.featured_image_alt, 'estimated_time': p.estimated_time,
        'is_featured': p.is_featured, 'is_paid': p.is_paid, 'price': str(p.product.price) if p.is_paid else None,
        'currency': p.product.currency if p.is_paid else None, 'published_at': p.published_at,
    }


def project_detail(p: Project, user=None, preview=False) -> dict:
    def html(v):
        return sanitize_html(v)

    unlocked = preview or access.project_access(user, p)
    guides = [g for g in p.guides.all() if ProjectGuide.objects.public().filter(pk=g.pk).exists() or preview]
    return project_card(p) | {
        'overview_html': html(p.overview), 'problem_html': html(p.problem_statement), 'objectives_html': html(p.objectives),
        'features': p.features, 'requirements_html': html(p.system_requirements), 'prerequisites_html': html(p.prerequisites),
        'learning_outcomes': p.learning_outcomes, 'architecture_html': html(p.architecture), 'database_html': html(p.database_requirements),
        'setup_html': html(p.setup_overview), 'screenshots': p.screenshots, 'languages': p.languages, 'tools': p.tools,
        'demo_url': p.demo_url, 'repo_url': p.repo_url if p.repo_public else '', 'author_name': p.author_name, 'author_title': p.author_title,
        'product': {'slug': p.product.slug, 'title': p.product.title, 'price': str(p.product.price)} if p.product_id and Product.objects.public().filter(pk=p.product_id).exists() else None,
        'unlocked': unlocked,
        'files': [{'id': a.id, 'label': a.label, 'size': a.size, 'type': a.content_type} for a in p.assets.all()] if unlocked else [],
        'locked_files': 0 if unlocked else p.assets.count(),
        'guides': [guide_card(g) for g in guides[:6]],
        'questions': [
            {'id': q.id, 'name': q.name, 'question': q.question, 'answer': q.answer, 'answered_at': q.answered_at}
            for q in p.questions.filter(answer__gt='').order_by('-answered_at')[:50]
        ],
        'related_projects': [project_card(r) for r in p.related_projects.filter(pk__in=public_projects().values('pk'))[:3]],
        'related_blogs': [{'title': b.title, 'slug': b.slug} for b in p.related_blogs.public()[:3]],
        'related_courses': [{'name': c.name, 'slug': c.slug} for c in p.related_courses.filter(is_active=True)[:3]],
        'seo': simple_seo(p, 'project', '/projects', 'Projects', p.summary, preview), 'preview': preview,
    }


# ---------- guides ----------
def guide_card(g: ProjectGuide) -> dict:
    return {
        'title': g.title, 'slug': g.slug, 'summary': g.summary, 'category': g.category, 'difficulty': g.difficulty, 'technologies': g.technologies,
        'featured_image': g.featured_image, 'featured_image_alt': g.featured_image_alt, 'estimated_time': g.estimated_time,
        'access_type': g.access_type, 'is_featured': g.is_featured, 'reading_time': g.reading_time, 'published_at': g.published_at,
        'price': str(g.product.price) if g.product_id and g.access_type == 'paid' else None,
        'project': {'title': g.project.title, 'slug': g.project.slug} if g.project_id else None,
    }


def guide_detail(g: ProjectGuide, user=None, preview=False) -> dict:
    unlocked = preview or access.guide_access(user, g)
    sections, toc = [], []
    for s in g.sections:
        if not s.get('enabled') or not s.get('title'):
            continue
        show = unlocked or s.get('preview')
        body, _ = add_heading_ids(sanitize_html(s.get('html', ''))) if show else ('', [])
        sections.append({'key': s['key'], 'title': s['title'], 'html': body, 'locked': not show})
        toc.append({'id': s['key'], 'text': s['title'], 'level': 2})
    related_projects = [project_card(r) for r in g.related_projects.filter(pk__in=public_projects().values('pk'))[:3]]
    if g.project_id and Project.objects.public().filter(pk=g.project_id).exists() and not any(r['slug'] == g.project.slug for r in related_projects):
        related_projects.insert(0, project_card(g.project))
    return guide_card(g) | {
        'author_name': g.author_name, 'author_title': g.author_title, 'prerequisites_html': sanitize_html(g.prerequisites),
        'objectives': g.objectives, 'required_software': g.required_software, 'sections': sections, 'toc': toc,
        'faq': [{'q': f['q'], 'a': sanitize_html(f['a'])} for f in g.faq if f.get('q')] if unlocked else [],
        'resources': g.related_resources if unlocked else [], 'unlocked': unlocked, 'updated_at': g.updated_at,
        'files': [{'id': a.id, 'label': a.label, 'size': a.size, 'type': a.content_type} for a in g.assets.all()] if unlocked else [],
        'unlock': unlock_info(g), 'related_projects': related_projects[:3],
        'related_blogs': [{'title': b.title, 'slug': b.slug} for b in g.related_blogs.public()[:3]],
        'seo': simple_seo(g, 'guide', '/project-guides', 'Project Guides', g.summary, preview, free=(g.access_type == 'free')), 'preview': preview,
    }


def unlock_info(g: ProjectGuide):
    if g.access_type == ProjectGuide.ACCESS_FREE:
        return None
    if g.access_type == ProjectGuide.ACCESS_ACCOUNT:
        return {'type': 'account', 'message': 'Create a free account or log in to read the full guide.'}
    prod = g.product if g.product_id and Product.objects.public().filter(pk=g.product_id).exists() else None
    return {
        'type': g.access_type, 'product': {'slug': prod.slug, 'title': prod.title, 'price': str(prod.price)} if prod else None,
        'courses': [{'name': c.name, 'slug': c.slug} for c in g.included_courses.filter(is_active=True)],
        'message': 'This guide is part of a paid resource.' if g.access_type == 'paid' else 'This guide is included with a product or course enrolment.',
    }


def simple_seo(obj, kind, base, label, summary, preview=False, free=True) -> dict:
    url = f'{settings.SITE_URL}{base}/{obj.slug}'
    canonical = obj.canonical_url or url
    title = obj.seo_title or f'{obj.title} | Coding Hubs School of AI'
    desc = obj.meta_description or fill_description((summary or '')[:158], obj.title, 'A hands-on ' + ('project' if kind == 'project' else 'step-by-step guide'))
    image = content_services.absolute(obj.og_image or obj.featured_image) or content_services.LOGO_URL
    node = {
        '@type': 'Article', '@id': f'{canonical}#article', 'mainEntityOfPage': {'@type': 'WebPage', '@id': canonical}, 'headline': obj.title[:110],
        'description': desc, 'image': [image], 'inLanguage': 'en-IN', 'publisher': content_services.organization_ref(), 'isAccessibleForFree': free,
    }
    if obj.published_at:
        node['datePublished'] = obj.published_at.isoformat()
    node['dateModified'] = obj.updated_at.isoformat()
    node['author'] = {'@type': 'Person', 'name': obj.author_name} if obj.author_name else {'@id': content_services.ORG_ID, '@type': 'EducationalOrganization', 'name': 'Coding Hubs School of AI'}
    return {
        'title': title, 'description': desc, 'canonical': canonical,
        'robots': 'noindex, nofollow' if preview else 'index, follow, max-image-preview:large',
        'og': {'type': 'article', 'title': obj.og_title or obj.seo_title or obj.title, 'description': obj.og_description or desc, 'image': image, 'url': canonical},
        'json_ld': {'@context': 'https://schema.org', '@graph': [node, content_services.breadcrumb_node([
            ('Home', f'{settings.SITE_URL}/'), (label, f'{settings.SITE_URL}{base}'), (obj.title[:110], canonical)])]},
    }
