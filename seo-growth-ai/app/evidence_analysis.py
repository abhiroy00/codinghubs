"""Interpret supplied evidence without inventing coverage, traffic or backlink authority."""
from urllib.parse import urlsplit

AI_DOMAINS = ('chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'copilot.microsoft.com', 'gemini.google.com')


def analytics_rows(record):
    data = record.data
    if 'result' in data:
        result = data['result']
        dimensions = [field['name'] for field in result.get('dimensionHeaders', [])]
        metrics = [field['name'] for field in result.get('metricHeaders', [])]
        return [{**dict(zip(dimensions, (v['value'] for v in row.get('dimensionValues', [])))),
                 **dict(zip(metrics, (v['value'] for v in row.get('metricValues', []))))} for row in result.get('rows', [])]
    return data.get('rows', [])


def referral_evidence(records):
    if not records:
        return []
    record = max(records, key=lambda r: r.created_at)
    output = []
    for row in analytics_rows(record):
        normalized = {str(key).lower().replace(' ', ''): value for key, value in row.items()}
        source = next((normalized[key] for key in ('sessionsourcemedium', 'sessionsource/medium', 'source/medium', 'source', 'referrer') if key in normalized), '')
        token = str(source).split(' / ')[0].strip()
        host = urlsplit(token if '://' in token else 'https://' + token).hostname
        if not host or '.' not in host or host in ('(direct)', '(not set)'):
            continue
        raw_sessions = normalized.get('sessions')
        sessions = int(raw_sessions) if raw_sessions is not None and str(raw_sessions).isdigit() else None
        output.append({'source': str(source), 'domain': host, 'sessions': sessions, 'source_id': record.id,
                       'ai_referral': any(host == domain or host.endswith('.' + domain) for domain in AI_DOMAINS),
                       'limits': 'Selected imported/API rows only; a referral is not proof of a verified backlink or AI citation.'})
    return output[:100]


def backlink_opportunities(records, referrals):
    output = []
    if records:
        source = max(records, key=lambda r: r.created_at)
        for row in source.data.get('rows', [])[:1000]:
            normalized = {str(k).lower().strip(): str(v).strip() for k, v in row.items()}
            value = next((normalized[k] for k in ('domain', 'top linking sites', 'linking site', 'linking sites', 'source', 'referring page', 'linking page', 'url') if k in normalized), '')
            try:
                parsed = urlsplit(value if '://' in value else 'https://' + value)
            except ValueError:
                continue
            if parsed.hostname and '.' in parsed.hostname and parsed.scheme in ('http', 'https'):
                output.append({'domain': parsed.hostname, 'observed_url': value, 'basis': 'User-imported link dataset', 'source_id': source.id})
    output.extend({'domain': row['domain'], 'basis': 'Observed referral source, not a verified backlink', 'source_id': row['source_id']} for row in referrals)
    unique = {row['domain']: row for row in output}
    return [{**row, 'next_action': 'Manually review topical relevance and a useful original resource before any authorized partnership/contact. No outreach has been sent.',
             'coverage': 'Incomplete first-party/imported evidence; no authority score or purchased links'} for row in list(unique.values())[:50]]


def imported_keyword_ideas(records):
    output = []
    for source in sorted(records, key=lambda r: r.created_at, reverse=True)[:10]:
        headers = source.data.get('headers', [])
        if headers and headers[0].lower() in ('month', 'week', 'day', 'time'):
            output.extend({'query': term, 'status': 'Imported Trends relative-interest series; index is not search volume', 'source_id': source.id} for term in headers[1:])
            continue
        for row in source.data.get('rows', [])[:1000]:
            query = next((str(value) for name, value in row.items() if name.lower() in ('keyword', 'query', 'search term', 'top queries')), '')
            if query:
                output.append({'query': query, 'status': 'User-imported idea; validate intent and first-party demand. Ads competition is not organic difficulty.',
                               'source_id': source.id, 'reported_fields': {name: value for name, value in row.items() if name.lower() not in ('keyword', 'query', 'search term', 'top queries')}})
    return output[:100]
