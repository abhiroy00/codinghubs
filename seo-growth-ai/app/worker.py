import json
import logging
import os
import time

from sqlalchemy import and_, or_, select, update

os.environ['LANGSMITH_TRACING'] = 'false'
os.environ['LANGCHAIN_TRACING_V2'] = 'false'

from .config import Settings
from .db import database
from .models import Job, Site
from .security import Secrets, audit

logger = logging.getLogger('local_seo.worker')


def pump(sessions, settings):
    with sessions() as db:
        now = time.time()
        eligible = or_(and_(Job.status.in_(['queued', 'waiting_quota']), Job.not_before <= now),
                       and_(Job.status == 'running', Job.heartbeat < now - 300))
        job = db.scalar(select(Job).where(eligible).order_by(Job.created_at).limit(1))
        if not job:
            return False
        claimed = db.execute(update(Job).where(Job.id == job.id, eligible).values(status='running', heartbeat=now, error='')).rowcount
        db.commit()
        if not claimed:
            return False
        job_id, kind = job.id, job.kind
    try:
        if kind == 'crawl':
            from .crawler import run_crawl
            result = run_crawl(sessions, job_id, settings)
        elif kind == 'analyze':
            from .agents import run_agents
            result = run_agents(sessions, job_id, settings)
        else:
            with sessions() as db:
                job = db.get(Job, job_id)
                site = db.get(Site, job.site_id)
                if not site or site.tenant_id != job.tenant_id:
                    raise ValueError('Invalid job scope')
                if kind == 'draft':
                    from .knowledge import LocalAI, search
                    local = LocalAI(settings)
                    try:
                        context = search(db, site, settings, job.params['task'])
                        result = local.draft(db, site, job.params['task'], json.dumps(context['results']))
                    finally:
                        local.close()
                elif kind == 'embed':
                    from .knowledge import index_documents
                    result = index_documents(db, site, settings)
                elif kind == 'sync':
                    from .google import Google
                    google = Google(db, site, Secrets(settings.state_dir))
                    try:
                        result = {'gsc': google.sync(job.params.get('days', 28))}
                        if google.config.get('analytics_property'):
                            result['ga4'] = google.analytics()
                        else:
                            result['ga4'] = {'status': 'blocked', 'reason': 'No GA4 property configured'}
                    finally:
                        google.close()
                elif kind == 'mobile':
                    from .mobile import mobile_audit
                    result = mobile_audit(db, site, job, settings)
                else:
                    raise ValueError('Unsupported local job kind')
                db.commit()
        with sessions.begin() as db:
            job = db.get(Job, job_id)
            if job.status == 'running':
                job.status, job.result, job.heartbeat = 'completed', result, time.time()
                audit(db, job.tenant_id, 'job_completed', job.id, kind=kind)
                if kind == 'crawl' and job.params.get('cadence') == 'weekly':
                    db.add(Job(tenant_id=job.tenant_id, site_id=job.site_id, kind='analyze',
                               schedule_key='review-after:' + job.id, params={'cadence': 'weekly'}))
    except Exception as error:
        from .google import IntegrationPaused
        with sessions.begin() as db:
            job = db.get(Job, job_id)
            if job.status == 'running':
                if isinstance(error, IntegrationPaused):
                    job.status, job.not_before = 'waiting_quota', time.time() + 3600
                elif isinstance(error, ValueError) and any(word in str(error).lower() for word in ['missing', 'configure', 'authorize', 'select a']):
                    job.status = 'blocked'
                else:
                    job.status = 'failed'
                job.error = str(error)[:300] if isinstance(error, ValueError) else type(error).__name__ + ': operation failed safely'
                audit(db, job.tenant_id, 'job_' + job.status, job.id, kind=kind, reason=type(error).__name__)
        logger.warning(json.dumps({'event': 'job_failed_or_blocked', 'job_id': job_id, 'error_type': type(error).__name__}))
    return True


def main():
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    settings = Settings()
    engine, sessions = database(settings)
    last_tick = 0
    while True:
        try:
            if time.monotonic() - last_tick > 60:
                from .scheduling import enqueue_due
                with sessions.begin() as db:
                    count = len(enqueue_due(db))
                last_tick = time.monotonic()
                logger.info(json.dumps({'event': 'schedule_tick', 'queued': count, 'timezone': 'Asia/Kolkata'}))
            if not pump(sessions, settings):
                time.sleep(2)
        except KeyboardInterrupt:
            break
        except Exception as error:
            logger.error(json.dumps({'event': 'worker_error', 'error_type': type(error).__name__}))
            time.sleep(5)
    engine.dispose()


if __name__ == '__main__':
    main()
