"""Read-only HTML inventory: built pages plus every URL in the live sitemap hierarchy.

Run with backend/.venv/bin/python scripts/seo_inventory.py --live.
Two HTTP workers, same-origin sitemap traversal, robots-aware page requests, no JS or writes.
HTML content-size signals are not an editorial quality score or proof of Google indexing.
"""
import argparse
import csv
import json
import re
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree as ET

import requests

ROOT = Path(__file__).resolve().parent.parent
AGENT = 'CodingHubsSEOAudit/1.0'
LOCAL = threading.local()


def clean_url(value, base):
    parsed = urlsplit(urljoin(base, value))
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or '/', parsed.query, ''))


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles, self.h1s, self.descriptions, self.canonicals = [], [], [], []
        self.robots, self.links, self.schemas, self.schema_errors = [], [], [], []
        self.images, self.missing_alt, self.missing_dimensions = 0, 0, 0
        self._title = self._h1 = self._json = False
        self._skip = self._main = 0
        self._title_text, self._h1_text, self._schema_text, self._text = [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'main':
            self._main += 1
        if tag in ('script', 'style', 'nav', 'footer'):
            self._skip += 1
        if tag == 'title':
            self._title = True
            self._title_text = []
        if tag == 'h1':
            self._h1 = True
            self._h1_text = []
        if tag == 'meta':
            name = a.get('name', '').lower()
            if name == 'description':
                self.descriptions.append(a.get('content', ''))
            if name in ('robots', 'googlebot'):
                self.robots.append(a.get('content', ''))
        if tag == 'link' and a.get('rel', '').lower() == 'canonical':
            self.canonicals.append(a.get('href', ''))
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'img':
            self.images += 1
            self.missing_alt += 'alt' not in a
            self.missing_dimensions += not (a.get('width') and a.get('height'))
        if tag == 'script' and a.get('type', '').lower() == 'application/ld+json':
            self._json = True
            self._schema_text = []

    def handle_endtag(self, tag):
        if tag == 'title' and self._title:
            self.titles.append(' '.join(''.join(self._title_text).split()))
            self._title = False
        if tag == 'h1' and self._h1:
            self.h1s.append(' '.join(''.join(self._h1_text).split()))
            self._h1 = False
        if tag == 'script' and self._json:
            try:
                self.schemas.append(json.loads(''.join(self._schema_text)))
            except ValueError as exc:
                self.schema_errors.append(str(exc))
            self._json = False
        if tag in ('script', 'style', 'nav', 'footer'):
            self._skip = max(0, self._skip - 1)
        if tag == 'main':
            self._main = max(0, self._main - 1)

    def handle_data(self, value):
        if self._title:
            self._title_text.append(value)
        if self._h1:
            self._h1_text.append(value)
        if self._json:
            self._schema_text.append(value)
        if self._main and not self._skip:
            self._text.append(value)


def inspect_html(html, url, sitemap=False, status='unverified', header_robots=''):
    p = Page()
    p.feed(html)
    noindex = bool(re.search(r'\b(noindex|none)\b', ','.join(p.robots) + header_robots, re.IGNORECASE))
    issues = []
    indexable = not noindex and status in (200, 'unverified')
    if indexable:
        for values, label in [(p.titles, 'title'), (p.descriptions, 'description'), (p.h1s, 'h1'), (p.canonicals, 'canonical')]:
            if len(values) != 1 or not values[0].strip():
                issues.append(f'{label}_count:{len(values)}')
        if p.canonicals and (not p.canonicals[0].startswith('https://') or urlsplit(p.canonicals[0]).hostname != urlsplit(url).hostname):
            issues.append('invalid_or_cross_domain_canonical')
    if sitemap and noindex:
        issues.append('sitemap_noindex')
    if status != 'unverified' and status != 200:
        issues.append(f'http_{status}')
    if sitemap and p.canonicals and p.canonicals != [url]:
        issues.append('sitemap_noncanonical')
    if p.schema_errors:
        issues.append('invalid_json_ld')
    if p.missing_alt:
        issues.append(f'images_missing_alt:{p.missing_alt}')
    internal, external = set(), set()
    for href in p.links:
        parsed = urlsplit(clean_url(href, url))
        if parsed.scheme not in ('http', 'https'):
            continue
        target = clean_url(href, url)
        (internal if parsed.netloc == urlsplit(url).netloc else external).add(target)
    types = set()

    def schema_types(value):
        if isinstance(value, dict):
            t = value.get('@type', [])
            types.update(t if isinstance(t, list) else [t])
            for v in value.values():
                schema_types(v)
        elif isinstance(value, list):
            for v in value:
                schema_types(v)

    schema_types(p.schemas)
    return {
        'url': url, 'page_type': urlsplit(url).path.strip('/').split('/')[0] or 'home',
        'http_status': status, 'indexability': 'noindex' if noindex else 'eligible' if status in (200, 'unverified') else 'error',
        'canonical': ' | '.join(p.canonicals), 'title': ' | '.join(p.titles),
        'meta_description': ' | '.join(p.descriptions), 'h1': ' | '.join(p.h1s),
        'main_word_count': len(re.findall(r'\b\w+\b', ' '.join(p._text))),
        'content_quality': 'manual_review_required', 'internal_links': sorted(internal), 'external_links': sorted(external),
        'sitemap_inclusion': sitemap, 'schema_types': sorted(types), 'schema_status': 'invalid' if p.schema_errors else 'parsed' if p.schemas else 'absent',
        'images': p.images, 'images_missing_dimensions': p.missing_dimensions,
        'issues': issues, 'priority': 'P1' if issues and sitemap else 'P2' if issues else 'P3',
    }


def get(url):
    if not hasattr(LOCAL, 'session'):
        LOCAL.session = requests.Session()
        LOCAL.session.headers['User-Agent'] = AGENT
    response = LOCAL.session.get(url, timeout=(10, 20))
    if response.status_code == 429:
        delay = response.headers.get('Retry-After', '5')
        time.sleep(min(10, int(delay) if delay.isdigit() else 5))
        response = LOCAL.session.get(url, timeout=(10, 20))
    return response


def built_page_files(dist):
    """Match nginx: / serves home.html; index.html is the private CSR fallback."""
    for file in sorted(dist.rglob('*.html')):
        relative = file.relative_to(dist)
        if relative.as_posix() in ('index.html', '__shell.html', 'content-shell.html', '404.html') or re.fullmatch(r'google[a-z0-9]+\.html', file.name):
            continue
        if relative.as_posix() == 'home.html':
            yield '/', file
        elif file.name == 'index.html':
            yield '/' + relative.parent.as_posix() + '/', file
        else:
            yield '/' + relative.with_suffix('').as_posix(), file


def run(args):
    base = args.base.rstrip('/')
    out = ROOT / args.output
    out.mkdir(parents=True, exist_ok=True)
    rows = {}
    built_sitemap = ET.parse(ROOT / 'frontend/dist/sitemap.xml')
    known_sitemap = {element.text for element in built_sitemap.iter() if element.tag.endswith('}loc')}
    for pathname, file in built_page_files(ROOT / 'frontend/dist'):
        url = base + pathname
        row = inspect_html(file.read_text(), url, url in known_sitemap)
        row['source'] = 'built_html'
        rows[url] = row
    live_sitemaps, live_urls, errors = {}, set(), []
    if args.live:
        robot_response = get(base + '/robots.txt')
        robot_response.raise_for_status()
        (out / 'robots.txt').write_text(robot_response.text)
        robots = RobotFileParser(base + '/robots.txt')
        robots.parse(robot_response.text.splitlines())
        queue = robots.site_maps() or [base + '/sitemap-index.xml']
        while queue:
            url = queue.pop(0)
            if url in live_sitemaps:
                continue
            if urlsplit(url).netloc != urlsplit(base).netloc or len(live_sitemaps) >= 20:
                raise ValueError('Unexpected sitemap host or hierarchy size')
            response = get(url)
            response.raise_for_status()
            root = ET.fromstring(response.content)
            locs = [e.text for e in root.iter() if e.tag.endswith('}loc')]
            live_sitemaps[url] = {'status': response.status_code, 'type': root.tag.split('}')[-1], 'count': len(locs)}
            (out / urlsplit(url).path.strip('/')).write_bytes(response.content)
            if root.tag.endswith('sitemapindex'):
                queue.extend(locs)
            else:
                live_urls.update(locs)

        def fetch_page(url):
            if urlsplit(url).netloc != urlsplit(base).netloc or not robots.can_fetch(AGENT, url):
                return {'url': url, 'source': 'live', 'http_status': 'robots_blocked', 'issues': ['sitemap_robots_blocked'], 'priority': 'P1'}
            try:
                response = get(url)
                row = inspect_html(response.text, url, True, response.status_code, response.headers.get('X-Robots-Tag', ''))
                row.update(source='live', final_url=response.url, redirect_chain=[r.status_code for r in response.history], html_bytes=len(response.content), elapsed_ms=round(response.elapsed.total_seconds() * 1000))
                if response.history:
                    row['issues'].append('sitemap_redirect')
                    row['priority'] = 'P1'
                return row
            except requests.RequestException as exc:
                return {'url': url, 'source': 'live', 'http_status': 'network_error', 'issues': [type(exc).__name__], 'priority': 'P1'}

        with ThreadPoolExecutor(max_workers=2) as pool:
            for number, row in enumerate(pool.map(fetch_page, sorted(live_urls)), 1):
                rows[row['url']] = row
                if number % 50 == 0:
                    print(f'Fetched {number}/{len(live_urls)} sitemap pages', flush=True)
        for row in rows.values():
            row['sitemap_inclusion'] = row['url'] in live_urls
    inbound = Counter()
    for row in rows.values():
        inbound.update(row.get('internal_links', []))
    for row in rows.values():
        row['observed_inbound_links'] = inbound[row['url']]
    duplicates = {}
    for field in ('title', 'meta_description', 'canonical'):
        values = defaultdict(list)
        for row in rows.values():
            if row.get('indexability') == 'eligible' and row.get(field):
                values[row[field]].append(row['url'])
        duplicates[field] = {v: urls for v, urls in values.items() if len(urls) > 1}
    result = {'checked_at': datetime.now(UTC).isoformat(), 'base': base, 'sitemaps': live_sitemaps, 'summary': {
        'inventoried_urls': len(rows), 'live_sitemap_urls': len(live_urls), 'live_statuses': dict(Counter(str(r['http_status']) for r in rows.values() if r['source'] == 'live')),
        'issues': dict(Counter(issue for r in rows.values() for issue in r.get('issues', []))),
        'sitemap_issues': {r['url']: r['issues'] for r in rows.values() if r.get('sitemap_inclusion') and r.get('issues')},
        'duplicate_group_counts': {field: len(groups) for field, groups in duplicates.items()},
    }, 'duplicates': duplicates, 'errors': errors, 'pages': sorted(rows.values(), key=lambda row: row['url'])}
    (out / 'inventory.json').write_text(json.dumps(result, indent=2))
    columns = ['url', 'source', 'page_type', 'http_status', 'indexability', 'canonical', 'title', 'meta_description', 'h1', 'main_word_count', 'content_quality', 'internal_links', 'observed_inbound_links', 'sitemap_inclusion', 'schema_types', 'schema_status', 'issues', 'priority']
    with (ROOT / 'SEO_URL_INVENTORY.csv').open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        for row in result['pages']:
            values = {key: json.dumps(value, ensure_ascii=False) if isinstance(value, list) else value for key, value in row.items() if key in columns}
            values['internal_links'] = len(row.get('internal_links', []))
            writer.writerow(values)
    print(json.dumps(result['summary'], indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--base', default='https://codinghubs.in')
    parser.add_argument('--output', default='artifacts/seo-growth/baseline')
    run(parser.parse_args())
