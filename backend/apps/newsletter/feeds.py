"""Technology news feed for the public newsletter page.

Only publisher-provided RSS/Atom feeds on the allowlist below are read. Every item is
validated, normalised and classified server-side against an editorial taxonomy; off-topic
and ambiguous items are dropped. The last successfully validated items of each source are
kept in the cache, so a failing provider never empties the page.

Only titles, short plain-text summaries, dates and links are stored or shown; every item
links to the original publication. See docs/newsletter-tech-feed.md for setup.
"""
from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as dt_timezone
from email.utils import parsedate_to_datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

CACHE_KEY = 'newsletter:tech-feed:v1'
LOCK_KEY = 'newsletter:tech-feed:lock'
MAX_BYTES = 2 * 1024 * 1024
MAX_ITEMS = 60
MAX_AGE = timedelta(days=60)
USER_AGENT = 'TechNewsFeed/1.0 (+RSS reader; titles and links only)'


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    feed_url: str
    site_url: str
    # Item links must stay on one of these hosts (or their subdomains).
    domains: tuple[str, ...]


SOURCES: tuple[Source, ...] = (
    Source('github-blog', 'The GitHub Blog', 'https://github.blog/feed/', 'https://github.blog/', ('github.blog',)),
    Source('stack-overflow-blog', 'Stack Overflow Blog', 'https://stackoverflow.blog/feed/', 'https://stackoverflow.blog/', ('stackoverflow.blog',)),
    Source('aws-news-blog', 'AWS News Blog', 'https://aws.amazon.com/blogs/aws/feed/', 'https://aws.amazon.com/blogs/aws/', ('aws.amazon.com',)),
    Source('hugging-face-blog', 'Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', 'https://huggingface.co/blog', ('huggingface.co',)),
    Source('mit-technology-review-ai', 'MIT Technology Review', 'https://www.technologyreview.com/topic/artificial-intelligence/feed', 'https://www.technologyreview.com/', ('technologyreview.com',)),
    Source('infoq', 'InfoQ', 'https://feed.infoq.com/', 'https://www.infoq.com/', ('infoq.com',)),
)

# Editorial taxonomy. A title match scores 2 and a summary match 1; an item needs a score of at
# least 2 in one core technology category. Education is only ever a secondary label.
CATEGORIES: dict[str, tuple[str, str]] = {
    'ai': ('AI & machine learning', r"\b(ai|a\.i\.|artificial intelligence|machine learning|ml|llms?|gpt[-\w]*|gen ?ai|generative|neural|transformers?|deep learning|embeddings?|rag|retrieval[- ]augmented|agents?|agentic|copilot|diffusion|inference|fine[- ]tun\w*|language models?|chatbots?|prompts?)\b"),
    'software': ('Software development', r"\b(programming|programmers?|developers?|software|code|coding|javascript|typescript|python|java|rust|golang|c\+\+|kotlin|react|node\.?js|apis?|frameworks?|open[- ]source|git|compilers?|debugg\w*|refactor\w*|unit tests?|testing|web ?assembly)\b"),
    'data': ('Data & databases', r"\b(data science|data engineering|databases?|sql|postgres\w*|mysql|nosql|analytics|pandas|spark|data warehouses?|vector (?:search|databases?)|datasets?|etl)\b"),
    'cloud': ('Cloud & DevOps', r"\b(cloud|aws|amazon (?:ec2|s3|bedrock|sagemaker)|azure|gcp|google cloud|kubernetes|k8s|docker|containers?|serverless|lambda|devops|terraform|infrastructure|observability|ci/cd|sre)\b"),
    'tools': ('Developer tools', r"\b(ide|vs ?code|github|gitlab|terminal|cli|devtools|sdks?|copilot|codespaces|pull requests?|github actions)\b"),
    'education': ('Learning & careers', r"\b(learn(?:ing)?|courses?|tutorials?|students?|education|careers?|interviews?|certifications?|skills?|beginners?|junior)\b"),
}
CORE = ('ai', 'software', 'data', 'cloud', 'tools')
EXCLUDE = re.compile(
    r"\b(sports?|football|cricket|celebrit\w*|election|politic\w*|senators?|recipes?|fashion|movies?|box office|horoscopes?|lottery|"
    r"deals?|discounts?|% off|black friday|cyber monday|giveaways?|sponsored|coupons?|gift guides?)\b",
    re.I,
)
_PATTERNS = {key: re.compile(pattern, re.I) for key, (_, pattern) in CATEGORIES.items()}
_TAGS = re.compile(r'<[^>]+>')
_BLOCKS = re.compile(r'<(script|style|iframe|noscript)\b[^>]*>.*?</\1\s*>', re.I | re.S)
_SPACE = re.compile(r'\s+')
_TRACKING = re.compile(r'^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|source|sr_share)$', re.I)


class FeedError(Exception):
    pass


def classify(title: str, summary: str) -> list[str]:
    """Categories for an item, strongest first; [] when it is off-topic or ambiguous."""
    if EXCLUDE.search(title) or EXCLUDE.search(summary):
        return []
    scores = {key: 2 * bool(pattern.search(title)) + bool(pattern.search(summary)) for key, pattern in _PATTERNS.items()}
    core = [key for key in CORE if scores[key] >= 2]
    if not core:
        return []
    labels = sorted(core, key=lambda key: (-scores[key], CORE.index(key)))
    if scores['education'] >= 2:
        labels.append('education')
    return labels


def clean_text(value: str | None, limit: int) -> str:
    markup = _BLOCKS.sub(' ', html.unescape(value or ''))
    text = _SPACE.sub(' ', html.unescape(_TAGS.sub(' ', markup))).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(' ', 1)[0].rstrip(' ,.;:')
    return cut + '…'


def canonical_url(value: str | None, source: Source) -> str | None:
    if not value:
        return None
    try:
        parts = urlsplit(value.strip())
    except ValueError:
        return None
    host = (parts.hostname or '').lower()
    if parts.scheme not in ('http', 'https') or not host:
        return None
    if not any(host == domain or host.endswith('.' + domain) for domain in source.domains):
        return None
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING.match(k)])
    port = f':{parts.port}' if parts.port and parts.port not in (80, 443) else ''
    path = parts.path or '/'
    return urlunsplit(('https', host + port, path, query, ''))


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt_timezone.utc)
    return parsed.astimezone(dt_timezone.utc)


def _local(tag: str) -> str:
    return tag.rsplit('}', 1)[-1].lower()


def _child(node, *names):
    for child in node:
        if _local(child.tag) in names:
            return child
    return None


def _text(node, *names) -> str:
    child = _child(node, *names)
    return (child.text or '') if child is not None else ''


def _atom_link(entry) -> str:
    fallback = ''
    for child in entry:
        if _local(child.tag) != 'link':
            continue
        rel = child.get('rel', 'alternate')
        if rel == 'alternate' and child.get('href'):
            return child.get('href')
        fallback = fallback or child.get('href', '')
    return fallback


def parse_feed(body: bytes, source: Source, now: datetime | None = None) -> list[dict]:
    """Validated, normalised items of one RSS 2.0 or Atom document. Raises FeedError if malformed."""
    if len(body) > MAX_BYTES:
        raise FeedError('feed too large')
    # A DTD (and so any entity declaration) can only appear in the prolog, before the root element.
    root_start = re.search(rb'<(?![?!])', body)
    prolog = body[:root_start.start() if root_start else len(body)].lower()
    if b'<!doctype' in prolog or b'<!entity' in prolog:
        raise FeedError('DTDs and entities are not accepted')
    try:
        root = ET.fromstring(body)
    except ET.ParseError as error:
        raise FeedError(f'malformed XML: {error}') from error
    now = now or timezone.now()
    kind = _local(root.tag)
    if kind == 'rss':
        channel = _child(root, 'channel')
        entries = [node for node in (channel if channel is not None else []) if _local(node.tag) == 'item']
    elif kind == 'feed':
        entries = [node for node in root if _local(node.tag) == 'entry']
    else:
        raise FeedError(f'unsupported document <{kind}>')

    items = []
    for entry in entries:
        if kind == 'rss':
            link = _text(entry, 'link') or (_text(entry, 'guid') if (_child(entry, 'guid') is not None and _child(entry, 'guid').get('isPermaLink', 'true') != 'false') else '')
            summary = _text(entry, 'description') or _text(entry, 'encoded')
            published = parse_date(_text(entry, 'pubdate') or _text(entry, 'date'))
        else:
            link = _atom_link(entry)
            summary = _text(entry, 'summary') or _text(entry, 'content')
            published = parse_date(_text(entry, 'published') or _text(entry, 'updated'))
        title = clean_text(_text(entry, 'title'), 200)
        url = canonical_url(link, source)
        summary = clean_text(summary, 280)
        if not title or not url or not published:
            continue
        if published > now + timedelta(days=1) or published < now - MAX_AGE:
            continue
        categories = classify(title, summary)
        if not categories:
            continue
        items.append({
            'title': title,
            'url': url,
            'summary': summary,
            'published_at': published.isoformat().replace('+00:00', 'Z'),
            'categories': categories,
            'source': source.id,
            'source_name': source.name,
            'source_url': source.site_url,
        })
    return items


def fetch(source: Source) -> bytes:
    """Download one feed with a timeout and a hard size limit."""
    response = requests.get(
        source.feed_url,
        headers={'User-Agent': USER_AGENT, 'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8'},
        timeout=(3.05, getattr(settings, 'TECH_FEED_TIMEOUT', 6)),
        stream=True,
        allow_redirects=True,
    )
    try:
        response.raise_for_status()
        chunks, size = [], 0
        for chunk in response.iter_content(65536):
            size += len(chunk)
            if size > MAX_BYTES:
                raise FeedError('feed too large')
            chunks.append(chunk)
        return b''.join(chunks)
    finally:
        response.close()


def _title_key(title: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', title.lower()).strip()


def merge(per_source: dict[str, list[dict]]) -> list[dict]:
    """Deduplicate by canonical URL and normalised title, newest first."""
    seen_urls, seen_titles, merged = set(), set(), []
    every = sorted((item for items in per_source.values() for item in items), key=lambda item: item['published_at'], reverse=True)
    for item in every:
        key = _title_key(item['title'])
        if item['url'] in seen_urls or key in seen_titles:
            continue
        seen_urls.add(item['url'])
        seen_titles.add(key)
        merged.append(item)
    return merged[:MAX_ITEMS]


def refresh(sources: tuple[Source, ...] | None = None, fetcher=None) -> dict:
    """Fetch every source; keep the previous validated items of any source that fails."""
    sources = SOURCES if sources is None else sources
    fetcher = fetcher or fetch
    previous = cache.get(CACHE_KEY) or {}
    state = dict(previous.get('sources') or {})
    now = timezone.now()

    def load(source):
        try:
            return source, parse_feed(fetcher(source), source, now), None
        except Exception as error:  # Any provider failure falls back to its last good items.
            return source, None, f'{type(error).__name__}: {error}'[:200]

    with ThreadPoolExecutor(max_workers=min(6, len(sources) or 1)) as pool:
        results = list(pool.map(load, sources))
    for source, items, error in results:
        old = state.get(source.id) or {}
        if items is None:
            state[source.id] = {**old, 'ok': False, 'error': error, 'checked_at': now.isoformat(), 'items': old.get('items', [])}
        else:
            state[source.id] = {'ok': True, 'error': '', 'checked_at': now.isoformat(), 'fetched_at': now.isoformat(), 'items': items}
    active = {source.id for source in sources}
    state = {key: value for key, value in state.items() if key in active}
    data = {
        'refreshed_at': now.isoformat(),
        'sources': state,
        'items': merge({key: value.get('items', []) for key, value in state.items()}),
    }
    cache.set(CACHE_KEY, data, None)
    return data


def get_feed() -> dict:
    """Cached feed; refreshes when stale, serving the last validated feed if a refresh fails."""
    data = cache.get(CACHE_KEY)
    ttl = timedelta(seconds=getattr(settings, 'TECH_FEED_TTL', 1800))
    fresh = data and timezone.now() - datetime.fromisoformat(data['refreshed_at']) < ttl
    if not fresh and getattr(settings, 'TECH_FEED_REFRESH_ON_REQUEST', True) and cache.add(LOCK_KEY, 1, 120):
        try:
            data = refresh()
        except Exception:
            pass
        finally:
            cache.delete(LOCK_KEY)
    return data or {'refreshed_at': None, 'sources': {}, 'items': []}


def public_payload(data: dict, category: str = '') -> dict:
    items = data.get('items', [])
    counts = {key: sum(key in item['categories'] for item in items) for key in CATEGORIES}
    visible = [item for item in items if not category or category in item['categories']]
    by_id = {source.id: source for source in SOURCES}
    sources = []
    for key, state in (data.get('sources') or {}).items():
        if key in by_id:
            sources.append({'id': key, 'name': by_id[key].name, 'url': by_id[key].site_url, 'ok': bool(state.get('ok')), 'fetched_at': state.get('fetched_at')})
    ttl = getattr(settings, 'TECH_FEED_TTL', 1800)
    refreshed = data.get('refreshed_at')
    return {
        'refreshed_at': refreshed,
        'stale': bool(refreshed) and (timezone.now() - datetime.fromisoformat(refreshed)).total_seconds() > ttl * 2,
        'categories': [{'id': key, 'label': label, 'count': counts[key]} for key, (label, _) in CATEGORIES.items() if counts[key]],
        'sources': sources,
        'items': visible,
    }
