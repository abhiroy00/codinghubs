"""Public tutor/job directories: real record status, links and text before JavaScript."""
from html import escape
from django.conf import settings
from django.http import HttpResponse, HttpResponsePermanentRedirect
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET
from apps.jobs.models import Job
from apps.jobs.serializers import JobSerializer
from apps.tutors.models import Tutor
from apps.tutors.serializers import TutorSerializer
from .directory_seo import directory_seo
from .ssr import not_found, respond


@require_GET
def directory_page(request, kind, key=None):
    tutors = kind == 'tutors'
    base = '/book-a-tutor/' if tutors else '/latest-jobs/'
    if key is None:
        records = Tutor.objects.filter(is_active=True) if tutors else Job.open_listings()
        serializer = TutorSerializer if tutors else JobSerializer
        items = serializer(records, many=True).data
        seo = directory_seo(kind)
        canonical_path = base
        data = {'kind': kind, 'results': items, 'seo': seo}
    else:
        if tutors:
            # Reject nonnumeric/oversized IDs before the database conversion.
            record = Tutor.objects.filter(pk=int(key), is_active=True).first() if key.isascii() and key.isdigit() and len(key) <= 18 else None
        else:
            record = Job.objects.filter(slug=key, is_published=True).first()
        if record is None:
            return not_found('Tutor profile not found' if tutors else 'Job not found')
        item = (TutorSerializer if tutors else JobSerializer)(record).data
        items = [item]
        seo = item['seo']
        canonical_path = base + (str(record.pk) if tutors else record.slug + '/')
        data = {'kind': 'tutor' if tutors else 'job', 'item': item, 'seo': seo}
    if request.path != canonical_path:
        # Preserve tracking parameters while normalizing equivalent paths.
        query = request.META.get('QUERY_STRING', '')
        return HttpResponsePermanentRedirect(canonical_path + ('?' + query if query else ''))
    body = render_to_string('content/directory.html', {'tutors': tutors, 'detail': key is not None, 'items': items, 'base': base})
    seo = {**seo, 'styles': ['/directory.css']}
    return respond(seo, body, data=data)


@require_GET
def directory_sitemap(request):
    paths = [f'/book-a-tutor/{pk}' for pk in Tutor.objects.filter(is_active=True).values_list('pk', flat=True)]
    # Imported listings are copies of jobs published elsewhere: shown to visitors, kept out of the sitemap (noindex).
    paths += [f'/latest-jobs/{slug}/' for slug in Job.open_listings().filter(source=Job.SOURCE_MANUAL).values_list('slug', flat=True)]
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    xml += ''.join(f'<url><loc>{escape(settings.SITE_URL + p)}</loc></url>' for p in paths) + '</urlset>'
    return HttpResponse(xml, content_type='application/xml; charset=utf-8')
