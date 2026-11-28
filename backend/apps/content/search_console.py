"""Google Search Console data for blog posts: index status (URL Inspection API) and 28-day clicks/impressions.

Read-only scope. Configure with a service account that has been added as a user of the Search Console property:
    GSC_SERVICE_ACCOUNT_B64   base64 of the service account JSON key (or GSC_SERVICE_ACCOUNT_JSON with the raw JSON)
    GSC_PROPERTY              the property, e.g. https://codinghubs.in/ (default) or sc-domain:codinghubs.in
Without credentials everything here reports "not configured" and nothing is called.
"""
import base64
import json
from datetime import datetime, timedelta
from urllib.parse import quote
from zoneinfo import ZoneInfo

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


def query_rows(session, start, end, dimensions, *, row_limit=5000, max_pages=10, data_state='final'):
    """Bounded pagination. Top-row/privacy limits still apply even when truncated=False.

    Search Console dates are inclusive. Raw responses stay server-side; callers must not expose
    private query exports or credentials in public endpoints or repository files.
    """
    if start > end or not 1 <= row_limit <= 25000 or not 1 <= max_pages <= 20:
        raise ValueError('Invalid reporting dates or pagination limits.')
    if data_state not in ('final', 'all', 'hourly_all'):
        raise ValueError('Invalid Search Console data state.')
    rows, metadata = [], {}
    for page in range(max_pages):
        body = {'startDate': str(start), 'endDate': str(end), 'dimensions': dimensions,
                'rowLimit': row_limit, 'startRow': page * row_limit, 'dataState': data_state, 'type': 'web'}
        response = session.post(ANALYTICS_URL.format(site=quote(property_url(), safe='')), json=body, timeout=30)
        response.raise_for_status()
        payload = response.json()
        batch = payload.get('rows', [])
        rows.extend(batch)
        metadata.update(payload.get('metadata', {}))
        if len(batch) < row_limit:
            return {'rows': rows, 'truncated': False, 'metadata': metadata}
    return {'rows': rows, 'truncated': True, 'metadata': metadata}


def report_windows(as_of=None):
    """Stable daily windows, previous equal-length periods and a prior-year comparison.

    Default to the Search Console reporting timezone, not the host server's date.
    A two-day lag is explicit; dataState=final still controls actual available final data.
    """
    as_of = as_of or datetime.now(ZoneInfo('America/Los_Angeles')).date()
    end = as_of - timedelta(days=2)
    windows = {}
    for days in (7, 28, 90):
        start = end - timedelta(days=days - 1)
        windows[f'{days}d'] = (start, end)
        windows[f'previous_{days}d'] = (start - timedelta(days=days), start - timedelta(days=1))
    # Leap-day-safe comparison with the same count of inclusive calendar days.
    prior_end = end.replace(year=end.year - 1, day=min(end.day, 28)) if end.month == 2 else end.replace(year=end.year - 1)
    windows['year_ago_28d'] = (prior_end - timedelta(days=27), prior_end)
    return windows


def page_stats(session, days=28):
    """{page_url: (clicks, impressions)} for the last `days` days of Search Console data."""
    if not 1 <= days <= 365:
        raise ValueError('days must be between 1 and 365')
    end = report_windows()['28d'][1]
    result = query_rows(session, end - timedelta(days=days - 1), end, ['page'])
    if result['truncated']:
        raise ValueError('Search Console page data exceeded the safe reporting limit; counts were not overwritten.')
    return {row['keys'][0]: (int(row.get('clicks', 0)), int(row.get('impressions', 0))) for row in result['rows']}


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
