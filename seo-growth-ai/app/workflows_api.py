import hashlib
import json
import secrets
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import Field
from sqlalchemy import select

from .analytics import keyword_analysis, summary, technical_analysis
from .chatgpt import RecommendationBundle, export_prompt, import_recommendations
from .db import scoped
from .main import StrictModel, get_db, reader, writer
from .models import Action, AgentResult, Audit, Document, Job, Notification, Page, Proposal, Quota, Report, Repository, Schedule, User
from .security import audit, current_user, owned_site, require_owner, scoped_object

router = APIRouter(prefix='/api')
DB = Depends(get_db, scope='function')


class JobInput(StrictModel):
    kind: Literal['crawl', 'analyze', 'sync', 'draft', 'embed', 'mobile']
    limit: int = Field(default=30, ge=1, le=500)
    concurrency: int = Field(default=1, ge=1, le=4)
    incremental: bool = True
    permitted_public_research: bool = False
    task: str = Field(default='', max_length=2000)
    days: int = Field(default=28, ge=7, le=90)


class Control(StrictModel):
    operation: Literal['pause', 'resume', 'cancel']


class ActionState(StrictModel):
    status: Literal['open', 'reviewed', 'dismissed', 'done']


class DocumentInput(StrictModel):
    title: str = Field(min_length=2, max_length=200)
    source: str = Field(min_length=2, max_length=2000)
    text: str = Field(min_length=10, max_length=100000)
    verified: bool = False


class SearchInput(StrictModel):
    query: str = Field(min_length=2, max_length=1000)


class ExportInput(StrictModel):
    task: str = Field(default='Review the highest-value evidence-backed SEO actions.', min_length=5, max_length=2000)
    page_id: str | None = Field(default=None, max_length=32)


class GoogleConfig(StrictModel):
    client_id: str = Field(min_length=10, max_length=200)
    client_secret: str = Field(min_length=5, max_length=300)
    analytics_property: str = Field(default='', max_length=100)
    allow_sitemap_write: bool = False


class PropertyInput(StrictModel):
    property_url: str = Field(min_length=5, max_length=500)


class URLInput(StrictModel):
    url: str = Field(max_length=2000)
    approval: str = Field(default='', max_length=50)


class ScheduleInput(StrictModel):
    enabled: bool
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)


class FileInput(StrictModel):
    repository_id: str = Field(max_length=32)
    path: str = Field(min_length=1, max_length=500)
    before_hash: str = Field(pattern='^[a-f0-9]{64}$')
    old_text: str = Field(min_length=1, max_length=20000)
    new_text: str = Field(max_length=50000)


class Approval(StrictModel):
    operation: Literal['approve', 'apply', 'test', 'rollback']
    approval: str = Field(default='', max_length=80)


def job_view(job):
    return {'id': job.id, 'kind': job.kind, 'status': job.status, 'created_at': job.created_at, 'heartbeat': job.heartbeat,
            'progress': job.progress, 'result': job.result, 'error': job.error, 'not_before': job.not_before}


@router.get('/system')
def system(request: Request, user=Depends(reader), db=DB):
    from .knowledge import LocalAI
    from .operations import resource_snapshot
    client = LocalAI(request.app.state.settings)
    try:
        ai = client.status()
    finally:
        client.close()
    return {**resource_snapshot(db, request.app.state.settings, user.tenant_id), 'ai': ai,
            'scheduler': 'Local host only. Missed schedules coalesce into the latest due slot after restart; jobs do not run while powered off.'}


@router.get('/sites/{site_id}/summary')
def site_summary(site_id: str, user=Depends(reader), db=DB):
    return summary(db, owned_site(db, user, site_id))


@router.get('/sites/{site_id}/keywords')
def keywords(site_id: str, user=Depends(reader), db=DB):
    return keyword_analysis(db, owned_site(db, user, site_id))


@router.get('/sites/{site_id}/technical')
def technical(site_id: str, user=Depends(reader), db=DB):
    return technical_analysis(db, owned_site(db, user, site_id))


@router.get('/sites/{site_id}/actions')
def actions(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    records = db.scalars(scoped(db, Action, user.tenant_id, site_id).order_by(Action.score.desc()).limit(200))
    return [{'id': r.id, 'title': r.title, 'kind': r.kind, 'severity': r.severity, 'score': r.score, 'confidence': r.confidence, 'evidence': r.evidence, 'status': r.status} for r in records]


@router.post('/sites/{site_id}/actions/{action_id}')
def action_status(site_id: str, action_id: str, body: ActionState, user=Depends(writer), db=DB):
    owned_site(db, user, site_id)
    record = scoped_object(db, Action, user, action_id, site_id)
    record.status = body.status
    audit(db, user.tenant_id, 'action_reviewed', record.id, user=user.id, status=body.status)
    return {'status': record.status, 'limits': 'Review state only; no website modification'}


@router.get('/sites/{site_id}/jobs')
def jobs(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [job_view(j) for j in db.scalars(scoped(db, Job, user.tenant_id, site_id).order_by(Job.created_at.desc()).limit(50))]


@router.post('/sites/{site_id}/jobs', status_code=202)
def create_job(site_id: str, body: JobInput, request: Request, user=Depends(writer), db=DB):
    site = owned_site(db, user, site_id)
    settings = request.app.state.settings
    if body.kind in ('crawl', 'mobile') and not body.permitted_public_research:
        raise ValueError('Confirm permission for bounded public-page research before crawling')
    if body.kind == 'draft' and len(body.task.strip()) < 5:
        raise ValueError('Describe the content task')
    active = list(db.scalars(scoped(db, Job, user.tenant_id, site_id).where(Job.status.in_(['queued', 'running']))))
    if len(active) >= 5:
        raise HTTPException(429, 'Five jobs are already pending for this website')
    params = body.model_dump(exclude={'kind'})
    params['limit'] = min(body.limit, settings.limits['crawl_limit'])
    params['concurrency'] = min(body.concurrency, settings.limits['concurrency'])
    job = Job(tenant_id=site.tenant_id, site_id=site.id, kind=body.kind, params=params)
    db.add(job)
    db.flush()
    audit(db, user.tenant_id, 'job_created', job.id, user=user.id, kind=job.kind)
    return job_view(job)


@router.get('/sites/{site_id}/jobs/{job_id}/screenshot')
def mobile_screenshot(site_id: str, job_id: str, request: Request, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    job = scoped_object(db, Job, user, job_id, site_id)
    if job.kind != 'mobile' or job.status != 'completed':
        raise HTTPException(404, 'Completed mobile screenshot not found')
    path = request.app.state.settings.state_dir / 'mobile-results' / (job.id + '.png')
    if not path.is_file() or path.is_symlink():
        raise HTTPException(404, 'Screenshot not found')
    return FileResponse(path, media_type='image/png')


@router.post('/sites/{site_id}/jobs/{job_id}/control')
def control_job(site_id: str, job_id: str, body: Control, user=Depends(writer), db=DB):
    owned_site(db, user, site_id)
    job = scoped_object(db, Job, user, job_id, site_id)
    if body.operation == 'pause' and job.status in ('queued', 'running'):
        job.status = 'paused'
    elif body.operation == 'resume' and job.status in ('paused', 'blocked', 'failed', 'waiting_quota'):
        job.status, job.error = 'queued', ''
    elif body.operation == 'cancel' and job.status not in ('completed', 'cancelled'):
        job.status = 'cancelled'
    else:
        raise HTTPException(409, 'This state transition is unavailable')
    audit(db, user.tenant_id, 'job_control', job.id, user=user.id, status=job.status)
    return job_view(job)


@router.get('/sites/{site_id}/agents')
def agent_results(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    last = db.scalar(scoped(db, Job, user.tenant_id, site_id).where(Job.kind == 'analyze').order_by(Job.created_at.desc()))
    if not last:
        return []
    rows = db.scalars(scoped(db, AgentResult, user.tenant_id, site_id).where(AgentResult.job_id == last.id).order_by(AgentResult.created_at))
    return [{'agent': r.agent, 'status': r.status, 'summary': r.summary, 'evidence': r.evidence} for r in rows]


@router.get('/sites/{site_id}/pages')
def pages(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [{'id': p.id, 'url': p.url, 'title': p.title, 'status': p.status, 'robots': p.robots, 'canonical': p.canonical,
             'word_count': p.details.get('word_count'), 'checked_at': p.checked_at} for p in db.scalars(scoped(db, Page, user.tenant_id, site_id).order_by(Page.checked_at.desc()).limit(500))]


@router.get('/sites/{site_id}/documents')
def documents(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [{'id': d.id, 'title': d.title, 'source': d.source, 'verified': d.verified, 'active': d.active,
             'characters': len(d.text), 'version_hash': d.content_hash, 'created_at': d.created_at} for d in db.scalars(scoped(db, Document, user.tenant_id, site_id).order_by(Document.created_at.desc()).limit(200))]


@router.post('/sites/{site_id}/documents', status_code=201)
def add_document(site_id: str, body: DocumentInput, user=Depends(writer), db=DB):
    from .knowledge import ingest_document
    site = owned_site(db, user, site_id)
    if body.verified:
        require_owner(user)
    doc = ingest_document(db, site, body.source, body.title, body.text, body.verified)
    audit(db, user.tenant_id, 'document_ingested', doc.id, user=user.id)
    return {'id': doc.id, 'active': doc.active}


@router.post('/sites/{site_id}/knowledge/search')
def knowledge_search(site_id: str, body: SearchInput, request: Request, user=Depends(writer), db=DB):
    from .knowledge import search
    site = owned_site(db, user, site_id)
    return search(db, site, request.app.state.settings, body.query)


@router.post('/sites/{site_id}/chatgpt/export')
def chatgpt_export(site_id: str, body: ExportInput, user=Depends(writer), db=DB):
    return export_prompt(db, owned_site(db, user, site_id), body.task, body.page_id)


@router.post('/sites/{site_id}/chatgpt/import')
def chatgpt_import(site_id: str, body: RecommendationBundle, user=Depends(writer), db=DB):
    return import_recommendations(db, owned_site(db, user, site_id), body)


@router.get('/sites/{site_id}/reports')
def reports(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [{'id': r.id, 'kind': r.kind, 'created_at': r.created_at, 'data': r.data} for r in db.scalars(scoped(db, Report, user.tenant_id, site_id).order_by(Report.created_at.desc()).limit(30))]


@router.get('/sites/{site_id}/reports/{report_id}/download')
def download_report(site_id: str, report_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    report = scoped_object(db, Report, user, report_id, site_id)
    return Response(json.dumps(report.data, indent=2), media_type='application/json', headers={'Content-Disposition': f'attachment; filename="seo-report-{report.id}.json"'})


@router.get('/sites/{site_id}/schedules')
def schedules(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [{'id': s.id, 'name': s.name, 'kind': s.kind, 'cadence': s.cadence, 'hour': s.hour, 'minute': s.minute, 'enabled': s.enabled, 'last_slot': s.last_slot, 'timezone': 'Asia/Kolkata'} for s in db.scalars(scoped(db, Schedule, user.tenant_id, site_id).order_by(Schedule.hour))]


@router.post('/sites/{site_id}/schedules/{schedule_id}')
def update_schedule(site_id: str, schedule_id: str, body: ScheduleInput, user=Depends(writer), db=DB):
    owned_site(db, user, site_id)
    require_owner(user)
    schedule = scoped_object(db, Schedule, user, schedule_id, site_id)
    schedule.enabled, schedule.hour, schedule.minute = body.enabled, body.hour, body.minute
    audit(db, user.tenant_id, 'schedule_updated', schedule.id, user=user.id)
    return {'updated': True}


@router.get('/sites/{site_id}/notifications')
def notifications(site_id: str, user=Depends(reader), db=DB):
    owned_site(db, user, site_id)
    return [{'id': n.id, 'title': n.title, 'body': n.body, 'read': n.read, 'created_at': n.created_at} for n in db.scalars(scoped(db, Notification, user.tenant_id, site_id).order_by(Notification.created_at.desc()).limit(30))]


@router.get('/sites/{site_id}/google')
def google_status(site_id: str, request: Request, user=Depends(reader), db=DB):
    from .google import connection_for
    site = owned_site(db, user, site_id)
    connection = connection_for(db, site)
    return {'configured': bool(connection), 'status': connection.status if connection else 'not configured',
            'paused_until': connection.paused_until if connection else None, 'property_url': site.property_url,
            'redirect_uri': request.app.state.settings.google_redirect_uri,
            'quota_reservations': [{'provider': q.provider, 'window': q.window, 'count': q.count} for q in db.scalars(scoped(db, Quota, user.tenant_id, site_id).order_by(Quota.created_at.desc()).limit(20))]}


@router.post('/sites/{site_id}/google/config')
def google_config(site_id: str, body: GoogleConfig, request: Request, user=Depends(writer), db=DB):
    from .google import configure
    require_owner(user)
    configure(db, owned_site(db, user, site_id), request.app.state.secrets, **body.model_dump())
    audit(db, user.tenant_id, 'google_configured', site_id, user=user.id)
    return {'configured': True, 'secret_storage': 'Encrypted locally; secrets are never returned by the API'}


@router.post('/sites/{site_id}/google/authorize')
def google_authorize(site_id: str, request: Request, user=Depends(writer), db=DB):
    from .google import authorization_url
    require_owner(user)
    _, session = current_user(request, db, write=True)
    return {'url': authorization_url(db, owned_site(db, user, site_id), user, session, request.app.state.secrets, request.app.state.settings)}


@router.get('/google/callback', response_class=HTMLResponse)
def google_callback(request: Request, state: str = '', code: str = '', error: str = '', db=DB):
    from .google import finish_oauth
    if error or not state or not code or len(state) > 200 or len(code) > 10000:
        raise ValueError('Google consent was not completed. Start a new connection from your workspace.')
    finish_oauth(db, state, code, request.app.state.secrets, request.app.state.settings)
    return '<h1>Google connected</h1><p>Close this tab and return to your local SEO workspace. No subscription or paid provider was activated.</p><a href="/">Return to workspace</a>'


@router.get('/sites/{site_id}/google/properties')
def google_properties(site_id: str, request: Request, user=Depends(reader), db=DB):
    from .google import Google
    client = Google(db, owned_site(db, user, site_id), request.app.state.secrets)
    try:
        return client.properties()
    finally:
        client.close()


@router.post('/sites/{site_id}/google/property')
def select_property(site_id: str, body: PropertyInput, request: Request, user=Depends(writer), db=DB):
    from urllib.parse import urlsplit
    from .google import Google
    require_owner(user)
    site = owned_site(db, user, site_id)
    client = Google(db, site, request.app.state.secrets)
    try:
        options = client.properties()
        if body.property_url not in [r.get('siteUrl') for r in options]:
            raise ValueError('Select one of the properties authorized by Google')
        host = urlsplit(site.base_url).hostname
        if body.property_url.startswith('sc-domain:'):
            domain = body.property_url.removeprefix('sc-domain:')
            valid = host == domain or host.endswith('.' + domain)
        else:
            valid = site.base_url.startswith(body.property_url)
        if not valid:
            raise ValueError('Property does not cover the selected website')
        site.property_url = body.property_url
        return {'selected': site.property_url}
    finally:
        client.close()


@router.post('/sites/{site_id}/google/inspect')
def inspect_url(site_id: str, body: URLInput, request: Request, user=Depends(writer), db=DB):
    from .google import Google
    client = Google(db, owned_site(db, user, site_id), request.app.state.secrets)
    try:
        return client.inspect(body.url)
    finally:
        client.close()


@router.get('/sites/{site_id}/google/sitemaps')
def sitemaps(site_id: str, request: Request, user=Depends(reader), db=DB):
    from .google import Google
    client = Google(db, owned_site(db, user, site_id), request.app.state.secrets)
    try:
        return client.sitemaps()
    finally:
        client.close()


@router.post('/sites/{site_id}/google/sitemaps')
def submit_sitemap(site_id: str, body: URLInput, request: Request, user=Depends(writer), db=DB):
    from .google import Google
    require_owner(user)
    client = Google(db, owned_site(db, user, site_id), request.app.state.secrets)
    try:
        return client.submit_sitemap(body.url, body.approval)
    finally:
        client.close()


@router.get('/sites/{site_id}/repositories')
def repositories(site_id: str, user=Depends(reader), db=DB):
    from .proposals import detect_framework
    require_owner(user)
    owned_site(db, user, site_id)
    return [{'id': r.id, 'name': r.name, 'frameworks': detect_framework(r)} for r in db.scalars(scoped(db, Repository, user.tenant_id, site_id))]


@router.get('/sites/{site_id}/repositories/{repository_id}/file')
def source_file(site_id: str, repository_id: str, path: str, user=Depends(reader), db=DB):
    from .proposals import file_target
    require_owner(user)
    owned_site(db, user, site_id)
    repository = scoped_object(db, Repository, user, repository_id, site_id)
    _, content = file_target(repository, path)
    return {'path': path, 'content': content, 'hash': hashlib.sha256(content.encode()).hexdigest()}


@router.get('/sites/{site_id}/proposals')
def proposals(site_id: str, user=Depends(reader), db=DB):
    require_owner(user)
    owned_site(db, user, site_id)
    return [{'id': p.id, 'path': p.path, 'diff': p.diff, 'status': p.status, 'branch': p.branch, 'results': p.results} for p in db.scalars(scoped(db, Proposal, user.tenant_id, site_id).order_by(Proposal.created_at.desc()).limit(30))]


@router.post('/sites/{site_id}/proposals', status_code=201)
def proposal_create(site_id: str, body: FileInput, user=Depends(writer), db=DB):
    from .proposals import create_proposal
    require_owner(user)
    site = owned_site(db, user, site_id)
    repository = scoped_object(db, Repository, user, body.repository_id, site_id)
    item = create_proposal(db, site, repository, body.path, body.before_hash, body.old_text, body.new_text)
    return {'id': item.id, 'diff': item.diff, 'status': item.status}


@router.post('/sites/{site_id}/proposals/{proposal_id}')
def proposal_operation(site_id: str, proposal_id: str, body: Approval, user=Depends(writer), db=DB):
    from .proposals import apply_proposal, rollback_proposal, test_proposal
    require_owner(user)
    owned_site(db, user, site_id)
    proposal = scoped_object(db, Proposal, user, proposal_id, site_id)
    repository = scoped_object(db, Repository, user, proposal.results['repository_id'], site_id)
    if body.operation == 'approve':
        if proposal.status != 'pending' or body.approval != 'approve local diff':
            raise ValueError('Review the concrete diff and approve it explicitly')
        proposal.status = 'approved'
        audit(db, user.tenant_id, 'proposal_approved', proposal.id, user=user.id)
    elif body.operation == 'apply':
        apply_proposal(db, proposal, repository, body.approval)
    elif body.operation == 'test':
        proposal.results = {**proposal.results, 'checks': test_proposal(proposal, repository)}
    elif body.operation == 'rollback':
        rollback_proposal(db, proposal, repository, body.approval)
    return {'status': proposal.status, 'branch': proposal.branch, 'results': proposal.results}


@router.get('/audit')
def audit_events(user=Depends(reader), db=DB):
    return [{'event': a.event, 'target': a.target, 'details': a.details, 'created_at': a.created_at} for a in db.scalars(select(Audit).where(Audit.tenant_id == user.tenant_id).order_by(Audit.created_at.desc()).limit(100))]


@router.post('/backup')
def local_backup(request: Request, user=Depends(writer), db=DB):
    from .operations import backup
    require_owner(user)
    if db.scalar(select(User.id).order_by(User.created_at).limit(1)) != user.id:
        raise HTTPException(403, 'Whole-database backup is restricted to the initial local administrator')
    audit(db, user.tenant_id, 'local_backup_started', user=user.id)
    db.commit()
    return backup(request.app.state.settings)


@router.get('/metrics')
def private_metrics(request: Request, db=DB):
    from .operations import metrics_token, prometheus_metrics
    expected = 'Bearer ' + metrics_token(request.app.state.settings)
    if not secrets.compare_digest(request.headers.get('Authorization', ''), expected):
        raise HTTPException(401, 'A local monitoring credential is required')
    return Response(prometheus_metrics(db, request.app.state.settings), media_type='text/plain')
