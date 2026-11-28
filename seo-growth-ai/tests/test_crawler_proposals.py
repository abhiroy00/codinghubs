import hashlib
import subprocess

import httpx
import pytest
from sqlalchemy import func, select

from app.analytics import technical_analysis
from app.crawler import analyze_html, run_crawl, safe_link
from app.models import Frontier, Job, Page, PageVersion
from app.network import PublicTransport, PublicWeb
from app.proposals import apply_proposal, create_proposal, file_target, git, register_repository, rollback_proposal, test_proposal as check_proposal


def test_dns_pin_and_sni_use_validated_address(monkeypatch):
    transport = PublicTransport()
    monkeypatch.setattr(PublicTransport, 'validate', staticmethod(lambda url: (str(url), ['93.184.215.14'])))
    requests = []
    class Wire(httpx.BaseTransport):
        def handle_request(self, request):
            requests.append(request)
            return httpx.Response(200, content=b'ok')
    transport.transport = Wire()
    with httpx.Client(transport=transport) as client:
        client.get('https://example.com/')
    assert requests[0].url.host == '93.184.215.14'
    assert requests[0].headers['host'] == 'example.com'
    assert requests[0].extensions['sni_hostname'] == 'example.com'


def test_redirect_to_private_network_is_never_requested():
    calls = []
    def redirect(request):
        calls.append(str(request.url))
        return httpx.Response(302, headers={'Location': 'http://169.254.169.254/latest/meta-data/'})
    web = PublicWeb(httpx.MockTransport(redirect))
    with pytest.raises(ValueError):
        web.get('https://example.com/', origin='https://example.com/')
    assert calls == ['https://example.com/']


def test_bounded_crawl_respects_robots_keeps_history_and_detects_broken_links(local_workspace):
    db, site, settings, sessions = local_workspace
    job = Job(tenant_id=site.tenant_id, site_id=site.id, kind='crawl', status='running', params={'limit': 10, 'incremental': True})
    db.add(job)
    db.commit()
    calls = []
    root = '<html><head><title>Example</title><link rel="canonical" href="https://example.com/"></head><body><main><h1>Guide</h1><p>A useful source answer.</p><a href="/alpha">Next</a><a href="/missing">Missing</a><a href="/private">Private</a><a href="/api/views">API</a></main></body></html>'
    def respond(request):
        path = request.url.path
        calls.append(path)
        if path == '/robots.txt':
            return httpx.Response(200, text='User-agent: *\nDisallow: /private\nSitemap: https://example.com/sitemap.xml')
        if path == '/sitemap.xml':
            return httpx.Response(200, text='<urlset><url><loc>https://example.com/alpha</loc></url><url><loc>https://example.com/private</loc></url></urlset>')
        if path == '/missing':
            return httpx.Response(404, text='<h1>Not found</h1>')
        return httpx.Response(200, text=root)
    result = run_crawl(sessions, job.id, settings, PublicWeb(httpx.MockTransport(respond)))
    db.expire_all()
    assert result['checked'] <= 10
    assert '/private' not in calls and '/api/views' not in calls
    assert db.scalar(select(func.count()).select_from(Page)) == 3
    assert db.scalar(select(func.count()).select_from(PageVersion)) == 3
    assert db.scalar(select(Frontier).where(Frontier.url == 'https://example.com/private')).status == 'blocked'
    assert technical_analysis(db, site)['broken_internal_links']


def test_nonpublic_links_and_json_ld_errors_are_data():
    assert safe_link('https://example.com/', 'javascript:alert(1)') is None
    assert safe_link('https://example.com/', 'http://127.0.0.1/') is None
    response = {'status': 200, 'url': 'https://example.com/', 'headers': {}, 'redirects': [],
                'text': '<title>Test</title><script type="application/ld+json">invalid</script><main><h1>One</h1><h1>Two</h1></main>'}
    analyzed = analyze_html('https://example.com/', response)
    assert len(analyzed['details']['h1']) == 2
    assert analyzed['details']['schema_errors']


@pytest.fixture
def repository(local_workspace, tmp_path):
    db, site, settings, _ = local_workspace
    root = tmp_path / 'repo'
    root.mkdir()
    for args in [['init'], ['config', 'user.email', 'test@example.invalid'], ['config', 'user.name', 'Local Test'], ['config', 'core.whitespace', 'cr-at-eol']]:
        subprocess.run(['git', '-C', str(root), *args], check=True, capture_output=True)
    (root / 'page.html').write_bytes(b'<title>Old title</title>\r\n<h1>Original source</h1>\r\n')
    git(root, 'add', 'page.html')
    git(root, 'commit', '-m', 'Initial test source')
    settings.repo_roots = [str(root)]
    registered = register_repository(db, site, settings, root)
    db.commit()
    return db, site, registered, root


def test_proposal_requires_approval_and_preserves_crlf_then_rolls_back(repository):
    db, site, registered, root = repository
    original = (root / 'page.html').read_bytes()
    proposal = create_proposal(db, site, registered, 'page.html', hashlib.sha256(original).hexdigest(), 'Old title', 'Reviewed title')
    db.commit()
    assert (root / 'page.html').read_bytes() == original
    with pytest.raises(ValueError):
        apply_proposal(db, proposal, registered, 'apply local proposal')
    proposal.status = 'approved'
    apply_proposal(db, proposal, registered, 'apply local proposal')
    db.commit()
    assert b'\r\n' in (root / 'page.html').read_bytes()
    assert b'Reviewed title' in (root / 'page.html').read_bytes()
    assert check_proposal(proposal, registered)['status'] == 'passed'
    rollback_proposal(db, proposal, registered, 'rollback local proposal')
    db.commit()
    assert (root / 'page.html').read_bytes() == original
    assert git(root, 'status', '--porcelain') == ''


def test_dirty_or_stale_files_are_not_overwritten(repository):
    db, site, registered, root = repository
    original = (root / 'page.html').read_bytes()
    proposal = create_proposal(db, site, registered, 'page.html', hashlib.sha256(original).hexdigest(), 'Old title', 'Reviewed title')
    db.commit()
    proposal.status = 'approved'
    (root / 'user-work.md').write_text('Keep this unfinished work.')
    with pytest.raises(ValueError):
        apply_proposal(db, proposal, registered, 'apply local proposal')
    assert (root / 'user-work.md').read_text() == 'Keep this unfinished work.'
    assert (root / 'page.html').read_bytes() == original


@pytest.mark.parametrize('path', ['../outside.md', '.env', '.git/config', 'auth.ts', '/etc/passwd'])
def test_sensitive_or_external_file_paths_are_denied(repository, path):
    _, _, registered, _ = repository
    with pytest.raises(ValueError):
        file_target(registered, path)
