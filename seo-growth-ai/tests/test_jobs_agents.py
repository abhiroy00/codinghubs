from datetime import datetime

from sqlalchemy import func, select

from app.agents import AGENTS
from app.config import Settings
from app.db import database, test_schema as create_schema
from app.imports import import_gsc
from app.models import Action, AgentResult, Job, Report, Schedule, Site, Tenant
from app.scheduling import TZ, enqueue_due, latest_slot
from app.worker import pump


def test_twenty_agents_generate_grounded_actions_without_any_ai_call(tmp_path, monkeypatch):
    settings = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'jobs.db'), ai_enabled=False)
    engine, sessions = database(settings)
    create_schema(engine)
    with sessions.begin() as db:
        tenant = Tenant(name='Workspace')
        db.add(tenant)
        db.flush()
        site = Site(tenant_id=tenant.id, name='Example', base_url='https://example.com/')
        db.add(site)
        db.flush()
        import_gsc(db, site, [('Chart.csv', b'Date,Clicks,Impressions,CTR,Position\n2026-11-26,2,200,1%,8\n'),
            ('Pages.csv', b'Top pages,Clicks,Impressions,CTR,Position\nhttps://example.com/guide,0,200,0%,8\n'),
            ('Queries.csv', b'Top queries,Clicks,Impressions,CTR,Position\npython tutorial,0,100,0%,8\n')], settings)
        job = Job(tenant_id=tenant.id, site_id=site.id, kind='analyze')
        db.add(job)
        db.flush()
        job_id = job.id
    import httpx
    def forbidden(*args, **kwargs):
        raise AssertionError('Deterministic agents must not invoke an AI or external API')
    monkeypatch.setattr(httpx.Client, 'request', forbidden)
    assert pump(sessions, settings)
    with sessions() as db:
        job = db.get(Job, job_id)
        assert job.status == 'completed', job.error
        assert len(job.result['agents']) == 20
        assert len(AGENTS) == db.scalar(select(func.count()).select_from(AgentResult))
        assert db.scalar(select(Action)).evidence['impressions'] >= 100
        assert db.scalar(select(Report)).data['totals']['clicks'] == 2
        assert len(db.scalar(select(Report)).data['agents']) == 20
        blocked = db.scalar(select(AgentResult).where(AgentResult.agent == 'Google Analytics'))
        assert blocked.status == 'blocked'
    engine.dispose()


def test_weekly_crawl_queues_a_single_persisted_review(local_workspace, monkeypatch):
    db, site, settings, sessions = local_workspace
    job = Job(tenant_id=site.tenant_id, site_id=site.id, kind='crawl', params={'cadence': 'weekly'})
    db.add(job)
    db.commit()
    import app.crawler as crawler
    monkeypatch.setattr(crawler, 'run_crawl', lambda *args, **kwargs: {'checked': 0, 'fixture': True})
    assert pump(sessions, settings)
    db.expire_all()
    followups = list(db.scalars(select(Job).where(Job.kind == 'analyze')))
    assert len(followups) == 1
    assert followups[0].params['cadence'] == 'weekly'


def test_schedule_catchup_is_coalesced_and_idempotent(tmp_path):
    settings = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'schedule.db'))
    engine, sessions = database(settings)
    create_schema(engine)
    with sessions.begin() as db:
        tenant = Tenant(name='Workspace')
        db.add(tenant)
        db.flush()
        site = Site(tenant_id=tenant.id, name='Example', base_url='https://example.com/')
        db.add(site)
        db.flush()
        schedule = Schedule(tenant_id=tenant.id, site_id=site.id, name='Morning', kind='analyze', hour=8,
                            created_at=datetime(2026, 11, 1, tzinfo=TZ).timestamp())
        db.add(schedule)
    now = datetime(2026, 11, 29, 10, tzinfo=TZ)
    with sessions.begin() as db:
        assert len(enqueue_due(db, now)) == 1
    with sessions.begin() as db:
        assert enqueue_due(db, now) == []
        assert db.scalar(select(func.count()).select_from(Job)) == 1
    engine.dispose()


def test_monthly_and_weekly_slots_respect_kolkata_and_creation_time():
    schedule = Schedule(cadence='monthly', hour=9, minute=30)
    assert latest_slot(schedule, datetime(2026, 12, 1, 8, tzinfo=TZ)).isoformat().startswith('2026-11-01T09:30')
    schedule.cadence = 'weekly'
    assert latest_slot(schedule, datetime(2026, 11, 29, 8, tzinfo=TZ)).weekday() == 0
