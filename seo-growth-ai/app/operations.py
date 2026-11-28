import hashlib
import json
import os
import platform
import secrets
import shutil
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

import psutil
from sqlalchemy import func, select, text

from .models import Base, Usage


def resource_snapshot(db, settings, tenant_id=None):
    memory = psutil.virtual_memory()
    disk = shutil.disk_usage(settings.state_dir)
    if db.bind.dialect.name == 'postgresql':
        database_bytes = db.scalar(text('SELECT pg_database_size(current_database())'))
    else:
        path = Path(settings.database_url.removeprefix('sqlite:///'))
        database_bytes = path.stat().st_size if path.is_file() else 0
    uploads = settings.state_dir / 'uploads'
    crawl_bytes = sum(p.stat().st_size for p in uploads.rglob('*') if p.is_file() and not p.is_symlink()) if uploads.exists() else 0
    scope = [Usage.tenant_id == tenant_id] if tenant_id else []
    requests = db.scalar(select(func.count()).select_from(Usage).where(Usage.cached.is_(False), *scope))
    duration = db.scalar(select(func.sum(Usage.duration_ms)).where(*scope)) or 0
    return {'os': platform.system(), 'architecture': platform.machine(), 'logical_cpus': psutil.cpu_count(),
            'ram_total_bytes': memory.total, 'ram_available_bytes': memory.available, 'ram_used_pct': memory.percent,
            'cpu_used_pct': psutil.cpu_percent(interval=.05), 'process_rss_bytes': psutil.Process().memory_info().rss,
            'gpu_utilization_pct': None, 'gpu_limit': 'GPU utilization sensor unavailable; no invented zero',
            'disk_free_bytes': disk.free, 'database_bytes': database_bytes, 'upload_storage_bytes': crawl_bytes,
            'local_ai_requests': requests, 'local_ai_processing_ms': duration,
            'measured_at': time.time(), 'profile': settings.profile, 'limits': settings.limits,
            'cost_policy': {'FREE_ONLY_MODE': True, 'ALLOW_PAID_APIS': False, 'MONTHLY_EXTERNAL_API_BUDGET_INR': 0,
                            'ALLOW_CLOUD_PROVISIONING': False, 'ALLOW_AUTOMATIC_PAID_UPGRADE': False,
                            'paid_provider_requests_permitted': 0, 'verified_external_expenditure_inr': None,
                            'limits': 'No billing feed is connected. Existing website hosting is outside this local app; savings/expenditure are not fabricated.'}}


def metrics_token(settings):
    path = settings.state_dir / 'metrics.token'
    if path.is_symlink():
        raise ValueError('Invalid metrics credential path')
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(fd, 'w') as stream:
            stream.write(secrets.token_urlsafe(32))
    return path.read_text()


def prometheus_metrics(db, settings):
    from prometheus_client import CollectorRegistry, Gauge, generate_latest
    registry = CollectorRegistry()
    data = resource_snapshot(db, settings)
    for name in ('ram_used_pct', 'cpu_used_pct', 'disk_free_bytes', 'database_bytes', 'local_ai_requests', 'local_ai_processing_ms'):
        Gauge('local_seo_' + name, name.replace('_', ' '), registry=registry).set(data[name])
    return generate_latest(registry)


def backup(settings):
    if not settings.database_url.startswith('postgresql'):
        raise ValueError('The verified backup workflow requires the native local PostgreSQL profile')
    directory = settings.state_dir / 'backups'
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    parsed = urlsplit(settings.database_url)
    env = {**os.environ, 'PGPASSWORD': unquote(parsed.password or '')}
    args = ['pg_dump', '-h', parsed.hostname, '-p', str(parsed.port or 5432), '-U', unquote(parsed.username), '-d', parsed.path.lstrip('/'), '-Fc']
    with tempfile.TemporaryDirectory(dir=settings.state_dir) as temporary:
        dump = Path(temporary) / 'database.dump'
        with dump.open('wb') as stream:
            subprocess.run(args, env=env, stdout=stream, stderr=subprocess.PIPE, check=True, timeout=120)
        files = {'database.dump': dump}
        upload_root = settings.state_dir / 'uploads'
        if upload_root.exists():
            for path in upload_root.rglob('*'):
                if path.is_file() and not path.is_symlink():
                    files['uploads/' + str(path.relative_to(upload_root))] = path
        if sum(path.stat().st_size for path in files.values()) > 200_000_000:
            raise ValueError('Backup exceeds the 200 MB lightweight safety limit; use the documented native pg_dump workflow')
        manifest = {'created_at': time.time(), 'files': {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in files.items()},
                    'credential_key': 'Master key and runtime.env deliberately excluded; store the master key separately for credential recovery.'}
        output = directory / ('backup-' + time.strftime('%Y%m%dT%H%M%S', time.gmtime()) + '-' + secrets.token_hex(4) + '.zip')
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, path in files.items():
                archive.write(path, name)
            archive.writestr('manifest.json', json.dumps(manifest))
        output.chmod(0o600)
    return {'filename': output.name, 'bytes': output.stat().st_size, 'directory': str(directory),
            'note': 'Encrypted Google credentials are backed up; the separate master key is required to decrypt them.'}


def restore_test(settings, archive_path):
    """Restore only to a new, uniquely named disposable DB in our private cluster."""
    import psycopg
    from psycopg import sql
    path = Path(archive_path)
    if path.is_symlink() or not path.resolve().is_relative_to((settings.state_dir / 'backups').resolve()):
        raise ValueError('Select a backup from this platform’s private backup directory')
    parsed = urlsplit(settings.database_url)
    name = 'seo_restore_' + secrets.token_hex(6)
    env = {**os.environ, 'PGPASSWORD': unquote(parsed.password or '')}
    socket = str(settings.state_dir / 'pgsock')
    original_counts = {}
    with psycopg.connect(host=parsed.hostname, port=parsed.port, user=unquote(parsed.username), password=unquote(parsed.password or ''), dbname=parsed.path.lstrip('/')) as original:
        for table in Base.metadata.tables:
            original_counts[table] = original.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(table))).fetchone()[0]
    created = False
    try:
        with psycopg.connect(host=socket, port=55432, user='seo_bootstrap', dbname='postgres', autocommit=True) as admin:
            admin.execute(sql.SQL('CREATE DATABASE {} OWNER seo_app').format(sql.Identifier(name)))
            created = True
        with psycopg.connect(host=socket, port=55432, user='seo_bootstrap', dbname=name, autocommit=True) as admin:
            admin.execute('CREATE EXTENSION vector')
        with tempfile.TemporaryDirectory(dir=settings.state_dir) as directory:
            with zipfile.ZipFile(path) as archive:
                members = archive.infolist()
                if len(members) > 10000 or sum(member.file_size for member in members) > 210_000_000:
                    raise ValueError('Backup exceeds restore limits')
                manifest = json.loads(archive.read('manifest.json'))
                for filename, expected in manifest['files'].items():
                    if filename.startswith('/') or '..' in Path(filename).parts:
                        raise ValueError('Invalid backup member')
                    content = archive.read(filename)
                    if hashlib.sha256(content).hexdigest() != expected:
                        raise ValueError('Backup checksum mismatch')
                dump = Path(directory) / 'database.dump'
                dump.write_bytes(archive.read('database.dump'))
                subprocess.run(['pg_restore', '--no-owner', '--no-acl', '--no-comments', '-h', parsed.hostname, '-p', str(parsed.port or 55432),
                                '-U', unquote(parsed.username), '-d', name, str(dump)], env=env, capture_output=True, check=True, timeout=120)
            with psycopg.connect(host=parsed.hostname, port=parsed.port, user=unquote(parsed.username), password=unquote(parsed.password or ''), dbname=name) as restored:
                actual = {table: restored.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(table))).fetchone()[0] for table in original_counts}
                if actual != original_counts:
                    raise ValueError('Restored record counts do not match the source snapshot; pause writes and retry')
                vector_type = restored.execute("SELECT format_type(atttypid,atttypmod) FROM pg_attribute WHERE attrelid='chunks'::regclass AND attname='embedding'").fetchone()[0]
                if vector_type != 'vector(768)':
                    raise ValueError('Restored vector schema is invalid')
        result = {'status': 'passed', 'tables': actual, 'vector_type': vector_type,
                  'limits': 'Source/target isolated; archive checksums and record counts verified. Store master key separately. No existing website database touched.'}
        (settings.state_dir / 'backup-restore-result.json').write_text(json.dumps(result, indent=2) + '\n')
        return result
    finally:
        if created:
            with psycopg.connect(host=socket, port=55432, user='seo_bootstrap', dbname='postgres', autocommit=True) as admin:
                admin.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(name)))
