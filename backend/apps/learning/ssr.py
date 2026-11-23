from html import escape
from xml.sax.saxutils import escape as xml_escape
from django.conf import settings
from django.db.models import Max, Q
from django.http import HttpResponse
from django.views.decorators.http import require_GET
from apps.content.ssr import respond, not_found
from apps.content.robots import INDEX, get_robots_directive, hub_status
from .models import Concept, LearningCourse, Module

BASE = '/learn/ai-engineering/'


@require_GET
def learning_page(request, course='ai-engineering', slug=None):
    base = f'/learn/{course}/'
    if request.GET.get('preview') == '1':
        return respond({'title': 'Staff lesson preview | CodingHubs', 'description': 'Authenticated staff preview.', 'robots': 'noindex, nofollow', 'canonical': ''}, '<main><h1>Staff lesson preview</h1><p>Sign in to load the draft in the learning workspace.</p></main>', preview=True)
    canonical = settings.SITE_URL + base
    if slug:
        concept = Concept.objects.select_related('chapter__module__course').filter(slug=slug, version__gt=0).first()
        if concept and concept.chapter.module.course_id and (concept.chapter.module.course.slug != course or not concept.chapter.module.course.is_active):
            concept = None
        if not concept:
            return not_found('This concept has not been published')
        snapshot = concept.published
        title, description = snapshot['title'], snapshot['seo_description']
        canonical += slug + '/'
        body = f'<main><nav><a href="{base}">Course roadmap</a></nav><h1>{escape(title)}</h1><p>{escape(description)}</p>'
        for key, label in [('concept', 'Deep concept learning'), ('practice', 'Practical examples and code'), ('industry', 'Industry implementation'), ('assessment', 'Assessments and tasks')]:
            body += f'<section><h2>{label}</h2>'
            for block in snapshot['content'][key]['blocks']:
                body += f'<h3>{escape(block.get("title", ""))}</h3>'
                if block['type'] in ('code', 'diagram'):
                    body += f'<pre>{escape(block["body"])}</pre>'
                else:
                    body += ''.join(f'<p>{escape(p)}</p>' for p in block['body'].split('\n\n'))
            if key == 'assessment':
                for q in snapshot['content'][key].get('quiz', []):
                    body += f'<p>{escape(q["question"])}</p><ul>' + ''.join(f'<li>{escape(o)}</li>' for o in q['options']) + '</ul>'
            body += '</section>'
        body += '</main>'
    else:
        info = LearningCourse.objects.filter(slug=course, is_active=True).first()
        if not info:
            return not_found('Learning path not found')
        title, description = info.title, info.summary
        concepts = Concept.objects.filter(chapter__module__course=info)
        published, total = concepts.filter(version__gt=0).count(), concepts.count()
        status = hub_status(published)
        progress = f'{published} of {total} concepts published; the rest are listed as they are written.' if published else 'Curriculum development in progress.'
        body = f'<main><h1>{escape(title)}</h1><p>{escape(description)}</p><p>{progress}</p>'
        body += '<h2>Learning outcomes</h2><ul>' + ''.join(f'<li>{escape(str(o))}</li>' for o in info.outcomes) + '</ul>'
        for m in Module.objects.filter(course=info).prefetch_related('chapters__concepts'):
            body += f'<section><h2>{m.number:02d}. {escape(m.title)}</h2>'
            for ch in m.chapters.all():
                body += f'<h3>{escape(ch.title)}</h3><ul>'
                for c in ch.concepts.all():
                    label = escape(c.published.get('title', c.title))
                    body += f'<li><a href="{base}{c.slug}/">{label}</a></li>' if c.version else f'<li>{label} — in preparation</li>'
                body += '</ul>'
            body += '</section>'
        body += '</main>'
    # Published concepts passed the editorial gates in quality.py, so they are COMPLETE; a path is COMPLETE once one is published.
    robots = get_robots_directive('COMPLETE' if slug else status)
    return respond({'title': title + ' | CodingHubs School of AI', 'description': description, 'robots': robots, 'canonical': canonical,
                    'json_ld': {'@context': 'https://schema.org', '@type': 'LearningResource' if slug else 'CollectionPage', 'name': title, 'url': canonical, 'description': description}}, body)


@require_GET
def sitemap(request):
    """Indexable /learn/ URLs only: the directory, paths with a published concept, and published concepts.
    <lastmod> is the date of the newest published revision (draft edits do not count)."""
    concepts = (Concept.objects.filter(Q(chapter__module__course__is_active=True) | Q(chapter__module__course__isnull=True), version__gt=0)
                .select_related('chapter__module__course').annotate(published_at=Max('revisions__created_at')))
    rows, hubs = [], {}
    for c in concepts:
        course = c.chapter.module.course.slug if c.chapter.module.course_id else 'ai-engineering'
        rows.append((f'/learn/{course}/{c.slug}/', c.published_at))
        hubs[course] = max(filter(None, (hubs.get(course), c.published_at)), default=None)
    live = set(LearningCourse.objects.filter(slug__in=hubs, is_active=True).values_list('slug', flat=True))
    rows = [('/learn/', max(filter(None, hubs.values()), default=None))] + [(f'/learn/{course}/', mod) for course, mod in sorted(hubs.items()) if course in live] + rows
    body = ''.join(f'<url><loc>{xml_escape(settings.SITE_URL + path)}</loc>' + (f'<lastmod>{mod.date().isoformat()}</lastmod>' if mod else '') + '</url>' for path, mod in rows)
    return HttpResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + '</urlset>', content_type='application/xml')


@require_GET
def academy_page(request):
    title = 'Engineering courses and visual learning | Coding Hubs'
    description = 'Explore self-paced engineering roadmaps, interactive diagrams, original learning material and hands-on practice.'
    body = f'<main><h1>{title}</h1><p>{description}</p>'
    for course in LearningCourse.objects.filter(is_active=True):
        body += f'<section><h2><a href="/learn/{course.slug}/">{escape(course.title)}</a></h2><p>{escape(course.summary)}</p><p>{escape(course.category)} · {escape(course.level)} · self-paced</p></section>'
    body += '<a href="/visual-lab/">Explore the interactive visual lab</a></main>'
    return respond({'title': title, 'description': description, 'robots': INDEX, 'canonical': settings.SITE_URL + '/learn/'}, body)
