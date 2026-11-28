import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import Settings
from app.db import test_schema as create_schema
from app.main import create_app
from app.models import Tenant, User
from app.network import PublicTransport
from app.security import PASSWORDS, new_session


@pytest.fixture
def workspace_api(tmp_path, monkeypatch):
    settings = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'api.db'), trusted_hosts=['testserver'])
    app = create_app(settings)
    create_schema(app.state.engine)
    monkeypatch.setattr(PublicTransport, 'validate', staticmethod(lambda url: (str(url), ['93.184.215.14'])))
    with TestClient(app) as client:
        yield client, app


def setup(client):
    result = client.post('/api/auth/setup', json={'username': 'owner', 'password': 'a-local-test-password', 'workspace': 'First workspace'})
    assert result.status_code == 201, result.text
    return {'X-CSRF-Token': result.json()['csrf']}


def test_auth_cookie_csrf_origin_and_single_setup(workspace_api):
    client, _ = workspace_api
    assert client.get('/api/sites').status_code == 401
    headers = setup(client)
    assert client.get('/api/auth/setup').json() == {'required': False}
    assert client.post('/api/auth/setup', json={'username': 'second', 'password': 'a-local-test-password'}).status_code == 409
    body = {'name': 'Example', 'base_url': 'https://example.com/'}
    assert client.post('/api/sites', json=body).status_code == 403
    assert client.post('/api/sites', json=body, headers={**headers, 'Origin': 'https://attacker.example'}).status_code == 403
    created = client.post('/api/sites', json=body, headers=headers)
    assert created.status_code == 201
    assert len(client.get('/api/sites').json()) == 1
    assert client.get('/api/metrics').status_code == 401


def test_tenant_and_job_isolation(workspace_api):
    client, app = workspace_api
    headers = setup(client)
    first = client.post('/api/sites', json={'name': 'Example', 'base_url': 'https://example.com/'}, headers=headers).json()
    with app.state.sessions.begin() as db:
        other = Tenant(name='Second workspace')
        db.add(other)
        db.flush()
        user = User(tenant_id=other.id, username='other', password_hash=PASSWORDS.hash('other-local-password'))
        db.add(user)
        db.flush()
        token, session = new_session(db, user)
        other_headers = {'X-CSRF-Token': session.csrf}
    with TestClient(app) as other_client:
        other_client.cookies.set('seo_session', token)
        assert other_client.get('/api/sites').json() == []
        for path in ['summary', 'jobs', 'documents', 'actions', 'reports', 'repositories']:
            assert other_client.get(f'/api/sites/{first["id"]}/{path}').status_code == 404
        assert other_client.post(f'/api/sites/{first["id"]}/jobs', json={'kind': 'analyze'}, headers=other_headers).status_code == 404
        assert other_client.post('/api/backup', headers=other_headers).status_code == 403


def test_login_throttling_and_validation_do_not_echo_password(workspace_api):
    client, _ = workspace_api
    headers = setup(client)
    assert client.post('/api/auth/logout', headers=headers).status_code == 200
    for _ in range(5):
        assert client.post('/api/auth/login', json={'username': 'owner', 'password': 'wrong-local-password'}).status_code == 401
    assert client.post('/api/auth/login', json={'username': 'owner', 'password': 'wrong-local-password'}).status_code == 429
    result = client.post('/api/auth/login', json={'username': 'owner', 'password': 'short'})
    assert result.status_code == 422
    assert 'short' not in result.text


def test_job_controls_require_scope_and_preserve_state(workspace_api):
    client, _ = workspace_api
    headers = setup(client)
    site = client.post('/api/sites', json={'name': 'Example', 'base_url': 'https://example.com/'}, headers=headers).json()
    prefix = f'/api/sites/{site["id"]}'
    assert client.post(prefix + '/jobs', json={'kind': 'crawl'}, headers=headers).status_code == 422
    job = client.post(prefix + '/jobs', json={'kind': 'crawl', 'limit': 500, 'concurrency': 4, 'permitted_public_research': True}, headers=headers).json()
    for operation, status in [('pause', 'paused'), ('resume', 'queued'), ('cancel', 'cancelled')]:
        response = client.post(prefix + '/jobs/' + job['id'] + '/control', json={'operation': operation}, headers=headers)
        assert response.json()['status'] == status
    assert client.post(prefix + '/jobs/' + job['id'] + '/control', json={'operation': 'resume'}, headers=headers).status_code == 409


def test_viewer_cannot_write(workspace_api):
    client, app = workspace_api
    setup(client)
    with app.state.sessions.begin() as db:
        user = db.scalar(select(User))
        user.role = 'viewer'
    result = client.get('/api/auth/session').json()
    assert client.post('/api/sites', json={'name': 'Example', 'base_url': 'https://example.com/'}, headers={'X-CSRF-Token': result['csrf']}).status_code == 403


def test_password_change_checks_current_password_and_revokes_other_sessions(workspace_api):
    client, app = workspace_api
    headers = setup(client)
    with app.state.sessions.begin() as db:
        token, _ = new_session(db, db.scalar(select(User)))
    body = {'current_password': 'incorrect-local-password', 'new_password': 'new-local-test-password'}
    assert client.post('/api/auth/password', json=body, headers=headers).status_code == 403
    body['current_password'] = 'a-local-test-password'
    changed = client.post('/api/auth/password', json=body, headers=headers)
    assert changed.status_code == 200
    assert changed.json()['csrf'] != headers['X-CSRF-Token']
    with TestClient(app) as old_session:
        old_session.cookies.set('seo_session', token)
        assert old_session.get('/api/auth/session').status_code == 401
    assert client.get('/api/auth/session').status_code == 200


def test_mobile_screenshots_and_permission_are_scoped(workspace_api):
    client, _ = workspace_api
    headers = setup(client)
    site = client.post('/api/sites', json={'name': 'Example', 'base_url': 'https://example.com/'}, headers=headers).json()
    prefix = f'/api/sites/{site["id"]}'
    assert client.post(prefix + '/jobs', json={'kind': 'mobile'}, headers=headers).status_code == 422
    job = client.post(prefix + '/jobs', json={'kind': 'mobile', 'permitted_public_research': True}, headers=headers).json()
    assert client.get(prefix + '/jobs/' + job['id'] + '/screenshot').status_code == 404
