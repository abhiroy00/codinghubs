import pytest

from app.config import Settings
from app.db import database, test_schema as create_schema
from app.models import Site, Tenant


@pytest.fixture
def local_workspace(tmp_path):
    settings = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'workspace.db'))
    engine, sessions = database(settings)
    create_schema(engine)
    with sessions() as db:
        tenant = Tenant(name='First workspace')
        db.add(tenant)
        db.flush()
        site = Site(tenant_id=tenant.id, name='Example', base_url='https://example.com/')
        db.add(site)
        db.commit()
        yield db, site, settings, sessions
    engine.dispose()
