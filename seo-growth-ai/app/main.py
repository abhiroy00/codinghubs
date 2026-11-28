import json
import logging
import secrets
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .config import ROOT, Settings
from .db import database, scoped
from .imports import MAX_UPLOAD, import_evidence, import_gsc
from .models import ImportBatch, Session, Site, StateToken, Tenant, User
from .network import PublicTransport, canonical_url
from .security import DUMMY_HASH, PASSWORDS, Secrets, audit, current_user, digest, login_allowed, new_session, owned_site, verify_password

logger = logging.getLogger('local_seo')


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Login(StrictModel):
    username: str = Field(min_length=3, max_length=64, pattern=r'^[a-zA-Z0-9_.-]+$')
    password: str = Field(min_length=12, max_length=128)


class Setup(Login):
    workspace: str = Field(default='CodingHubs workspace', min_length=2, max_length=120)


class SiteInput(StrictModel):
    name: str = Field(min_length=2, max_length=120)
    base_url: str = Field(max_length=500)
    kind: str = Field(default='owned', pattern='^(owned|competitor)$')


class PasswordChange(StrictModel):
    current_password: str = Field(min_length=12, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


def get_db(request: Request):
    with request.app.state.sessions() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise


def reader(request: Request, db=Depends(get_db, scope='function')):
    return current_user(request, db)[0]


def writer(request: Request, db=Depends(get_db, scope='function')):
    return current_user(request, db, write=True)[0]


def view_site(site):
    return {'id': site.id, 'name': site.name, 'base_url': site.base_url, 'kind': site.kind, 'property_url': site.property_url}


def create_app(settings=None):
    settings = settings or Settings()
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(message)s'))
        logger.addHandler(handler)
    engine, sessions = database(settings)

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(title='CodingHubs Local SEO', version='0.1.0', lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings, app.state.engine, app.state.sessions = settings, engine, sessions
    app.state.secrets = Secrets(settings.state_dir)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

    @app.middleware('http')
    async def boundaries(request, call_next):
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            origin = request.headers.get('origin')
            if (origin and origin not in settings.origins) or request.headers.get('sec-fetch-site') == 'cross-site':
                return JSONResponse({'error': {'code': 'FORBIDDEN', 'message': 'Cross-origin writes are not permitted'}}, status_code=403)
        try:
            if int(request.headers.get('content-length', '0')) > 11_000_000:
                return JSONResponse({'error': {'code': 'TOO_LARGE', 'message': 'Request exceeds 11 MB'}}, status_code=413)
        except ValueError:
            return JSONResponse({'error': {'code': 'BAD_REQUEST', 'message': 'Invalid content length'}}, status_code=400)
        started = time.monotonic()
        response = await call_next(request)
        response.headers.update({'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
                                 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' if request.url.path.startswith('/api/') else 'no-cache',
                                 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"})
        logger.info(json.dumps({'event': 'http', 'method': request.method, 'path': request.url.path, 'status': response.status_code, 'duration_ms': round((time.monotonic() - started) * 1000)}))
        return response

    @app.exception_handler(HTTPException)
    async def http_error(_, error):
        return JSONResponse({'error': {'code': str(error.status_code), 'message': error.detail}}, status_code=error.status_code)

    @app.exception_handler(ValueError)
    async def value_error(_, error):
        return JSONResponse({'error': {'code': 'VALIDATION_ERROR', 'message': str(error)[:300]}}, status_code=422)

    @app.exception_handler(IntegrityError)
    async def conflict(_, __):
        return JSONResponse({'error': {'code': 'CONFLICT', 'message': 'This record already exists; reload and retry'}}, status_code=409)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_, error):
        fields = ['.'.join(map(str, item['loc'])) for item in error.errors()]
        return JSONResponse({'error': {'code': 'VALIDATION_ERROR', 'message': 'Check these fields: ' + ', '.join(fields)}}, status_code=422)

    @app.exception_handler(Exception)
    async def unexpected_error(_, error):
        logger.error(json.dumps({'event': 'unexpected_error', 'type': type(error).__name__}))
        return JSONResponse({'error': {'code': 'INTERNAL_ERROR', 'message': 'The operation failed. Check the local service log.'}}, status_code=500)

    @app.get('/api/health')
    def health():
        from sqlalchemy import text
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return {'status': 'ok', 'free_only': True, 'database': engine.dialect.name}

    @app.get('/api/auth/setup')
    def setup_status(db=Depends(get_db, scope='function')):
        return {'required': db.scalar(select(func.count()).select_from(User)) == 0}

    @app.post('/api/auth/setup', status_code=201)
    def setup(body: Setup, request: Request, response: Response, db=Depends(get_db, scope='function')):
        if db.scalar(select(func.count()).select_from(User)):
            raise HTTPException(409, 'The first owner is already configured')
        db.add(StateToken(tenant_id='bootstrap', purpose='first_owner', digest=digest('first-owner-once'), expires_at=4102444800))
        db.flush()  # Unique database claim prevents simultaneous first-owner creation.
        tenant = Tenant(name=body.workspace)
        db.add(tenant)
        db.flush()
        user = User(tenant_id=tenant.id, username=body.username, password_hash=PASSWORDS.hash(body.password))
        db.add(user)
        db.flush()
        token, session = new_session(db, user)
        response.set_cookie('seo_session', token, httponly=True, samesite='strict', secure=request.url.scheme == 'https', max_age=43200)
        audit(db, tenant.id, 'owner_setup', user=user.id)
        return {'username': user.username, 'role': user.role, 'csrf': session.csrf}

    @app.post('/api/auth/login')
    def login(body: Login, request: Request, response: Response, db=Depends(get_db, scope='function')):
        key = login_allowed(db, body.username, request.client.host)
        user = db.scalar(select(User).where(User.username == body.username))
        valid = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
        if not user or not valid:
            db.add(StateToken(tenant_id=key, purpose='login_failure', digest=secrets.token_hex(32), expires_at=time.time() + 900))
            db.commit()
            raise HTTPException(401, 'Username or password is incorrect')
        token, session = new_session(db, user)
        response.set_cookie('seo_session', token, httponly=True, samesite='strict', secure=request.url.scheme == 'https', max_age=43200)
        audit(db, user.tenant_id, 'login', user=user.id)
        return {'username': user.username, 'role': user.role, 'csrf': session.csrf}

    @app.get('/api/auth/session')
    def session(request: Request, db=Depends(get_db, scope='function')):
        user, active = current_user(request, db)
        return {'username': user.username, 'role': user.role, 'csrf': active.csrf}

    @app.post('/api/auth/logout')
    def logout(request: Request, response: Response, db=Depends(get_db, scope='function')):
        _, active = current_user(request, db, write=True)
        db.delete(active)
        response.delete_cookie('seo_session')
        return {'logged_out': True}

    @app.post('/api/auth/password')
    def password(body: PasswordChange, request: Request, response: Response, db=Depends(get_db, scope='function')):
        from sqlalchemy import delete
        user, _ = current_user(request, db, write=True, allow_viewer=True)
        if not verify_password(body.current_password, user.password_hash):
            raise HTTPException(403, 'Current password is incorrect')
        user.password_hash = PASSWORDS.hash(body.new_password)
        db.execute(delete(Session).where(Session.user_id == user.id))
        token, session = new_session(db, user)
        response.set_cookie('seo_session', token, httponly=True, samesite='strict', secure=request.url.scheme == 'https', max_age=43200)
        audit(db, user.tenant_id, 'password_changed', user=user.id)
        return {'changed': True, 'csrf': session.csrf}

    @app.get('/api/sites')
    def sites(user=Depends(reader), db=Depends(get_db, scope='function')):
        return [view_site(site) for site in db.scalars(scoped(db, Site, user.tenant_id).order_by(Site.created_at))]

    @app.post('/api/sites', status_code=201)
    def add_site(body: SiteInput, user=Depends(writer), db=Depends(get_db, scope='function')):
        url, _ = PublicTransport.validate(body.base_url)
        parsed = __import__('urllib.parse', fromlist=['urlsplit']).urlsplit(url)
        if parsed.path != '/' or parsed.query:
            raise ValueError('Select a website origin, without a path or query')
        site = Site(tenant_id=user.tenant_id, name=body.name, base_url=canonical_url(url), kind=body.kind)
        db.add(site)
        db.flush()
        from .scheduling import initialize_schedules
        initialize_schedules(db, site)
        audit(db, user.tenant_id, 'site_created', site.id, user=user.id)
        return view_site(site)

    @app.post('/api/sites/{site_id}/imports')
    async def upload(site_id: str, request: Request, files: list[UploadFile], kind: str = 'gsc', user=Depends(writer), db=Depends(get_db, scope='function')):
        site = owned_site(db, user, site_id)
        if not 1 <= len(files) <= 8:
            raise ValueError('Import between one and eight files at a time')
        payloads, total = [], 0
        for file in files:
            content = await file.read(MAX_UPLOAD + 1)
            total += len(content)
            if total > 10_000_000:
                raise ValueError('Combined files exceed 10 MB')
            payloads.append((file.filename or 'upload.csv', content))
        if kind == 'gsc':
            result = import_gsc(db, site, payloads, settings)
        else:
            result = {'files': [import_evidence(db, site, kind, name, content) for name, content in payloads]}
        audit(db, user.tenant_id, 'evidence_import', site.id, user=user.id, kind=kind, count=len(files))
        return result

    @app.get('/api/sites/{site_id}/imports')
    def imports(site_id: str, user=Depends(reader), db=Depends(get_db, scope='function')):
        owned_site(db, user, site_id)
        rows = db.scalars(scoped(db, ImportBatch, user.tenant_id, site_id).order_by(ImportBatch.created_at.desc()).limit(100))
        return [{'id': r.id, 'kind': r.kind, 'filename': r.filename, 'rows': r.rows, 'context': r.metadata_json, 'created_at': r.created_at} for r in rows]

    from .workflows_api import router
    app.include_router(router)
    dist = ROOT / 'frontend' / 'dist'
    if dist.is_dir():
        app.mount('/', StaticFiles(directory=dist, html=True), name='dashboard')
    return app
