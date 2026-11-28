import time
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def uid():
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class Entity:
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    created_at: Mapped[float] = mapped_column(Float, default=time.time)


class Tenant(Entity, Base):
    __tablename__ = 'tenants'
    name: Mapped[str] = mapped_column(String(120))


class User(Entity, Base):
    __tablename__ = 'users'
    tenant_id: Mapped[str] = mapped_column(ForeignKey('tenants.id'), index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default='owner')


class Session(Entity, Base):
    __tablename__ = 'sessions'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    csrf: Mapped[str] = mapped_column(String(80))
    expires_at: Mapped[float] = mapped_column(Float)


class Site(Entity, Base):
    __tablename__ = 'sites'
    __table_args__ = (UniqueConstraint('tenant_id', 'base_url'),)
    tenant_id: Mapped[str] = mapped_column(ForeignKey('tenants.id'), index=True)
    name: Mapped[str] = mapped_column(String(120))
    base_url: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20), default='owned')
    property_url: Mapped[str] = mapped_column(String(500), default='')


class Scoped(Entity):
    tenant_id: Mapped[str] = mapped_column(String(32), index=True)
    site_id: Mapped[str] = mapped_column(ForeignKey('sites.id'), index=True)


class ImportBatch(Scoped, Base):
    __tablename__ = 'imports'
    __table_args__ = (UniqueConstraint('site_id', 'digest', 'kind'),)
    digest: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(40))
    filename: Mapped[str] = mapped_column(String(200))
    rows: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class ImportSet(Scoped, Base):
    __tablename__ = 'import_sets'
    __table_args__ = (UniqueConstraint('site_id', 'digest'),)
    digest: Mapped[str] = mapped_column(String(64))
    batches: Mapped[dict] = mapped_column(JSON)
    context: Mapped[dict] = mapped_column(JSON)


class Metric(Scoped, Base):
    __tablename__ = 'metrics'
    __table_args__ = (UniqueConstraint('batch_id', 'dimension', 'key'),)
    batch_id: Mapped[str] = mapped_column(ForeignKey('imports.id'), index=True)
    dimension: Mapped[str] = mapped_column(String(40), index=True)
    key: Mapped[str] = mapped_column(Text)
    data: Mapped[dict] = mapped_column(JSON)


class Job(Scoped, Base):
    __tablename__ = 'jobs'
    __table_args__ = (UniqueConstraint('site_id', 'kind', 'schedule_key'),)
    kind: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default='queued', index=True)
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    progress: Mapped[dict] = mapped_column(JSON, default=dict)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str] = mapped_column(Text, default='')
    heartbeat: Mapped[float] = mapped_column(Float, default=0)
    not_before: Mapped[float] = mapped_column(Float, default=0)
    schedule_key: Mapped[str | None] = mapped_column(String(120), nullable=True)


class Frontier(Entity, Base):
    __tablename__ = 'crawl_frontier'
    __table_args__ = (UniqueConstraint('job_id', 'url'),)
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'), index=True)
    url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default='pending')


class Page(Scoped, Base):
    __tablename__ = 'pages'
    __table_args__ = (UniqueConstraint('site_id', 'url'),)
    url: Mapped[str] = mapped_column(Text)
    status: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(Text, default='')
    description: Mapped[str] = mapped_column(Text, default='')
    canonical: Mapped[str] = mapped_column(Text, default='')
    robots: Mapped[str] = mapped_column(Text, default='')
    text: Mapped[str] = mapped_column(Text, default='')
    content_hash: Mapped[str] = mapped_column(String(64), default='')
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    checked_at: Mapped[float] = mapped_column(Float, default=time.time)


class PageVersion(Scoped, Base):
    __tablename__ = 'page_versions'
    page_id: Mapped[str] = mapped_column(ForeignKey('pages.id'), index=True)
    content_hash: Mapped[str] = mapped_column(String(64))
    data: Mapped[dict] = mapped_column(JSON)


class Document(Scoped, Base):
    __tablename__ = 'documents'
    __table_args__ = (UniqueConstraint('site_id', 'source', 'content_hash'),)
    source: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(String(64))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Chunk(Scoped, Base):
    __tablename__ = 'chunks'
    __table_args__ = (UniqueConstraint('document_id', 'ordinal'),)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), index=True)
    ordinal: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list | None] = mapped_column(JSON().with_variant(Vector(768), 'postgresql'), nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(100), default='')


class Action(Scoped, Base):
    __tablename__ = 'actions'
    __table_args__ = (UniqueConstraint('site_id', 'fingerprint'),)
    fingerprint: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(10), default='P2')
    score: Mapped[float] = mapped_column(Float, default=0)
    confidence: Mapped[str] = mapped_column(String(30), default='measured')
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default='open')


class AgentResult(Scoped, Base):
    __tablename__ = 'agent_results'
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'), index=True)
    agent: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))
    summary: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)


class Connection(Scoped, Base):
    __tablename__ = 'connections'
    __table_args__ = (UniqueConstraint('site_id', 'provider'),)
    provider: Mapped[str] = mapped_column(String(40))
    encrypted: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default='configured')
    paused_until: Mapped[float] = mapped_column(Float, default=0)


class StateToken(Entity, Base):
    __tablename__ = 'state_tokens'
    tenant_id: Mapped[str] = mapped_column(String(32), index=True)
    purpose: Mapped[str] = mapped_column(String(40))
    digest: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[float] = mapped_column(Float)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class Quota(Scoped, Base):
    __tablename__ = 'quotas'
    __table_args__ = (UniqueConstraint('site_id', 'provider', 'window'),)
    provider: Mapped[str] = mapped_column(String(40))
    window: Mapped[str] = mapped_column(String(40))
    count: Mapped[int] = mapped_column(Integer, default=0)


class Evidence(Scoped, Base):
    __tablename__ = 'evidence'
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    data: Mapped[dict] = mapped_column(JSON)


class Report(Scoped, Base):
    __tablename__ = 'reports'
    kind: Mapped[str] = mapped_column(String(40), default='daily')
    data: Mapped[dict] = mapped_column(JSON)


class Schedule(Scoped, Base):
    __tablename__ = 'schedules'
    __table_args__ = (UniqueConstraint('site_id', 'name'),)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(40))
    cadence: Mapped[str] = mapped_column(String(20), default='daily')
    hour: Mapped[int] = mapped_column(Integer)
    minute: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_slot: Mapped[str] = mapped_column(String(80), default='')


class Notification(Scoped, Base):
    __tablename__ = 'notifications'
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class Audit(Entity, Base):
    __tablename__ = 'audit'
    tenant_id: Mapped[str] = mapped_column(String(32), index=True)
    user_id: Mapped[str] = mapped_column(String(32), default='system')
    event: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(100), default='')
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Usage(Scoped, Base):
    __tablename__ = 'usage'
    model: Mapped[str] = mapped_column(String(100))
    purpose: Mapped[str] = mapped_column(String(40))
    duration_ms: Mapped[float] = mapped_column(Float)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    cached: Mapped[bool] = mapped_column(Boolean, default=False)


class Cache(Scoped, Base):
    __tablename__ = 'cache'
    __table_args__ = (UniqueConstraint('site_id', 'key'),)
    key: Mapped[str] = mapped_column(String(64))
    data: Mapped[dict] = mapped_column(JSON)
    expires_at: Mapped[float] = mapped_column(Float)


class Proposal(Scoped, Base):
    __tablename__ = 'proposals'
    path: Mapped[str] = mapped_column(Text)
    repo_root: Mapped[str] = mapped_column(Text)
    before_hash: Mapped[str] = mapped_column(String(64))
    after_hash: Mapped[str] = mapped_column(String(64))
    before_text: Mapped[str] = mapped_column(Text)
    after_text: Mapped[str] = mapped_column(Text)
    diff: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default='pending')
    branch: Mapped[str] = mapped_column(String(100), default='')
    results: Mapped[dict] = mapped_column(JSON, default=dict)


class Repository(Scoped, Base):
    __tablename__ = 'repositories'
    __table_args__ = (UniqueConstraint('site_id', 'path'),)
    name: Mapped[str] = mapped_column(String(120))
    path: Mapped[str] = mapped_column(Text)
