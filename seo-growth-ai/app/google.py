"""Official free Google APIs only. Missing credentials never become simulated success."""
import base64
import hashlib
import json
import math
import re
import secrets
import time
from datetime import datetime, timedelta
from urllib.parse import quote, urlencode, urlsplit
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select

from .models import Connection, Evidence, ImportBatch, ImportSet, Metric, Quota, Session, StateToken
from .network import canonical_url
from .security import audit, digest

READ_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters'
ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
ALLOWED_HOSTS = {'www.googleapis.com', 'searchconsole.googleapis.com', 'analyticsdata.googleapis.com', 'analyticsadmin.googleapis.com'}


class IntegrationPaused(ValueError):
    pass


def connection_for(db, site):
    return db.scalar(select(Connection).where(Connection.tenant_id == site.tenant_id, Connection.site_id == site.id, Connection.provider == 'google'))


def configure(db, site, vault, client_id, client_secret, analytics_property='', allow_sitemap_write=False):
    if not client_id.endswith('.apps.googleusercontent.com'):
        raise ValueError('Use an official Google desktop OAuth client ID')
    if analytics_property and (not analytics_property.startswith('properties/') or not analytics_property.split('/')[-1].isdigit()):
        raise ValueError('GA4 property must have the form properties/123456')
    connection = connection_for(db, site)
    old = vault.decrypt(connection.encrypted) if connection else {}
    cfg = {**old, 'client_id': client_id, 'client_secret': client_secret,
           'analytics_property': analytics_property, 'allow_sitemap_write': allow_sitemap_write}
    if not connection:
        connection = Connection(tenant_id=site.tenant_id, site_id=site.id, provider='google', encrypted=vault.encrypt(cfg))
        db.add(connection)
    else:
        connection.encrypted = vault.encrypt(cfg)
    db.flush()
    return connection


def authorization_url(db, site, user, session, vault, settings):
    connection = connection_for(db, site)
    if not connection:
        raise ValueError('Configure your own free Google OAuth client first')
    config = vault.decrypt(connection.encrypted)
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    scopes = [WRITE_SCOPE if config.get('allow_sitemap_write') else READ_SCOPE, ANALYTICS_SCOPE]
    db.add(StateToken(tenant_id=user.tenant_id, purpose='google_oauth', digest=digest(state), expires_at=time.time() + 600,
                      data={'payload': vault.encrypt({'site_id': site.id, 'user_id': user.id, 'session_id': session.id,
                                                     'connection_id': connection.id, 'verifier': verifier})}))
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode({'client_id': config['client_id'],
        'redirect_uri': settings.google_redirect_uri, 'response_type': 'code', 'scope': ' '.join(scopes),
        'state': state, 'code_challenge': challenge, 'code_challenge_method': 'S256', 'access_type': 'offline', 'prompt': 'consent'})


def finish_oauth(db, state, code, vault, settings, client=None):
    record = db.scalar(select(StateToken).where(StateToken.digest == digest(state), StateToken.purpose == 'google_oauth',
                                               StateToken.expires_at > time.time()).with_for_update())
    if not record:
        raise ValueError('OAuth state is invalid, expired or already consumed')
    payload = vault.decrypt(record.data['payload'])
    session = db.get(Session, payload['session_id'])
    if not session or session.user_id != payload['user_id'] or session.expires_at <= time.time():
        raise ValueError('Start a new connection from an active local session')
    connection = db.scalar(select(Connection).where(Connection.id == payload['connection_id'], Connection.tenant_id == record.tenant_id,
                                                   Connection.site_id == payload['site_id']))
    if not connection:
        raise ValueError('Connection no longer exists')
    record.expires_at = 0
    db.commit()  # Consume before code exchange; replay cannot race a second exchange.
    config = vault.decrypt(connection.encrypted)
    own_client = client is None
    client = client or httpx.Client(timeout=20, trust_env=False, follow_redirects=False)
    try:
        response = client.post('https://oauth2.googleapis.com/token', data={'client_id': config['client_id'], 'client_secret': config['client_secret'],
            'code': code, 'code_verifier': payload['verifier'], 'grant_type': 'authorization_code', 'redirect_uri': settings.google_redirect_uri})
        if response.status_code != 200:
            raise ValueError('Google authorization was not completed; start a new consent flow')
        token = response.json()
        if not token.get('access_token'):
            raise ValueError('Google did not return an access token')
        config.update({k: token[k] for k in ('access_token', 'refresh_token', 'scope') if k in token})
        config['expires_at'] = time.time() + min(int(token.get('expires_in', 3600)), 86400)
        connection.encrypted, connection.status = vault.encrypt(config), 'connected'
        audit(db, connection.tenant_id, 'google_connected', connection.site_id, user=payload['user_id'])
        return connection.site_id
    finally:
        if own_client:
            client.close()


def reserve_quota(db, connection, provider='gsc'):
    now = datetime.now(ZoneInfo('America/Los_Angeles'))
    if connection.paused_until > time.time():
        raise IntegrationPaused('Integration paused until its quota/reset window permits another request')
    for window, limit in [(now.date().isoformat(), 50 if provider == 'inspection' else 200), (now.strftime('%Y-%m-%dT%H:%M'), 20)]:
        if db.bind.dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import insert
        else:
            from sqlalchemy.dialects.sqlite import insert
        statement = insert(Quota).values(tenant_id=connection.tenant_id, site_id=connection.site_id, provider=provider, window=window, count=1)
        statement = statement.on_conflict_do_update(index_elements=['site_id', 'provider', 'window'],
            set_={'count': Quota.count + 1}, where=Quota.count < limit).returning(Quota.id)
        if not db.scalar(statement):
            connection.paused_until = time.time() + (60 if 'T' in window else 86400)
            db.commit()
            raise IntegrationPaused('Local conservative free-API quota exhausted; no paid fallback is permitted')
    db.commit()


class Google:
    def __init__(self, db, site, vault, client=None):
        self.db, self.site, self.vault = db, site, vault
        self.connection = connection_for(db, site)
        if not self.connection:
            raise ValueError('Google connection is missing; import CSV/XLSX instead')
        self.client = client or httpx.Client(timeout=25, trust_env=False, follow_redirects=False)
        self.config = vault.decrypt(self.connection.encrypted)

    def token(self):
        if self.config.get('expires_at', 0) <= time.time() + 60:
            if not self.config.get('refresh_token'):
                raise ValueError('Authorize the free Google connection before synchronization')
            response = self.client.post('https://oauth2.googleapis.com/token', data={'client_id': self.config['client_id'],
                'client_secret': self.config['client_secret'], 'refresh_token': self.config['refresh_token'], 'grant_type': 'refresh_token'})
            if response.status_code != 200:
                raise ValueError('Google token refresh requires reconnection')
            data = response.json()
            self.config['access_token'] = data['access_token']
            self.config['expires_at'] = time.time() + min(int(data.get('expires_in', 3600)), 86400)
            self.connection.encrypted = self.vault.encrypt(self.config)
            self.db.commit()
        return self.config['access_token']

    def call(self, method, url, body=None, provider='gsc'):
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password or parsed.port not in (None, 443):
            raise ValueError('Only the fixed official free Google API endpoints are allowed')
        allowed = (
            parsed.hostname == 'www.googleapis.com' and (
                (method == 'GET' and (parsed.path == '/webmasters/v3/sites' or re.fullmatch(r'/webmasters/v3/sites/[^/]+/sitemaps', parsed.path)))
                or (method == 'POST' and re.fullmatch(r'/webmasters/v3/sites/[^/]+/searchAnalytics/query', parsed.path))
                or (method == 'PUT' and re.fullmatch(r'/webmasters/v3/sites/[^/]+/sitemaps/[^/]+', parsed.path)))
            or parsed.hostname == 'searchconsole.googleapis.com' and method == 'POST' and parsed.path == '/v1/urlInspection/index:inspect'
            or parsed.hostname == 'analyticsdata.googleapis.com' and method == 'POST' and re.fullmatch(r'/v1beta/properties/\d+:runReport', parsed.path)
            or parsed.hostname == 'analyticsadmin.googleapis.com' and method == 'GET' and parsed.path == '/v1beta/accountSummaries'
        )
        if not allowed or parsed.query or parsed.fragment:
            raise ValueError('This Google method/path is outside the allowlist of free integrations')
        token = self.token()
        reserve_quota(self.db, self.connection, provider)
        response = self.client.request(method, url, headers={'Authorization': 'Bearer ' + token}, json=body)
        if response.status_code == 429 or (response.status_code == 403 and any(word in response.text.lower() for word in ('quota', 'ratelimit', 'rate_limit'))):
            retry = response.headers.get('retry-after', '3600')
            self.connection.paused_until = time.time() + min(86400, max(60, int(retry) if retry.isdigit() else 3600))
            self.db.commit()
            raise IntegrationPaused('Google free quota/rate limit reached; integration paused without a paid fallback')
        if response.status_code >= 400:
            raise ValueError(f'Google API returned HTTP {response.status_code}; check property permissions and scopes')
        if len(response.content) > 10_000_000:
            raise ValueError('Google response exceeds the local import limit')
        return response.json() if response.content else {}

    def properties(self):
        return self.call('GET', 'https://www.googleapis.com/webmasters/v3/sites').get('siteEntry', [])

    def search_rows(self, start, end, dimensions):
        rows, metadata = [], {}
        path = 'https://www.googleapis.com/webmasters/v3/sites/' + quote(self.site.property_url, safe='') + '/searchAnalytics/query'
        for page in range(5):
            response = self.call('POST', path, {'startDate': start, 'endDate': end, 'dimensions': dimensions,
                'type': 'web', 'dataState': 'final', 'rowLimit': 1000, 'startRow': page * 1000})
            batch = response.get('rows', [])
            if not isinstance(batch, list):
                raise ValueError('Invalid Google row format')
            rows.extend(batch)
            metadata = {k: response[k] for k in ('metadata', 'responseAggregationType') if k in response}
            if len(batch) < 1000:
                return rows, {**metadata, 'local_row_cap_reached': False, 'query_omissions_possible': True}
        return rows, {**metadata, 'local_row_cap_reached': True, 'query_omissions_possible': True}

    def sync(self, days=28):
        if not self.site.property_url:
            raise ValueError('Select an authorized Search Console property first')
        end = datetime.now(ZoneInfo('America/Los_Angeles')).date() - timedelta(days=2)
        start = end - timedelta(days=min(90, max(7, days)) - 1)
        groups = {}
        dimensions = {'chart': ['date'], 'query': ['query'], 'page': ['page'], 'country': ['country'],
                      'device': ['device'], 'appearance': ['searchAppearance'], 'query_page': ['query', 'page']}
        for kind, axes in dimensions.items():
            groups[kind] = self.search_rows(str(start), str(end), axes)
        bundle = hashlib.sha256(json.dumps(groups, sort_keys=True).encode()).hexdigest()
        batches = {}
        for kind, (rows, metadata) in groups.items():
            raw_digest = hashlib.sha256(json.dumps({'kind': kind, 'start': str(start), 'end': str(end), 'rows': rows}, sort_keys=True).encode()).hexdigest()
            batch = self.db.scalar(select(ImportBatch).where(ImportBatch.site_id == self.site.id, ImportBatch.tenant_id == self.site.tenant_id,
                                                            ImportBatch.digest == raw_digest, ImportBatch.kind == kind))
            if not batch:
                batch = ImportBatch(tenant_id=self.site.tenant_id, site_id=self.site.id, digest=raw_digest, kind=kind,
                    filename=f'Official API {kind} {start}..{end}', rows=len(rows), metadata_json={'start': str(start), 'end': str(end), **metadata})
                self.db.add(batch)
                self.db.flush()
                for row in rows:
                    keys = row.get('keys', [])
                    clicks, impressions, position = row.get('clicks', 0), row.get('impressions', 0), row.get('position')
                    if len(keys) != len(dimensions[kind]) or any(len(str(key)) > 4000 for key in keys) or not all(math.isfinite(float(value)) for value in [clicks, impressions, position or 0]) or not 0 <= clicks <= impressions:
                        raise ValueError('Invalid Google metrics or dimension shape')
                    key = str(keys[0])
                    values = {'key': key, 'clicks': int(clicks), 'impressions': int(impressions),
                              'ctr_pct': clicks / impressions * 100 if impressions else None, 'position': position}
                    if kind == 'query_page':
                        values.update(query=key, page=str(keys[1]))
                    unique = hashlib.sha256(json.dumps(keys).encode()).hexdigest()
                    self.db.add(Metric(tenant_id=self.site.tenant_id, site_id=self.site.id, batch_id=batch.id, dimension=kind, key=unique, data=values))
            batches[kind] = batch.id
        existing = self.db.scalar(select(ImportSet).where(ImportSet.site_id == self.site.id, ImportSet.digest == bundle))
        if not existing:
            self.db.add(ImportSet(tenant_id=self.site.tenant_id, site_id=self.site.id, digest=bundle, batches=batches,
                context={'source': 'official Google API', 'observed_start': str(start), 'observed_end': str(end), 'freshness': 'final data requested',
                         'filters': {'type': 'web'}, 'limits': 'Maximum 5,000 rows per dimension; anonymized/top-row omissions still possible'}))
        return {'start': str(start), 'end': str(end), 'groups': {kind: {'rows': len(rows), **metadata} for kind, (rows, metadata) in groups.items()}}

    def inspect(self, url):
        url = canonical_url(url)
        if urlsplit(url).hostname != urlsplit(self.site.base_url).hostname or not self.site.property_url:
            raise ValueError('Inspect only a URL on the selected authorized website')
        result = self.call('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
                           {'inspectionUrl': url, 'siteUrl': self.site.property_url, 'languageCode': 'en-US'}, provider='inspection')
        self.db.add(Evidence(tenant_id=self.site.tenant_id, site_id=self.site.id, kind='indexing', title='Official URL inspection', data={'url': url, 'result': result}))
        return result

    def sitemaps(self):
        if not self.site.property_url:
            raise ValueError('Select a property first')
        return self.call('GET', 'https://www.googleapis.com/webmasters/v3/sites/' + quote(self.site.property_url, safe='') + '/sitemaps')

    def submit_sitemap(self, url, approval):
        url = canonical_url(url)
        if approval != 'submit sitemap' or not self.config.get('allow_sitemap_write') or WRITE_SCOPE not in self.config.get('scope', '').split():
            raise ValueError('Explicit owner approval and a separately authorized write scope are required')
        parsed = urlsplit(url)
        if parsed.hostname != urlsplit(self.site.base_url).hostname or parsed.scheme != 'https' or not parsed.path.endswith('.xml') or parsed.query:
            raise ValueError('Select an HTTPS XML sitemap on the current website')
        result = self.call('PUT', 'https://www.googleapis.com/webmasters/v3/sites/' + quote(self.site.property_url, safe='') + '/sitemaps/' + quote(url, safe=''))
        audit(self.db, self.site.tenant_id, 'sitemap_submission', self.site.id)
        return result

    def analytics(self):
        prop = self.config.get('analytics_property', '')
        if not prop:
            raise ValueError('A GA4 property is not configured; manual GA4 CSV import remains available')
        result = self.call('POST', 'https://analyticsdata.googleapis.com/v1beta/' + prop + ':runReport',
            {'dateRanges': [{'startDate': '28daysAgo', 'endDate': 'yesterday'}],
             'dimensions': [{'name': 'date'}, {'name': 'sessionSourceMedium'}],
             'metrics': [{'name': 'sessions'}, {'name': 'engagedSessions'}, {'name': 'keyEvents'}], 'limit': 1000,
             'returnPropertyQuota': True}, provider='ga4')
        self.db.add(Evidence(tenant_id=self.site.tenant_id, site_id=self.site.id, kind='ga4', title='Official GA4 source/session report',
            data={'result': result, 'limits': 'First 1,000 rows; no lead-quality assumption; key event configuration requires property review'}))
        return {'rows': len(result.get('rows', [])), 'propertyQuota': result.get('propertyQuota')}

    def close(self):
        self.client.close()
