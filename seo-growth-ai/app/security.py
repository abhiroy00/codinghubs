import hashlib
import json
import os
import secrets
import time
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from cryptography.fernet import Fernet
from fastapi import HTTPException, Request
from sqlalchemy import func, select

from .models import Audit, Session, Site, StateToken, User

PASSWORDS = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY_HASH = PASSWORDS.hash(secrets.token_hex(24))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


class Secrets:
    def __init__(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = directory / 'master.key'
        if path.is_symlink():
            raise ValueError('Secret key must not be a symlink')
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(Fernet.generate_key())
        path.chmod(0o600)
        self.fernet = Fernet(path.read_bytes())

    def encrypt(self, value):
        return self.fernet.encrypt(json.dumps(value).encode()).decode()

    def decrypt(self, value):
        return json.loads(self.fernet.decrypt(value.encode()))


def audit(db, tenant, event, target='', user='system', **details):
    safe = {k: v for k, v in details.items() if k in ('status', 'kind', 'count', 'reason', 'provider')}
    db.add(Audit(tenant_id=tenant, user_id=user, event=event, target=target[:100], details=safe))


def verify_password(password, hashed):
    try:
        return PASSWORDS.verify(hashed, password)
    except VerificationError:
        return False


def current_user(request: Request, db, write=False, allow_viewer=False):
    token = request.cookies.get('seo_session', '')
    session = db.scalar(select(Session).where(Session.token_hash == digest(token), Session.expires_at > time.time()))
    if not session:
        raise HTTPException(401, 'Sign in to your local workspace')
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, 'Session is no longer valid')
    if write:
        if not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), session.csrf):
            raise HTTPException(403, 'CSRF token is missing or invalid')
        if user.role == 'viewer' and not allow_viewer:
            raise HTTPException(403, 'This account has read-only access')
    return user, session


def require_owner(user):
    if user.role != 'owner':
        raise HTTPException(403, 'Workspace owner approval is required')


def owned_site(db, user, site_id):
    site = db.scalar(select(Site).where(Site.id == site_id, Site.tenant_id == user.tenant_id))
    if not site:
        raise HTTPException(404, 'Website not found')
    return site


def scoped_object(db, model, user, object_id, site_id=None):
    query = select(model).where(model.id == object_id, model.tenant_id == user.tenant_id)
    if site_id:
        query = query.where(model.site_id == site_id)
    result = db.scalar(query)
    if not result:
        raise HTTPException(404, 'Record not found')
    return result


def login_allowed(db, username, address):
    key = digest(username.lower() + '|' + address)
    count = db.scalar(select(func.count()).select_from(StateToken).where(
        StateToken.purpose == 'login_failure', StateToken.tenant_id == key, StateToken.expires_at > time.time()))
    if count >= 5:
        raise HTTPException(429, 'Too many sign-in attempts. Retry after 15 minutes.')
    return key


def new_session(db, user):
    token = secrets.token_urlsafe(32)
    session = Session(user_id=user.id, token_hash=digest(token), csrf=secrets.token_urlsafe(32), expires_at=time.time() + 43200)
    db.add(session)
    return token, session
