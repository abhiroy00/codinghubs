"""Explicit isolated browser-test host. Fixtures never run in the normal native launcher."""
import os
import sys
import tempfile
import threading
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    import httpx
    import uvicorn
    from alembic import command
    from alembic.config import Config
    from app.config import Settings
    from app.main import create_app
    from app.network import PublicTransport, PublicWeb
    from app.worker import pump
    import app.crawler as crawler
    temporary = tempfile.TemporaryDirectory(prefix='seo-browser-tests-')
    state = Path(temporary.name)
    settings = Settings(state_dir=state, database_url='sqlite:///' + str(state / 'test.db'), ai_enabled=False,
                        origins=['http://127.0.0.1:8766'], trusted_hosts=['127.0.0.1', 'localhost'])
    os.environ['SEO_DATABASE_URL'] = settings.database_url
    os.environ['SEO_STATE_DIR'] = str(state)
    configuration = Config(str(ROOT / 'alembic.ini'))
    configuration.set_main_option('script_location', str(ROOT / 'migrations'))
    command.upgrade(configuration, 'head')
    app = create_app(settings)
    original = app.router.lifespan_context
    stopped = threading.Event()
    def work():
        while not stopped.is_set():
            pump(app.state.sessions, settings)
            stopped.wait(.2)
    @asynccontextmanager
    async def lifespan(application):
        async with original(application):
            thread = threading.Thread(target=work, daemon=True)
            thread.start()
            yield
            stopped.set()
            thread.join(timeout=5)
    app.router.lifespan_context = lifespan
    # Test-only public-web adapter. Normal app has no switch that enables private fetching.
    PublicTransport.validate = staticmethod(lambda url: (str(url), ['93.184.215.14']))
    def public_fixture(request):
        if request.url.path == '/robots.txt':
            return httpx.Response(200, text='User-agent: *\nAllow: /')
        if request.url.path == '/sitemap.xml':
            return httpx.Response(404, text='Not supplied')
        return httpx.Response(200, text='<html><head><title>Reference guide</title><meta name="description" content="A controlled source fixture"><link rel="canonical" href="https://example.test/"></head><body><main><h1>Retrieval guide</h1><p>Retrieval uses source documents and abstains when the evidence is missing.</p></main></body></html>')
    crawler.PublicWeb = lambda: PublicWeb(httpx.MockTransport(public_fixture))
    try:
        uvicorn.run(app, host='127.0.0.1', port=8766, access_log=False, log_level='warning')
    finally:
        app.state.engine.dispose()
        temporary.cleanup()


if __name__ == '__main__':
    main()
