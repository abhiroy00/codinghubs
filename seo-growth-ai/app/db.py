from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from .models import Base


def database(settings):
    args = {'check_same_thread': False} if settings.database_url.startswith('sqlite') else {}
    engine = create_engine(settings.database_url, connect_args=args, pool_pre_ping=True)
    if engine.dialect.name == 'sqlite':
        @event.listens_for(engine, 'connect')
        def sqlite_options(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
            connection.execute('PRAGMA journal_mode=WAL')
            connection.execute('PRAGMA busy_timeout=5000')
    return engine, sessionmaker(engine, expire_on_commit=False)


def scoped(db, model, tenant, site=None):
    from sqlalchemy import select
    statement = select(model).where(model.tenant_id == tenant)
    if site is not None:
        statement = statement.where(model.site_id == site)
    return statement


def test_schema(engine):
    """Tests only; production initialization uses Alembic migrations."""
    Base.metadata.create_all(engine)
