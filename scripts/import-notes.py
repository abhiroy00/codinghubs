"""Import the institute's published notes, keeping article content separate from the UI bundle."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import tempfile
import time
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://codingnowai.in'
CACHE = Path(tempfile.gettempdir()) / 'codinghubs-notes-source'
ALLOWED = set('p h2 h3 h4 h5 h6 pre code strong b em i u s del mark sub sup blockquote ul ol li dl dt dd table thead tbody tfoot tr th td caption a img br hr div span figure figcaption details summary kbd samp'.split())
DROP = set('script style iframe object embed form input button select textarea link meta noscript svg'.split())


def fetch(url):
    CACHE.mkdir(exist_ok=True)
    target = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.html')
    if target.exists():
        return target.read_text()
    for attempt in range(3):
        try:
            request = Request(url, headers={'User-Agent': 'CodingHubs-Notes-Migration/1.0'})
            with urlopen(request, timeout=45) as response:
                html = response.read().decode('utf-8')
            target.write_text(html)
            return html
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def text(element):
    return element.get_text(' ', strip=True) if element else ''


def notes_link(url):
    parsed = urlparse(urljoin(SOURCE, url))
    if parsed.hostname in ('codingnowai.in', 'www.codingnowai.in') and parsed.path.startswith('/notes/'):
        parts = parsed.path.strip('/').split('/')
        if len(parts) > 2:
            return f'/notes/{parts[1]}/?topic={quote(parts[2])}' + (f'#{parsed.fragment}' if parsed.fragment else '')
        return parsed.path.rstrip('/') + '/'
    return urljoin(SOURCE, url)


def sanitize(body):
    for item in body.select('.share-bar, .post-nav, .post-navigation'):
        item.decompose()
    for item in body.find_all(string=lambda value: isinstance(value, Comment)):
        item.extract()
    for tag in list(body.find_all()):
        if tag.name is None or tag.parent is None:
            continue
        if tag.name in DROP:
            tag.decompose()
            continue
        if tag.name not in ALLOWED:
            tag.unwrap()
            continue
        attrs = {}
        if tag.get('id') and re.fullmatch(r'[a-zA-Z0-9_-]+', tag['id']):
            attrs['id'] = tag['id']
        if tag.name == 'a' and tag.get('href'):
            href = str(tag['href']).strip()
            if urlparse(href).scheme.lower() in ('', 'http', 'https', 'mailto'):
                attrs['href'] = href if href.startswith('#') else notes_link(href)
                if attrs['href'].startswith('http'):
                    attrs.update(target='_blank', rel='noopener noreferrer')
        if tag.name == 'img' and tag.get('src'):
            src = urljoin(SOURCE, tag['src'])
            if urlparse(src).scheme in ('http', 'https'):
                attrs.update(src=src, alt=tag.get('alt', ''), loading='lazy', decoding='async')
        if tag.name in ('td', 'th'):
            for key in ('colspan', 'rowspan'):
                if str(tag.get(key, '')).isdigit():
                    attrs[key] = tag[key]
        if tag.name == 'ol' and str(tag.get('start', '')).isdigit():
            attrs['start'] = tag['start']
        tag.attrs = attrs
    return body.decode_contents().strip()


def import_article(task):
    subject, topic = task
    soup = BeautifulSoup(fetch(topic['sourceUrl']), 'html.parser')
    body = soup.select_one('.post-body')
    if body is None:
        raise ValueError('Missing article body: ' + topic['sourceUrl'])
    content = sanitize(body)
    plain = text(body)
    if len(plain) < 40:
        raise ValueError('Empty article: ' + topic['sourceUrl'])
    words = len(plain.split())
    article = {**topic, 'subject': subject, 'html': content, 'wordCount': words}
    destination = ROOT / 'frontend/public/notes-content' / subject
    destination.mkdir(parents=True, exist_ok=True)
    (destination / (topic['slug'] + '.json')).write_text(json.dumps(article, ensure_ascii=False) + '\n')
    return topic['sourceUrl'], words


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    subjects = []
    index = BeautifulSoup(fetch(SOURCE + '/notes/'), 'html.parser')
    for card in index.select('a.subject-card[href]'):
        slug = urlparse(card['href']).path.rstrip('/').split('/')[-1]
        if not re.fullmatch(r'[a-z0-9-]+', slug):
            raise ValueError('Unsafe subject slug')
        soup = BeautifulSoup(fetch(SOURCE + '/notes/' + slug), 'html.parser')
        topics = []
        seen = set()
        for topic in soup.select('a.topic-card[href]'):
            url = urljoin(SOURCE, topic['href'])
            topic_slug = urlparse(url).path.rstrip('/').split('/')[-1]
            if url in seen:
                continue
            if not re.fullmatch(r'[a-z0-9-]+', topic_slug):
                raise ValueError('Unsafe topic slug: ' + url)
            seen.add(url)
            topics.append({'slug': topic_slug, 'title': text(topic.select_one('h3')), 'description': text(topic.select_one('p')), 'sourceUrl': url})
        if not topics:
            raise ValueError('No topics found: ' + slug)
        subjects.append({'slug': slug, 'title': text(card.select_one('h3')), 'description': text(card.select_one('p')), 'icon': text(card.select_one('.subject-icon')), 'topics': topics})
        print(f'{slug}: {len(topics)} published topics', flush=True)
    tasks = [(subject['slug'], topic) for subject in subjects for topic in subject['topics']]
    completed = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, max(1, args.workers))) as executor:
        for result in executor.map(import_article, tasks):
            completed.append(result)
            if len(completed) % 50 == 0:
                print(f'Imported {len(completed)}/{len(tasks)} articles', flush=True)
    destination = ROOT / 'frontend/src/notes'
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'catalog.json').write_text(json.dumps(subjects, ensure_ascii=False, indent=2) + '\n')
    report = {'source': SOURCE + '/notes/', 'subjects': len(subjects), 'articles': len(completed), 'words': sum(words for _, words in completed), 'subjectCounts': {s['slug']: len(s['topics']) for s in subjects}}
    (destination / 'import-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
