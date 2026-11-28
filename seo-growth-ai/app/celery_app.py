"""Optional standard/advanced execution using local Valkey; lightweight needs no broker."""
import os
from urllib.parse import urlsplit

from celery import Celery

broker = os.environ.get('SEO_BROKER_URL', 'redis://127.0.0.1:56379/0')
if urlsplit(broker).hostname not in ('127.0.0.1', 'localhost', '::1'):
    raise ValueError('Only local Valkey is permitted')
app = Celery('local_seo', broker=broker)
app.conf.update(timezone='Asia/Kolkata', enable_utc=True, worker_concurrency=1, task_acks_late=True,
                broker_connection_retry_on_startup=True, task_serializer='json', accept_content=['json'],
                beat_schedule={'durable-scheduler-and-worker': {'task': 'local_seo.tick', 'schedule': 10, 'options': {'expires': 15}}})


@app.task(name='local_seo.tick', ignore_result=True)
def tick():
    from .config import Settings
    from .db import database
    from .scheduling import enqueue_due
    from .worker import pump
    settings = Settings()
    engine, sessions = database(settings)
    try:
        with sessions.begin() as db:
            enqueue_due(db)
        pump(sessions, settings)
    finally:
        engine.dispose()
