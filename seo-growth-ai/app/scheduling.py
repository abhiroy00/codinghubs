from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from .models import Job, Schedule

TZ = ZoneInfo('Asia/Kolkata')
DAILY = [('Sync available data', 'sync', 6), ('Keyword and CTR analysis', 'analyze', 7),
         ('Prioritized daily actions', 'analyze', 8), ('Important URL checks', 'crawl', 11),
         ('Content and internal links', 'analyze', 17), ('Daily report', 'analyze', 20)]


def initialize_schedules(db, site):
    for name, kind, hour in DAILY:
        db.add(Schedule(tenant_id=site.tenant_id, site_id=site.id, name=name, kind=kind, hour=hour,
                        enabled=site.kind == 'owned'))
    db.add(Schedule(tenant_id=site.tenant_id, site_id=site.id, name='Weekly crawl and growth review', kind='crawl', cadence='weekly', hour=9,
                    enabled=site.kind == 'owned'))
    db.add(Schedule(tenant_id=site.tenant_id, site_id=site.id, name='Monthly organic growth review', kind='analyze', cadence='monthly', hour=9, minute=30,
                    enabled=site.kind == 'owned'))


def latest_slot(schedule, now):
    now = now.astimezone(TZ)
    slot = now.replace(hour=schedule.hour, minute=schedule.minute, second=0, microsecond=0)
    if schedule.cadence == 'daily':
        if slot > now:
            slot -= timedelta(days=1)
    elif schedule.cadence == 'weekly':
        slot -= timedelta(days=slot.weekday())
        if slot > now:
            slot -= timedelta(days=7)
    elif schedule.cadence == 'monthly':
        slot = slot.replace(day=1)
        if slot > now:
            slot = (slot - timedelta(days=1)).replace(day=1)
    else:
        raise ValueError('Unknown schedule cadence')
    return slot


def enqueue_due(db, now=None):
    now = now or datetime.now(TZ)
    queued = []
    schedules = db.scalars(select(Schedule).where(Schedule.enabled.is_(True)).with_for_update(skip_locked=True)).all()
    for schedule in schedules:
        slot = latest_slot(schedule, now)
        if slot.timestamp() < schedule.created_at or slot.isoformat() == schedule.last_slot:
            continue
        key = schedule.id + ':' + slot.isoformat()
        if db.bind.dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import insert
        else:
            from sqlalchemy.dialects.sqlite import insert
        statement = insert(Job).values(tenant_id=schedule.tenant_id, site_id=schedule.site_id, kind=schedule.kind, status='queued',
            params={'schedule': schedule.name, 'cadence': schedule.cadence, 'limit': 5 if schedule.cadence == 'daily' else 30,
                    'permitted_public_research': True}, progress={}, result={}, error='', heartbeat=0, not_before=0, schedule_key=key)
        statement = statement.on_conflict_do_nothing(index_elements=['site_id', 'kind', 'schedule_key']).returning(Job.id)
        job_id = db.scalar(statement)
        if job_id:
            queued.append(job_id)
        schedule.last_slot = slot.isoformat()
    return queued
