"""Private files: upload validation, short-lived signed links, and the authorised streaming download."""
import hashlib
import re
import zipfile
from pathlib import PurePosixPath

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.http import FileResponse, Http404

from . import access
from .audit import client_prefix
from .models import DigitalAsset, DownloadEvent, DownloadPermission, Order, Project, ProjectGuide

MAX_ASSET_BYTES = 100 * 1024 * 1024
SALT = 'shop-download'
ZIP_LIKE = {'zip', 'epub', 'docx', 'pptx', 'xlsx'}
IMAGES = {'png': b'\x89PNG', 'jpg': b'\xff\xd8\xff', 'jpeg': b'\xff\xd8\xff', 'gif': b'GIF8', 'webp': b'RIFF'}
TEXT = {'sql', 'txt', 'md', 'csv'}
MIME = {
    'pdf': 'application/pdf', 'zip': 'application/zip', 'epub': 'application/epub+zip', 'png': 'image/png', 'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp', 'sql': 'text/plain', 'txt': 'text/plain', 'md': 'text/plain',
    'csv': 'text/csv', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
ALLOWED = set(MIME)
UNSAFE_NAME = re.compile(r'[^A-Za-z0-9._ -]+')


def safe_name(name: str) -> str:
    base = PurePosixPath(name.replace('\\', '/')).name
    base = UNSAFE_NAME.sub('_', base).strip('. ') or 'file'
    return base[:120]


def validate_upload(f) -> tuple[str, str, str]:
    """Checks extension, size and real content (magic bytes), never the browser-reported type. Returns (ext, mime, sha256)."""
    name = safe_name(f.name)
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
    if ext not in ALLOWED:
        raise ValidationError(f'File type “.{ext or "?"}” is not allowed. Allowed: {", ".join(sorted(ALLOWED))}.')
    if f.size > MAX_ASSET_BYTES:
        raise ValidationError('File is larger than 100 MB.')
    if f.size == 0:
        raise ValidationError('The file is empty.')
    f.seek(0)
    head = f.read(16)
    f.seek(0)
    if ext == 'pdf' and not head.startswith(b'%PDF'):
        raise ValidationError('This is not a real PDF file.')
    if ext in IMAGES and not head.startswith(IMAGES[ext]):
        raise ValidationError('This is not a real image file.')
    if ext == 'webp' and head[8:12] != b'WEBP':
        raise ValidationError('This is not a real image file.')
    if ext in ZIP_LIKE:
        if not zipfile.is_zipfile(f):
            raise ValidationError('This is not a valid ZIP-based file.')
        f.seek(0)
        with zipfile.ZipFile(f) as z:
            total = 0
            for info in z.infolist():
                p = PurePosixPath(info.filename)
                if p.is_absolute() or '..' in p.parts:
                    raise ValidationError('The archive contains unsafe paths.')
                total += info.file_size
            if total > 2 * 1024**3 or (f.size and total / f.size > 200):
                raise ValidationError('The archive expands to an unreasonable size.')
        f.seek(0)
    if ext in TEXT:
        chunk = f.read(65536)
        f.seek(0)
        if b'\x00' in chunk:
            raise ValidationError('This does not look like a text file.')
    sha = hashlib.sha256()
    for chunk in f.chunks():
        sha.update(chunk)
    f.seek(0)
    return ext, MIME[ext], sha.hexdigest()


def create_asset(owner: dict, uploaded, label: str, position: int = 0) -> DigitalAsset:
    ext, mime, sha = validate_upload(uploaded)
    asset = DigitalAsset(**owner, label=(label or safe_name(uploaded.name))[:160], original_name=safe_name(uploaded.name), content_type=mime, size=uploaded.size, sha256=sha, position=position)
    asset.file.save(f'file.{ext}', uploaded, save=False)  # random server-side name; the original name is only metadata
    asset.save()
    return asset


# ---- expiring links ----
def make_token(kind: str, obj_id: int, user=None) -> str:
    return signing.dumps({'k': kind, 'id': obj_id, 'u': user.id if user and user.is_authenticated else None}, salt=SALT)


def read_token(token: str) -> dict:
    try:
        return signing.loads(token, salt=SALT, max_age=settings.STORE_DOWNLOAD_LINK_TTL)
    except signing.SignatureExpired:
        raise Http404('This download link has expired. Request a new one.')
    except signing.BadSignature:
        raise Http404


def link_for_permission(perm: DownloadPermission, user=None) -> str:
    if not perm.active:
        raise PermissionError('This download is no longer available.')
    return f'/api/store/download/{make_token("perm", perm.id, user)}/'


def link_for_guide_asset(user, asset: DigitalAsset) -> str:
    if not asset.guide_id or not access.guide_access(user, asset.guide):
        raise PermissionError('You do not have access to this file.')
    return f'/api/store/download/{make_token("guide", asset.id, user)}/'


def link_for_project_asset(user, asset: DigitalAsset) -> str:
    if not asset.project_id or not access.project_access(user, asset.project):
        raise PermissionError('You do not have access to this file.')
    return f'/api/store/download/{make_token("project", asset.id, user)}/'


def serve(request, token: str):
    data = read_token(token)
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.filter(pk=data['u'], is_active=True).first() if data.get('u') else None
    kind = data['k']
    order = None
    with transaction.atomic():
        if kind == 'perm':
            perm = DownloadPermission.objects.select_for_update().select_related('asset', 'order').filter(pk=data['id']).first()
            if not perm or not perm.active or not perm.order.is_paid:
                raise Http404
            asset, order = perm.asset, perm.order
            DownloadPermission.objects.filter(pk=perm.pk).update(download_count=F('download_count') + 1)
        elif kind == 'guide':
            asset = DigitalAsset.objects.select_related('guide').filter(pk=data['id'], guide__isnull=False).first()
            if not asset or not ProjectGuide.objects.public().filter(pk=asset.guide_id).exists() and not (user and user.is_staff):
                raise Http404
            if not access.guide_access(user, asset.guide):
                raise Http404
        elif kind == 'project':
            asset = DigitalAsset.objects.select_related('project').filter(pk=data['id'], project__isnull=False).first()
            if not asset or not Project.objects.public().filter(pk=asset.project_id).exists() and not (user and user.is_staff):
                raise Http404
            if not access.project_access(user, asset.project):
                raise Http404
        else:
            raise Http404
        DownloadEvent.objects.create(asset=asset, user=user, order=order, source=kind if kind != 'perm' else 'order', ip_prefix=client_prefix(request))
    try:
        fh = asset.file.open('rb')
    except FileNotFoundError:
        raise Http404
    resp = FileResponse(fh, as_attachment=True, filename=asset.original_name, content_type=asset.content_type or 'application/octet-stream')
    resp['X-Content-Type-Options'] = 'nosniff'
    resp['Cache-Control'] = 'private, no-store'
    resp['Content-Security-Policy'] = "default-src 'none'; sandbox"
    return resp
