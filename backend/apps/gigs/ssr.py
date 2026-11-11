from django.conf import settings
from django.core.paginator import InvalidPage, Paginator
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET

from apps.content.ssr import respond
from .models import Gig


@require_GET
def public_page(request, slug=None):
    if not settings.GIGS_ENABLED:
        raise Http404()
    brief = get_object_or_404(Gig.public(), slug=slug) if slug else None
    qs = Gig.public()
    query = request.GET.get('q', '').strip()[:100]
    if query:
        qs = qs.filter(title__icontains=query)
    number = request.GET.get('page', '1')
    try:
        page = Paginator(qs, 20).page(number)
    except InvalidPage:
        raise Http404()
    title = (brief.title if brief else 'Gigs pilot') + ' | Coding Hubs'
    seo = {'title': title, 'description': 'Browse moderated project briefs in the CodingHubs Gigs pilot. Proposals are private; messaging and payments are not available.', 'robots': 'noindex, follow', 'canonical': ''}
    html = render_to_string('gigs/public.html', {'brief': brief, 'page': page, 'query': query})
    response = respond(seo, html)
    response['Cache-Control'] = 'no-store'
    response['X-Robots-Tag'] = 'noindex, follow'
    return response
