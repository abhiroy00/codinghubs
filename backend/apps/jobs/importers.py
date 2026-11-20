"""Fetch job listings from official job APIs and public company career-page feeds.

Every fetcher returns `Listing` objects in one shape; `apps.jobs.management.commands.import_jobs` filters, de-duplicates
and saves them. Only documented, public endpoints are used (no scraping): Greenhouse and Lever publish open job-board
APIs for each company, Remotive and Arbeitnow publish free job APIs, and Adzuna / Jooble need a free API key.
"""
import html
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone as dt_timezone

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime

TIMEOUT = 25
USER_AGENT = 'CodingHubJobsBot/1.0 (+https://codinghubs.in/latest-jobs/)'

INDIA_PLACES = (
    'india', 'bengaluru', 'bangalore', 'delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'mumbai', 'pune',
    'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'chandigarh', 'indore', 'kochi', 'coimbatore',
)
SENIOR = re.compile(r'\b(senior|sr\.?|staff|principal|lead|tl|stl|team lead|head|director|vp|vice president|manager|architect|chief|distinguished|am/m|avp|sde[ -]?(iii|3|iv|4)|iii|iv)\b', re.I)
# "Experience : 5-7 yrs" / "4+ years" in a title: too senior for this audience.
YEARS = re.compile(r'(\d+)\s*(?:\+|[-–to ]+\s*\d+)?\s*(?:yrs|years)', re.I)
INTERN = re.compile(r'\b(intern|internship|trainee|apprentice)\b', re.I)
FRESHER = re.compile(r'\b(fresher|graduate|entry[- ]level|campus|new grad|junior|associate)\b', re.I)


@dataclass
class Listing:
    source: str
    external_id: str
    title: str
    company: str
    location: str
    url: str
    description: str = ''
    posted: datetime | None = None
    remote: bool = False
    hybrid: bool = False
    internship: bool = False
    part_time: bool = False
    contract: bool = False
    salary: str = ''
    company_logo: str = ''
    tags: list = field(default_factory=list)


def _session():
    s = requests.Session()
    s.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    return s


def clean_text(value, limit=2000):
    """HTML (possibly entity-escaped twice, as Greenhouse sends it) to readable plain text."""
    text = html.unescape(html.unescape(value or ''))
    text = re.sub(r'<\s*(br|/p|/li|/h[1-6]|/div)\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'<\s*li[^>]*>', '\n• ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    lines = [re.sub(r'[ \t ]+', ' ', line).strip() for line in text.splitlines()]
    text = '\n'.join(line for line in lines if line)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text[:limit].rsplit(' ', 1)[0] + '…' if len(text) > limit else text


def _dt(value):
    if value in (None, ''):
        return None
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 10**11 else value  # Lever sends milliseconds
        return datetime.fromtimestamp(seconds, tz=dt_timezone.utc)
    parsed = parse_datetime(str(value).replace('Z', '+00:00'))
    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, dt_timezone.utc)
    return parsed


def _pairs(values):
    """'slug:Display Name' entries from settings -> [(slug, name)]."""
    out = []
    for item in values:
        slug, _, name = item.strip().partition(':')
        if slug:
            out.append((slug.strip(), (name or slug).strip()))
    return out


def in_india(location):
    loc = (location or '').lower()
    return any(place in loc for place in INDIA_PLACES)


# ---------------------------------------------------------------- company career pages

def fetch_greenhouse(session=None):
    session = session or _session()
    for board, company in _pairs(settings.JOBS_GREENHOUSE_BOARDS):
        response = session.get(f'https://boards-api.greenhouse.io/v1/boards/{board}/jobs', params={'content': 'true'}, timeout=TIMEOUT)
        response.raise_for_status()
        for job in response.json().get('jobs', []):
            location = (job.get('location') or {}).get('name') or ''
            yield Listing(
                source='greenhouse', external_id=f'{board}:{job["id"]}', title=job.get('title', ''), company=company,
                location=location, url=job.get('absolute_url', ''), description=clean_text(job.get('content')),
                posted=_dt(job.get('first_published') or job.get('updated_at')),
                remote='remote' in location.lower(), hybrid='hybrid' in location.lower(),
            )


def fetch_lever(session=None):
    session = session or _session()
    for slug, company in _pairs(settings.JOBS_LEVER_COMPANIES):
        response = session.get(f'https://api.lever.co/v0/postings/{slug}', params={'mode': 'json'}, timeout=TIMEOUT)
        response.raise_for_status()
        for job in response.json():
            categories = job.get('categories') or {}
            location = categories.get('location') or ', '.join(categories.get('allLocations') or [])
            commitment = (categories.get('commitment') or '').lower()
            workplace = (job.get('workplaceType') or '').lower()
            yield Listing(
                source='lever', external_id=f'{slug}:{job["id"]}', title=job.get('text', ''), company=company,
                location=location, url=job.get('hostedUrl', ''), description=clean_text(job.get('descriptionPlain') or job.get('description')),
                posted=_dt(job.get('createdAt')), remote=workplace == 'remote', hybrid=workplace == 'hybrid',
                internship='intern' in commitment, part_time='part' in commitment, contract='contract' in commitment,
            )


# ---------------------------------------------------------------- free job APIs

def fetch_remotive(session=None):
    session = session or _session()
    response = session.get('https://remotive.com/api/remote-jobs', params={'category': 'software-dev'}, timeout=TIMEOUT)
    response.raise_for_status()
    for job in response.json().get('jobs', []):
        region = (job.get('candidate_required_location') or '').lower()
        if region and not any(k in region for k in ('worldwide', 'anywhere', 'india', 'asia', 'apac', 'global')):
            continue  # remote, but only for people in other countries
        kind = (job.get('job_type') or '').lower()
        yield Listing(
            source='remotive', external_id=str(job['id']), title=job.get('title', ''), company=job.get('company_name', ''),
            location='Remote', url=job.get('url', ''), description=clean_text(job.get('description')),
            posted=_dt(job.get('publication_date')), remote=True, salary=(job.get('salary') or '')[:100],
            internship='intern' in kind, part_time='part' in kind, contract='contract' in kind,
            company_logo=job.get('company_logo') or '',
        )


def fetch_arbeitnow(session=None):
    session = session or _session()
    response = session.get('https://www.arbeitnow.com/api/job-board-api', timeout=TIMEOUT)
    response.raise_for_status()
    for job in response.json().get('data', []):
        if not job.get('remote'):
            continue  # on-site roles are almost all in Europe
        kinds = ' '.join(job.get('job_types') or []).lower()
        yield Listing(
            source='arbeitnow', external_id=job.get('slug', ''), title=job.get('title', ''), company=job.get('company_name', ''),
            location='Remote', url=job.get('url', ''), description=clean_text(job.get('description')),
            posted=_dt(job.get('created_at')), remote=True, internship='intern' in kinds, part_time='part' in kinds,
        )


def fetch_adzuna(session=None):
    if not (settings.ADZUNA_APP_ID and settings.ADZUNA_APP_KEY):
        return
    session = session or _session()
    for term in settings.JOBS_SEARCH_TERMS:
        response = session.get('https://api.adzuna.com/v1/api/jobs/in/search/1', timeout=TIMEOUT, params={
            'app_id': settings.ADZUNA_APP_ID, 'app_key': settings.ADZUNA_APP_KEY, 'results_per_page': 50,
            'what': term.strip(), 'where': settings.ADZUNA_WHERE, 'max_days_old': 7, 'sort_by': 'date',
        })
        response.raise_for_status()
        for job in response.json().get('results', []):
            salary = ''
            if job.get('salary_min') and not str(job.get('salary_is_predicted')) == '1':
                low, high = job.get('salary_min'), job.get('salary_max') or job.get('salary_min')
                salary = f'₹{low / 100000:.1f}–{high / 100000:.1f} LPA' if high != low else f'₹{low / 100000:.1f} LPA'
            yield Listing(
                source='adzuna', external_id=str(job['id']), title=job.get('title', ''),
                company=(job.get('company') or {}).get('display_name', ''), location=(job.get('location') or {}).get('display_name', ''),
                url=job.get('redirect_url', ''), description=clean_text(job.get('description')), posted=_dt(job.get('created')),
                part_time=job.get('contract_time') == 'part_time', contract=job.get('contract_type') == 'contract', salary=salary,
            )


def fetch_jooble(session=None):
    if not settings.JOOBLE_API_KEY:
        return
    session = session or _session()
    for term in settings.JOBS_SEARCH_TERMS:
        response = session.post(f'https://jooble.org/api/{settings.JOOBLE_API_KEY}', timeout=TIMEOUT,
                                json={'keywords': term.strip(), 'location': settings.JOOBLE_LOCATION, 'page': '1'})
        response.raise_for_status()
        for job in response.json().get('jobs', []):
            kind = (job.get('type') or '').lower()
            yield Listing(
                source='jooble', external_id=str(job.get('id')), title=clean_text(job.get('title'), 160), company=job.get('company', ''),
                location=job.get('location', ''), url=job.get('link', ''), description=clean_text(job.get('snippet')),
                posted=_dt(job.get('updated')), salary=(job.get('salary') or '')[:100],
                internship='intern' in kind, part_time='part' in kind, contract='contract' in kind,
            )


FETCHERS = {
    'greenhouse': fetch_greenhouse,
    'lever': fetch_lever,
    'remotive': fetch_remotive,
    'arbeitnow': fetch_arbeitnow,
    'adzuna': fetch_adzuna,
    'jooble': fetch_jooble,
}


# ---------------------------------------------------------------- filtering and mapping

def is_relevant(listing):
    """Tech roles for students and early-career learners, in India or remote."""
    title = listing.title or ''
    if not title or not listing.url:
        return False
    if not settings.JOBS_INCLUDE_SENIOR:
        if SENIOR.search(title) and not INTERN.search(title):
            return False
        years = YEARS.search(title)
        if years and int(years.group(1)) >= 4:
            return False
    haystack = f' {title.lower()} '
    if not any(re.search(rf'\b{re.escape(k.strip().lower())}\b', haystack) for k in settings.JOBS_KEYWORDS if k.strip()):
        return False
    return listing.remote or in_india(listing.location)


def to_job_fields(listing):
    """Map a Listing onto Job model fields."""
    from .models import Job

    intern = listing.internship or bool(INTERN.search(listing.title))
    if intern:
        job_type = Job.TYPE_INTERNSHIP
    elif listing.contract:
        job_type = Job.TYPE_CONTRACT
    elif listing.part_time:
        job_type = Job.TYPE_PART_TIME
    else:
        job_type = Job.TYPE_FULL_TIME
    if listing.remote:
        mode = Job.MODE_REMOTE
    elif listing.hybrid or 'hybrid' in (listing.location or '').lower():
        mode = Job.MODE_HYBRID
    else:
        mode = Job.MODE_ONSITE
    level = 'fresher' if intern or FRESHER.search(listing.title) else 'junior'
    description = listing.description or 'Read the full job description and apply on the original listing.'
    return {
        'title': listing.title[:160], 'company_name': (listing.company or 'Company')[:160],
        'company_logo': listing.company_logo[:500], 'location': (listing.location or 'Remote')[:160],
        'work_mode': mode, 'job_type': job_type, 'experience_level': level, 'salary': listing.salary[:100],
        'description': description, 'application_url': listing.url[:500],
        'how_to_apply': 'Apply on the original listing using the Apply button.',
    }
