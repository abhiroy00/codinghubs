import hashlib
import math
import re
from collections import defaultdict
from datetime import date, timedelta
from urllib.parse import urlsplit

import networkx as nx
from sklearn.cluster import MiniBatchKMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select

from .imports import latest_rows
from .models import Action, Evidence, ImportSet, Page


def totals(rows):
    clicks = sum(r['clicks'] for r in rows)
    impressions = sum(r['impressions'] for r in rows)
    positioned = [r for r in rows if r.get('position') is not None and r['impressions']]
    denominator = sum(r['impressions'] for r in positioned)
    return {'clicks': clicks, 'impressions': impressions, 'ctr_pct': clicks / impressions * 100 if impressions else None,
            'position_approx': sum(r['position'] * r['impressions'] for r in positioned) / denominator if denominator else None}


def summary(db, site):
    source = db.scalar(select(ImportSet).where(ImportSet.site_id == site.id, ImportSet.tenant_id == site.tenant_id).order_by(ImportSet.created_at.desc()))
    bundle = source.digest if source else None
    chart, batch = latest_rows(db, site, 'chart', bundle=bundle) if source else ([], None)
    chart.sort(key=lambda r: r['key'])
    dimensions = {}
    for dimension in ('query', 'page', 'country', 'device', 'appearance', 'query_page'):
        rows, dimension_source = latest_rows(db, site, dimension, bundle=bundle) if source else ([], None)
        dimensions[dimension] = {'rows': rows, 'totals': totals(rows) if rows else None, 'source_id': dimension_source.id if dimension_source else None}
    windows = {}
    if chart:
        last = date.fromisoformat(chart[-1]['key'])
        for label, days, offset in [('last7', 7, 0), ('previous7', 7, 7), ('last28', 28, 0), ('previous28', 28, 28), ('last90', 90, 0)]:
            end = last - timedelta(days=offset)
            start = end - timedelta(days=days - 1)
            rows = [r for r in chart if start.isoformat() <= r['key'] <= end.isoformat()]
            windows[label] = {'start': str(start), 'end': str(end), 'observed_days': len(rows),
                              'complete': len(rows) == days, 'totals': totals(rows) if len(rows) == days else None}
    return {'chart': chart, 'totals': totals(chart) if chart else None, 'dimensions': dimensions, 'windows': windows,
            'source': {'id': source.id, 'created_at': source.created_at, **source.context} if source else None,
            'limitations': ['Page impressions use a different aggregation from the property chart.',
                            'Visible queries are incomplete; absence is unknown rather than zero.',
                            'Chart windows end at the last observed date; full 90-day/YoY and current indexing may be missing.',
                            'Separate tables are not query/page/device joins. Average position is not a fixed rank.']}


def intent(query):
    query = query.lower()
    if re.search(r'pitampura|rohini|delhi|near me|netaji|nsp', query):
        return 'local'
    if re.search(r'course|training|institute|fees|admission', query):
        return 'commercial'
    if 'interview' in query:
        return 'interview'
    if re.search(r'career|job|placement', query):
        return 'career'
    if re.search(r'vs|difference|compare', query):
        return 'comparison'
    return 'informational'


def opportunity(row, business=None):
    impressions = row['impressions']
    pos = row.get('position') or 1000
    confidence = 'moderate sample' if impressions >= 100 else 'small sample' if impressions >= 15 else 'very sparse'
    relevance = 20 if (business or intent(row['key'])) in ('local', 'commercial', 'career') else 10
    score = min(30, math.log1p(impressions) * 5) + (20 if 4 <= pos <= 20 else 12 if pos <= 50 else 5)
    score += relevance + (15 if impressions >= 100 else 10 if impressions >= 15 else 3) + 10
    return {**row, 'intent': business or intent(row['key']), 'score': round(score, 1), 'confidence': confidence,
            'potential_clicks_scenario': round(max(0, impressions * .03 - row['clicks']), 2),
            'scenario_assumption': '3% CTR at unchanged impressions; per-row scenario, not forecast; do not sum overlapping dimensions',
            'score_assumption': 'log demand <=30 + ranking <=20 + editorial intent <=20 + sample confidence <=15 + low-effort review 10'}


def keyword_analysis(db, site, data=None):
    data = data or summary(db, site)
    rows = data['dimensions']['query']['rows']
    crawled = db.scalars(select(Page).where(Page.site_id == site.id, Page.tenant_id == site.tenant_id)).all()
    observed = data['dimensions']['page']['rows']
    candidates = {r['key']: r['key'].rsplit('/', 1)[-1].replace('-', ' ') for r in observed}
    candidates.update({p.url: p.title + ' ' + p.text[:2000] for p in crawled})
    mappings, clusters = {}, {}
    joins = defaultdict(list)
    for row in data['dimensions']['query_page']['rows']:
        joins[row['query']].append(row)
    urls = list(candidates)
    if rows and urls:
        try:
            vectors = TfidfVectorizer(stop_words='english', max_features=5000).fit_transform([r['key'] for r in rows] + list(candidates.values()))
            similarities = cosine_similarity(vectors[:len(rows)], vectors[len(rows):])
            for index, row in enumerate(rows):
                best = int(similarities[index].argmax())
                if similarities[index, best] >= .12:
                    mappings[row['key']] = {'url': urls[best], 'method': 'lexical suggestion; human review required', 'similarity': round(float(similarities[index, best]), 3)}
        except ValueError:
            pass
    if len(rows) >= 4:
        try:
            vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), max_features=3000)
            matrix = vectorizer.fit_transform([r['key'] for r in rows])
            model = MiniBatchKMeans(n_clusters=min(12, max(2, int(math.sqrt(len(rows) / 2)))), random_state=42, n_init=3, batch_size=128)
            labels = model.fit_predict(matrix)
            names = vectorizer.get_feature_names_out()
            centers = {i: ', '.join(names[j] for j in center.argsort()[-2:][::-1]) for i, center in enumerate(model.cluster_centers_)}
            clusters = {r['key']: centers[int(label)] for r, label in zip(rows, labels)}
        except ValueError:
            pass
    output = []
    for row in rows:
        mapping = mappings.get(row['key'])
        if joins[row['key']]:
            target = max(joins[row['key']], key=lambda r: r['impressions'])
            mapping = {'url': target['page'], 'method': 'observed query+page API row', 'similarity': None}
        output.append({**opportunity(row), 'mapping': mapping, 'cluster': clusters.get(row['key'], 'Unclustered')})
    output.sort(key=lambda r: (-r['score'], -r['impressions']))
    overlap = [{'query': query, 'pages': sorted({r['page'] for r in records}), 'status': 'candidate, not proof of harmful cannibalization'}
               for query, records in joins.items() if len({r['page'] for r in records}) > 1]
    from .evidence_analysis import imported_keyword_ideas
    imported = db.scalars(select(Evidence).where(Evidence.site_id == site.id, Evidence.tenant_id == site.tenant_id, Evidence.kind == 'keywords').order_by(Evidence.created_at.desc()).limit(10)).all()
    return {'rows': output, 'overlap_candidates': overlap,
            'overlap_limit': None if joins else 'Dated query+page rows are missing; cannibalization cannot be established from separate exports.',
            'ideas': imported_keyword_ideas(imported) + [{'query': r['key'] + ' practical examples', 'status': 'unverified deterministic idea; no volume, CPC or difficulty'} for r in output[:8] if r['intent'] == 'informational']}


def missing_link_candidates(pages):
    pages = pages[:100]
    if len(pages) < 2:
        return []
    try:
        matrix = TfidfVectorizer(stop_words='english', max_features=2500).fit_transform([page.title + ' ' + page.text[:1500] for page in pages])
        similarities = cosine_similarity(matrix)
    except ValueError:
        return []
    candidates = []
    for index, source in enumerate(pages):
        observed = set(source.details.get('links', []))
        for other in similarities[index].argsort()[::-1][:5]:
            target = pages[int(other)]
            if target.id != source.id and target.url not in observed and similarities[index, other] >= .2:
                candidates.append({'source': source.url, 'target': target.url, 'similarity': round(float(similarities[index, other]), 3),
                                   'basis': 'Lexical relevance candidate within captured pages; confirm purpose, existing aliases and access before adding a link'})
    return sorted(candidates, key=lambda r: -r['similarity'])[:20]


def technical_analysis(db, site):
    pages = db.scalars(select(Page).where(Page.site_id == site.id, Page.tenant_id == site.tenant_id)).all()
    graph = nx.DiGraph()
    known = {p.url for p in pages}
    findings, hashes, titles = [], defaultdict(list), defaultdict(list)
    for page in pages:
        graph.add_node(page.url)
        for target in page.details.get('links', []):
            graph.add_edge(page.url, target)
        if page.content_hash and page.text:
            hashes[page.details.get('body_hash', page.content_hash)].append(page.url)
        if page.title:
            titles[page.title.lower()].append(page.url)
        issues = []
        if page.status >= 400:
            issues.append('http_error')
        if page.status == 200:
            if not page.title:
                issues.append('missing_title')
            if not page.description:
                issues.append('missing_description')
            if len(page.details.get('h1', [])) != 1:
                issues.append('primary_heading_review')
            if not page.canonical:
                issues.append('missing_canonical')
            if page.details.get('schema_errors'):
                issues.append('invalid_json_ld')
            if len(page.text.split()) < 100:
                issues.append('short_content_manual_review')
        if issues:
            findings.append({'url': page.url, 'status': page.status, 'issues': issues,
                             'indexing_signal': 'noindex observed' if 'noindex' in page.robots.lower() else 'no noindex observed; not Google index status'})
    broken = [{'source': source, 'target': target} for source, target in graph.edges if target in known and next(p.status for p in pages if p.url == target) >= 400]
    disconnected = [url for url in known if graph.in_degree(url) == 0 and urlsplit(url).path != '/']
    distances = nx.single_source_shortest_path_length(graph, site.base_url) if site.base_url in graph else {}
    return {'checked_pages': len(pages), 'findings': findings, 'broken_internal_links': broken,
            'duplicates': [urls for urls in hashes.values() if len(urls) > 1], 'duplicate_titles': [urls for urls in titles.values() if len(urls) > 1],
            'no_observed_inbound': disconnected, 'crawl_depth': dict(distances),
            'graph_limit': 'Graph reflects captured pages only; zero observed inbound links is not proof of a site-wide orphan.'}


def save_action(db, site, title, kind, target, evidence, severity='P2', score=50, confidence='measured'):
    fingerprint = hashlib.sha256((kind + '|' + target).encode()).hexdigest()
    action = db.scalar(select(Action).where(Action.site_id == site.id, Action.tenant_id == site.tenant_id, Action.fingerprint == fingerprint))
    if action is None:
        action = Action(tenant_id=site.tenant_id, site_id=site.id, fingerprint=fingerprint, title=title, kind=kind)
        db.add(action)
    action.evidence, action.score, action.confidence, action.severity = evidence, score, confidence, severity
    return action
