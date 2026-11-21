"""Google Search Console data for blog posts: index status (URL Inspection API) and 28-day clicks/impressions.

Read-only scope. Configure with a service account that has been added as a user of the Search Console property:
    GSC_SERVICE_ACCOUNT_B64   base64 of the service account JSON key (or GSC_SERVICE_ACCOUNT_JSON with the raw JSON)
    GSC_PROPERTY              the property, e.g. https://codinghubs.in/ (default) or sc-domain:codinghubs.in
Without credentials everything here reports "not configured" and nothing is called.
"""
import base64
import json
from datetime import date, timedelta
from urllib.parse import quote

from decouple import config
from django.conf import settings
from django.utils import timezone

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
ANALYTICS_URL = 'https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query'


def _service_account_info():
    raw = config('GSC_SERVICE_ACCOUNT_JSON', default='')
    if not raw:
        b64 = config('GSC_SERVICE_ACCOUNT_B64', default='')
        raw = base64.b64decode(b64).decode() if b64 else ''
    return json.loads(raw) if raw else None


def property_url():
    return config('GSC_PROPERTY', default=f'{settings.SITE_URL}/')


def is_configured():
    try:
        return _service_account_info() is not None
    except (ValueError, json.JSONDecodeError):
        return False


def _session():
    from google.auth.transport.requests import AuthorizedSession
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_info(_service_account_info(), scopes=SCOPES)
    return AuthorizedSession(creds)


def inspect(session, url):
    """Returns (status, coverage) where status is 'indexed' or 'not_indexed'."""
    r = session.post(INSPECT_URL, json={'inspectionUrl': url, 'siteUrl': property_url()}, timeout=20)
    r.raise_for_status()
    result = r.json().get('inspectionResult', {}).get('indexStatusResult', {})
    status = 'indexed' if result.get('verdict') == 'PASS' else 'not_indexed'
    return status, (result.get('coverageState') or '')[:200]


def page_stats(session, days=28):
    """{page_url: (clicks, impressions)} for the last `days` days of Search Console data."""
    end = date.today() - timedelta(days=2)  # the newest days are incomplete in Search Console
    body = {'startDate': str(end - timedelta(days=days)), 'endDate': str(end), 'dimensions': ['page'], 'rowLimit': 5000}
    r = session.post(ANALYTICS_URL.format(site=quote(property_url(), safe='')), json=body, timeout=30)
    r.raise_for_status()
    return {row['keys'][0]: (int(row.get('clicks', 0)), int(row.get('impressions', 0))) for row in r.json().get('rows', [])}


def sync_blogs(limit=15, session=None):
    """Refreshes clicks/impressions for every public post and the index status of the `limit` least recently checked.

    Kept small per call so a click in the admin finishes quickly and stays far below the daily inspection quota.
    """
    from .models import Blog

    session = session or _session()
    stats = page_stats(session)
    posts = list(Blog.objects.public().only('id', 'slug', 'gsc_checked_at'))
    for post in posts:
        clicks, impressions = stats.get(f'{settings.SITE_URL}/blog/{post.slug}', (0, 0))
        Blog.objects.filter(pk=post.pk).update(gsc_clicks=clicks, gsc_impressions=impressions)
    stale = sorted(posts, key=lambda p: p.gsc_checked_at or timezone.make_aware(timezone.datetime.min.replace(year=2000)))[:limit]
    checked = 0
    for post in stale:
        status, coverage = inspect(session, f'{settings.SITE_URL}/blog/{post.slug}')
        Blog.objects.filter(pk=post.pk).update(gsc_status=status, gsc_coverage=coverage, gsc_checked_at=timezone.now())
        checked += 1
    remaining = Blog.objects.public().filter(gsc_checked_at__isnull=True).count()
    return {'posts': len(posts), 'inspected': checked, 'never_checked': remaining}
