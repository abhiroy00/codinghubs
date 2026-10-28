"""Publishing workflow, slugs, revisions, preview tokens and SEO metadata for blogs and case studies."""
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone

from .models import (
    STATUS_ARCHIVED,
    STATUS_DRAFT,
    STATUS_PUBLISHED,
    STATUS_SCHEDULED,
    Blog,
    CaseStudy,
    ContentRevision,
    SlugRedirect,
    unique_slug,
)
from .sanitize import add_heading_ids, plain_text, sanitize_html

PREVIEW_SALT = 'content-preview'
PREVIEW_MAX_AGE = 60 * 60
MAX_REVISIONS = 20
ORG_ID = f'{settings.SITE_URL}/#organization'
LOGO_URL = f'{settings.SITE_URL}/assets/coding-hubs-school-of-ai-logo.jpeg'
MODELS = {'blog': Blog, 'case': CaseStudy}
BASE_PATH = {'blog': '/blog', 'case': '/case-studies'}

SNAPSHOT_SKIP = {'id', 'created_at', 'updated_at', 'created_by', 'tags', 'related'}


# ---------- slugs & revisions ----------
def snapshot(obj) -> dict:
    data = {}
    for f in obj._meta.concrete_fields:
        if f.name in SNAPSHOT_SKIP:
            continue
        val = getattr(obj, f.attname)
        data[f.attname] = val.isoformat() if hasattr(val, 'isoformat') else val
    return data


def save_revision(obj, user=None):
    kind = obj.KIND
    ContentRevision.objects.create(kind=kind, object_id=obj.pk, snapshot=snapshot(obj), created_by=user)
    stale = list(
        ContentRevision.objects.filter(kind=kind, object_id=obj.pk).order_by('-created_at', '-id').values_list('id', flat=True)[MAX_REVISIONS:]
    )
    if stale:
        ContentRevision.objects.filter(id__in=stale).delete()


def record_slug_change(obj, old_slug: str):
    """A URL that was public and has been renamed keeps working through a 301."""
    if not old_slug or old_slug == obj.slug or not obj.is_public:
        SlugRedirect.objects.filter(kind=obj.KIND, old_slug=obj.slug).delete()
        return
    kind = obj.KIND
    SlugRedirect.objects.filter(kind=kind, old_slug=obj.slug).delete()  # renamed back
    SlugRedirect.objects.filter(kind=kind, new_slug=old_slug).update(new_slug=obj.slug)  # collapse chains
    SlugRedirect.objects.update_or_create(kind=kind, old_slug=old_slug, defaults={'new_slug': obj.slug})


def resolve_redirect(kind: str, slug: str):
    return SlugRedirect.objects.filter(kind=kind, old_slug=slug).values_list('new_slug', flat=True).first()


# ---------- workflow ----------
@transaction.atomic
def publish(obj, published_at=None):
    """Publish now, or schedule when the chosen time is in the future."""
    now = timezone.now()
    if published_at:
        obj.published_at = published_at
    if obj.published_at and obj.published_at > now:
        obj.status = STATUS_SCHEDULED
    else:
        obj.status = STATUS_PUBLISHED
        obj.published_at = obj.published_at or now
    obj.full_clean(exclude=['slug'])
    obj.save()
    return obj


@transaction.atomic
def unpublish(obj):
    obj.status = STATUS_DRAFT
    obj.save(update_fields=['status', 'updated_at'])
    return obj


@transaction.atomic
def archive(obj):
    obj.status = STATUS_ARCHIVED
    obj.save(update_fields=['status', 'updated_at'])
    return obj


# ---------- preview ----------
def make_preview_token(kind: str, pk: int) -> str:
    return signing.dumps({'k': kind, 'id': pk}, salt=PREVIEW_SALT)


def check_preview_token(token: str, kind: str, pk: int) -> bool:
    try:
        data = signing.loads(token, salt=PREVIEW_SALT, max_age=PREVIEW_MAX_AGE)
    except signing.BadSignature:
        return False
    return data.get('k') == kind and data.get('id') == pk


# ---------- SEO ----------
def _trim(text: str, n: int) -> str:
    text = ' '.join((text or '').split())
    return text if len(text) <= n else text[: n - 1].rsplit(' ', 1)[0].rstrip(' ,.;:') + '…'


def absolute(url: str) -> str:
    if not url:
        return ''
    return url if url.startswith('http') else f'{settings.SITE_URL}{url}'


def seo_for(obj, kind: str, preview: bool = False) -> dict:
    path = f'{BASE_PATH[kind]}/{obj.slug}'
    canonical = obj.canonical_url or f'{settings.SITE_URL}{path}'
    summary = obj.excerpt if kind == 'blog' else obj.summary
    title = obj.seo_title or f'{obj.title} | Coding Hubs School of AI'
    description = obj.meta_description or _trim(summary or plain_text(obj.content if kind == 'blog' else obj.overview), 158)
    image = absolute(obj.og_image or obj.featured_image) or LOGO_URL
    return {
        'title': title,
        'description': description,
        'canonical': canonical,
        'robots': 'noindex, nofollow' if preview else 'index, follow, max-image-preview:large',
        'og': {
            'type': 'article',
            'title': obj.og_title or obj.seo_title or obj.title,
            'description': obj.og_description or description,
            'image': image,
            'url': canonical,
        },
        'json_ld': article_json_ld(obj, kind, canonical, description, image),
    }


def organization_ref() -> dict:
    return {'@type': 'EducationalOrganization', '@id': ORG_ID, 'name': 'Coding Hubs School of AI', 'url': f'{settings.SITE_URL}/', 'logo': LOGO_URL}


def article_json_ld(obj, kind, canonical, description, image) -> dict:
    node = {
        '@type': 'BlogPosting' if kind == 'blog' else 'Article',
        '@id': f'{canonical}#article',
        'mainEntityOfPage': {'@type': 'WebPage', '@id': canonical},
        'headline': _trim(obj.title, 110),
        'description': description,
        'image': [image],
        'inLanguage': 'en-IN',
        'publisher': organization_ref(),
    }
    if obj.published_at:
        node['datePublished'] = obj.published_at.isoformat()
    node['dateModified'] = (obj.updated_at or obj.published_at).isoformat() if (obj.updated_at or obj.published_at) else None
    if not node['dateModified']:
        del node['dateModified']
    if obj.author_name:
        node['author'] = {'@type': 'Person', 'name': obj.author_name, **({'jobTitle': obj.author_title} if obj.author_title else {})}
    else:
        node['author'] = {'@id': ORG_ID, '@type': 'EducationalOrganization', 'name': 'Coding Hubs School of AI'}
    graph = [node]
    if kind == 'blog' and obj.faq:
        faq = [f for f in obj.faq if f.get('q') and f.get('a')]
        if faq:
            graph.append(
                {
                    '@type': 'FAQPage',
                    'mainEntity': [
                        {'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': plain_text(sanitize_html(f['a']))}}
                        for f in faq
                    ],
                }
            )
    return {'@context': 'https://schema.org', '@graph': graph}


def render_body(html: str):
    """Sanitise again at render time and add heading ids. Returns (html, toc)."""
    return add_heading_ids(sanitize_html(html))
