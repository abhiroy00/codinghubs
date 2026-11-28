from django.conf import settings
from apps.content import services as content_services
from apps.content.sanitize import add_heading_ids, plain_text, sanitize_html
from . import access
from .models import Project, ProjectGuide


def public_projects():
    return Project.objects.public()


def public_guides():
    return ProjectGuide.objects.public().select_related('project')


def guide_is_indexable(guide):
    """Require actual anonymous instructional content, without unlocking protected sections.

    This structural minimum is not an editorial quality score or a word-count ranking rule.
    Empty/disabled sections and known error placeholders must not submit a guide for indexing.
    """
    for section in guide.sections or []:
        if not section.get('enabled') or not section.get('title'):
            continue
        if guide.access_type != ProjectGuide.ACCESS_FREE and not section.get('preview'):
            continue
        text = plain_text(sanitize_html(section.get('html', ''))).strip().rstrip('.').lower()
        if text and text not in ('api failed', 'coming soon', 'todo', 'tbd', 'placeholder'):
            return True
    return False


def fill_description(desc: str, title: str, what: str) -> str:
    """Meta descriptions under ~70 characters are too thin to be useful in results; pad with factual context."""
    desc = (desc or '').strip()
    if len(desc) >= 70:
        return desc[:158]
    lead = f'{title}: {desc.rstrip(".")}. ' if desc else f'{title}. '
    return (lead + f'{what} from Coding Hubs School of AI, Netaji Subhash Place, Delhi.')[:158]


def guides_by_project(project_ids) -> dict:
    """First public guide of each project (one query), shown next to the project everywhere it is listed."""
    out = {}
    for g in ProjectGuide.objects.public().filter(project_id__in=list(project_ids)).order_by('-is_featured', '-published_at', 'id'):
        out.setdefault(g.project_id, {'title': g.title, 'slug': g.slug, 'access_type': g.access_type})
    return out


def project_card(p: Project, guide=None) -> dict:
    return {
        'title': p.title, 'slug': p.slug, 'summary': p.summary, 'category': p.category, 'difficulty': p.difficulty, 'technologies': p.technologies,
        'featured_image': p.featured_image, 'featured_image_alt': p.featured_image_alt, 'estimated_time': p.estimated_time,
        'is_featured': p.is_featured, 'files_restricted': p.files_restricted, 'published_at': p.published_at, 'guide': guide,
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


def guide_card(g: ProjectGuide) -> dict:
    return {
        'title': g.title, 'slug': g.slug, 'summary': g.summary, 'category': g.category, 'difficulty': g.difficulty, 'technologies': g.technologies,
        'featured_image': g.featured_image, 'featured_image_alt': g.featured_image_alt, 'estimated_time': g.estimated_time,
        'access_type': g.access_type, 'is_featured': g.is_featured, 'reading_time': g.reading_time, 'published_at': g.published_at,
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
    return {
        'type': g.access_type,
        'courses': [{'name': c.name, 'slug': c.slug} for c in g.included_courses.filter(is_active=True)],
        'message': 'Contact Coding Hubs for access to this restricted guide.' if g.access_type == ProjectGuide.ACCESS_RESTRICTED else 'This guide is included with an eligible course enrollment.',
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
        'robots': 'noindex, nofollow' if preview else 'noindex, follow' if kind == 'guide' and not guide_is_indexable(obj) else 'index, follow, max-image-preview:large',
        'og': {'type': 'article', 'title': obj.og_title or obj.seo_title or obj.title, 'description': obj.og_description or desc, 'image': image, 'url': canonical},
        'json_ld': {'@context': 'https://schema.org', '@graph': [node]},
    }
