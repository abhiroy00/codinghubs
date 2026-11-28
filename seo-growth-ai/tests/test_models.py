from sqlalchemy import select

from app.config import Settings
from app.db import database, test_schema as create_schema
from app.models import Site, Tenant, User


def test_restart_preserves_local_sites(tmp_path):
    config = Settings(state_dir=tmp_path, database_url='sqlite:///' + str(tmp_path / 'test.db'))
    engine, sessions = database(config)
    create_schema(engine)
    with sessions.begin() as db:
        tenant = Tenant(name='Owner')
        db.add(tenant)
        db.flush()
        db.add(User(tenant_id=tenant.id, username='owner', password_hash='test-only'))
        db.add(Site(tenant_id=tenant.id, name='Example', base_url='https://example.com/'))
    engine.dispose()
    engine, sessions = database(config)
    with sessions() as db:
        assert db.scalar(select(Site)).name == 'Example'
    engine.dispose()
