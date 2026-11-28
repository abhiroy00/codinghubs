import hashlib
import json
import posixpath
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import unquote, urljoin, urlsplit
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
from defusedxml import ElementTree
from sqlalchemy import func, select

from .models import Frontier, Job, Page, PageVersion
from .network import PublicWeb, canonical_url

PRIVATE = ('/admin', '/api', '/my-account', '/account', '/checkout', '/cart', '/login', '/logout', '/payment')


def safe_link(base, href):
    try:
        url = canonical_url(urljoin(base, href))
        parsed = urlsplit(url)
        if parsed.netloc != urlsplit(base).netloc or parsed.query:
            return None
        path = posixpath.normpath(unquote(parsed.path)).lower()
        if any(path == part or path.startswith(part + '/') for part in PRIVATE) or any(part.startswith('.') for part in path.split('/') if part):
            return None
        if path.endswith(('.pdf', '.png', '.jpg', '.avif', '.webp', '.zip', '.mp4', '.css', '.js', '.woff2')):
            return None
        return url
    except ValueError:
        return None


def analyze_html(url, response):
    soup = BeautifulSoup(response['text'], 'html.parser')
    title = soup.title.get_text(' ', strip=True) if soup.title else ''
    description = soup.find('meta', attrs={'name': 'description'})
    robots = soup.find('meta', attrs={'name': 'robots'})
    canonical = soup.find('link', rel=lambda value: value and 'canonical' in value)
    schemas, errors = [], []
    for node in soup.find_all('script', attrs={'type': 'application/ld+json'}):
        try:
            if len(node.get_text()) > 100000:
                raise ValueError('Oversized schema')
            schemas.append(json.loads(node.get_text()))
        except (ValueError, TypeError):
            errors.append('Invalid or oversized JSON-LD')
    headings = [{'level': int(node.name[1]), 'text': node.get_text(' ', strip=True)[:500]} for node in soup.find_all(['h1', 'h2', 'h3'])]
    links = sorted({link for node in soup.find_all('a', href=True) if (link := safe_link(url, node['href']))})[:5000]
    external = sorted({urljoin(url, node['href']) for node in soup.find_all('a', href=True) if urlsplit(urljoin(url, node['href'])).hostname != urlsplit(url).hostname and node['href'].startswith(('http:', 'https:'))})[:100]
    main = soup.find('main') or soup.find('article') or soup.body or soup
    for node in main.find_all(['script', 'style', 'noscript', 'nav', 'footer', 'form']):
        node.decompose()
    text = main.get_text(' ', strip=True)[:100000]
    data = {'status': response['status'], 'title': title[:1000], 'description': description.get('content', '')[:2000] if description else '',
            'canonical': urljoin(url, canonical.get('href', '')) if canonical else '',
            'robots': ', '.join(filter(None, [robots.get('content', '') if robots else '', response['headers'].get('x-robots-tag', '')])),
            'text': text, 'details': {'h1': [r['text'] for r in headings if r['level'] == 1], 'headings': headings[:200],
                                    'links': links, 'external_references': external, 'schemas': schemas, 'schema_errors': errors,
                                    'table_count': len(soup.find_all('table')), 'code_examples': len(soup.find_all('pre')),
                                    'redirects': response['redirects'], 'final_url': response['url'], 'word_count': len(text.split()),
                                    'body_hash': hashlib.sha256(text.encode()).hexdigest(), 'etag': response['headers'].get('etag', ''),
                                    'last_modified': response['headers'].get('last-modified', '')}}
    data['content_hash'] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    return data


def add_frontier(db, job, urls, maximum):
    existing = set(db.scalars(select(Frontier.url).where(Frontier.job_id == job.id)))
    for url in urls:
        if len(existing) >= maximum:
            break
        if url and url not in existing:
            db.add(Frontier(job_id=job.id, url=url))
            existing.add(url)


def discover_sitemaps(web, site_url, robot_text, maximum):
    pending = [line.split(':', 1)[1].strip() for line in robot_text.splitlines() if line.lower().startswith('sitemap:')]
    if not pending:
        pending = [urljoin(site_url, '/sitemap.xml')]
    seen, urls = set(), []
    while pending and len(seen) < 10 and len(urls) < maximum:
        url = safe_link(site_url, pending.pop(0))
        if not url or url in seen:
            continue
        seen.add(url)
        response = web.get(url, origin=site_url)
        if response['status'] != 200:
            continue
        root = ElementTree.fromstring(response['text'])
        locations = [node.text for node in root.iter() if node.tag.rsplit('}', 1)[-1] == 'loc' and node.text]
        if root.tag.rsplit('}', 1)[-1] == 'sitemapindex':
            pending.extend(locations[:10])
        else:
            urls.extend(link for item in locations if (link := safe_link(site_url, item)))
    return list(dict.fromkeys(urls))[:maximum], sorted(seen)


def run_crawl(sessions, job_id, settings, web=None):
    web = web or PublicWeb()
    try:
        with sessions() as db:
            job = db.get(Job, job_id)
            from .models import Site
            site = db.get(Site, job.site_id)
            if site.tenant_id != job.tenant_id:
                raise ValueError('Invalid job scope')
            limit = min(int(job.params.get('limit', settings.limits['crawl_limit'])), settings.limits['crawl_limit'])
            concurrency = min(int(job.params.get('concurrency', 1)), settings.limits['concurrency'])
            robots_response = web.get(urljoin(site.base_url, '/robots.txt'), origin=site.base_url)
            if robots_response['status'] not in (200, 404):
                raise ValueError('Robots status is uncertain; crawl paused safely')
            robot_text = robots_response['text'] if robots_response['status'] == 200 else ''
            robots = RobotFileParser()
            robots.parse(robot_text.splitlines())
            sitemap_urls, maps = discover_sitemaps(web, site.base_url, robot_text, limit * 3)
            add_frontier(db, job, [site.base_url] + sitemap_urls, limit * 3)
            for item in db.scalars(select(Frontier).where(Frontier.job_id == job.id, Frontier.status == 'processing')):
                item.status = 'pending'
            job.progress = {**job.progress, 'sitemaps': maps, 'sitemap_urls': len(sitemap_urls), 'limit': limit}
            db.commit()
            lock = threading.Lock()
            last_request = [time.monotonic()]
            delay = max(.5, robots.crawl_delay('CodingHubsLocalSEO') or robots.crawl_delay('*') or 0)

            def fetch(item):
                url, headers = item
                with lock:
                    time.sleep(max(0, delay - (time.monotonic() - last_request[0])))
                    last_request[0] = time.monotonic()
                return web.get(url, origin=site.base_url, headers=headers)

            with ThreadPoolExecutor(max_workers=concurrency) as pool:
                while True:
                    db.refresh(job)
                    if job.status != 'running':
                        return {'status': job.status, 'checkpoint': 'Frontier retained for resume'}
                    checked = db.scalar(select(func.count()).select_from(Frontier).where(Frontier.job_id == job.id, Frontier.status.in_(['done', 'blocked', 'error'])))
                    if checked >= limit:
                        break
                    entries = list(db.scalars(select(Frontier).where(Frontier.job_id == job.id, Frontier.status == 'pending').order_by(Frontier.created_at).limit(min(concurrency, limit - checked))))
                    if not entries:
                        break
                    pending = []
                    for entry in entries:
                        if not robots.can_fetch('CodingHubsLocalSEO', entry.url):
                            entry.status = 'blocked'
                            continue
                        entry.status = 'processing'
                        old = db.scalar(select(Page).where(Page.site_id == site.id, Page.tenant_id == site.tenant_id, Page.url == entry.url))
                        headers = {}
                        if old and job.params.get('incremental', True):
                            if old.details.get('etag'):
                                headers['If-None-Match'] = old.details['etag']
                            elif old.details.get('last_modified'):
                                headers['If-Modified-Since'] = old.details['last_modified']
                        pending.append((entry, old, headers))
                    db.commit()
                    futures = [(entry, old, pool.submit(fetch, (entry.url, headers))) for entry, old, headers in pending]
                    for entry, old, future in futures:
                        try:
                            response = future.result()
                            if response['status'] == 304 and old:
                                old.checked_at = time.time()
                                links = old.details.get('links', [])
                            else:
                                data = analyze_html(entry.url, response)
                                if old is None:
                                    old = Page(tenant_id=site.tenant_id, site_id=site.id, url=entry.url)
                                    db.add(old)
                                    db.flush()
                                if old.content_hash != data['content_hash']:
                                    db.add(PageVersion(tenant_id=site.tenant_id, site_id=site.id, page_id=old.id, content_hash=data['content_hash'], data=data))
                                    for key, value in data.items():
                                        setattr(old, key, value)
                                    from .knowledge import ingest_document
                                    ingest_document(db, site, entry.url, data['title'] or entry.url, data['text'], verified=False)
                                old.checked_at = time.time()
                                links = data['details']['links']
                            add_frontier(db, job, links, limit * 3)
                            entry.status = 'done'
                        except Exception as error:
                            entry.status = 'error'
                            # Do not put URL response bodies, credentials or exception payloads into logs.
                            job.progress = {**job.progress, 'last_error_type': type(error).__name__}
                        job.heartbeat = time.time()
                        job.progress = {**job.progress, 'checked': db.scalar(select(func.count()).select_from(Frontier).where(Frontier.job_id == job.id, Frontier.status.in_(['done', 'blocked', 'error'])))}
                        db.commit()
            return {'checked': job.progress.get('checked', 0), 'sitemaps': maps, 'limit': limit,
                    'history': 'Persistent current pages and content versions; incomplete graph is labeled'}
    finally:
        web.close()
