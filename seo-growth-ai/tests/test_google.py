import json
import time
from datetime import datetime
from urllib.parse import parse_qs, urlsplit
from zoneinfo import ZoneInfo

import httpx
import pytest
from sqlalchemy import select

from app.google import Google, IntegrationPaused, READ_SCOPE, authorization_url, configure, finish_oauth
from app.models import Connection, Quota, User
from app.security import PASSWORDS, Secrets, new_session


def configured(local_workspace):
    db, site, settings, _ = local_workspace
    vault = Secrets(settings.state_dir)
    connection = configure(db, site, vault, 'test.apps.googleusercontent.com', 'test-secret')
    cfg = vault.decrypt(connection.encrypted)
    cfg.update(access_token='test-token', expires_at=time.time() + 3600, scope=READ_SCOPE)
    connection.encrypted = vault.encrypt(cfg)
    db.commit()
    return db, site, settings, vault, connection


def test_oauth_pkce_state_session_binding_and_replay(local_workspace):
    db, site, settings, vault, connection = configured(local_workspace)
    user = User(tenant_id=site.tenant_id, username='owner', password_hash=PASSWORDS.hash('test-local-password'))
    db.add(user)
    db.flush()
    _, session = new_session(db, user)
    db.flush()
    url = authorization_url(db, site, user, session, vault, settings)
    db.commit()
    fields = parse_qs(urlsplit(url).query)
    assert fields['code_challenge_method'] == ['S256']
    assert 'code_verifier' not in url
    calls = []
    def exchange(request):
        calls.append(request)
        assert request.url == 'https://oauth2.googleapis.com/token'
        assert 'code_verifier=' in request.content.decode()
        return httpx.Response(200, json={'access_token': 'new-local-token', 'refresh_token': 'private-refresh-token', 'expires_in': 3600, 'scope': READ_SCOPE})
    client = httpx.Client(transport=httpx.MockTransport(exchange))
    assert finish_oauth(db, fields['state'][0], 'auth-code', vault, settings, client) == site.id
    db.commit()
    assert 'private-refresh-token' not in connection.encrypted
    with pytest.raises(ValueError):
        finish_oauth(db, fields['state'][0], 'auth-code', vault, settings, client)
    assert len(calls) == 1


def test_exhausted_local_quota_pauses_before_network(local_workspace):
    db, site, _, vault, connection = configured(local_workspace)
    today = datetime.now(ZoneInfo('America/Los_Angeles')).date().isoformat()
    db.add(Quota(tenant_id=site.tenant_id, site_id=site.id, provider='gsc', window=today, count=200))
    db.commit()
    def forbidden(request):
        raise AssertionError('No request is allowed beyond the free quota')
    client = Google(db, site, vault, httpx.Client(transport=httpx.MockTransport(forbidden)))
    with pytest.raises(IntegrationPaused):
        client.properties()
    assert connection.paused_until > time.time()
    db.expire_all()
    assert db.scalar(select(Connection)).paused_until > time.time()


def test_google_429_is_persisted_and_never_falls_back_to_paid(local_workspace):
    db, site, _, vault, connection = configured(local_workspace)
    calls = []
    def limited(request):
        calls.append(str(request.url))
        return httpx.Response(429, headers={'Retry-After': '120'}, json={'error': 'quota'})
    google = Google(db, site, vault, httpx.Client(transport=httpx.MockTransport(limited)))
    with pytest.raises(IntegrationPaused):
        google.properties()
    assert len(calls) == 1
    assert connection.paused_until >= time.time() + 110
    with pytest.raises(IntegrationPaused):
        google.properties()
    assert len(calls) == 1


def test_sitemap_submission_requires_separate_explicit_scope_and_approval(local_workspace):
    db, site, _, vault, _ = configured(local_workspace)
    google = Google(db, site, vault, httpx.Client(transport=httpx.MockTransport(lambda request: pytest.fail('No write should occur'))))
    with pytest.raises(ValueError):
        google.submit_sitemap('https://example.com/sitemap.xml', 'submit sitemap')


@pytest.mark.parametrize('url', ['https://api.openai.com/v1/chat/completions', 'https://www.googleapis.com/generative-language/v1/models'])
def test_non_free_or_unrelated_google_endpoints_are_rejected(local_workspace, url):
    db, site, _, vault, _ = configured(local_workspace)
    google = Google(db, site, vault, httpx.Client(transport=httpx.MockTransport(lambda request: pytest.fail('Unrelated API must not be called'))))
    with pytest.raises(ValueError):
        google.call('POST', url, {})


def test_search_console_pagination_has_a_hard_cap_and_final_dates(local_workspace):
    db, site, _, vault, _ = configured(local_workspace)
    site.property_url = 'https://example.com/'
    starts = []
    def response(request):
        payload = json.loads(request.content)
        starts.append(payload['startRow'])
        assert payload['dataState'] == 'final'
        return httpx.Response(200, json={'rows': [{'keys': ['query'], 'clicks': 0, 'impressions': 1, 'position': 9}] * 1000})
    google = Google(db, site, vault, httpx.Client(transport=httpx.MockTransport(response)))
    rows, meta = google.search_rows('2026-10-30', '2026-11-26', ['query'])
    assert starts == [0, 1000, 2000, 3000, 4000]
    assert len(rows) == 5000 and meta['local_row_cap_reached'] is True
