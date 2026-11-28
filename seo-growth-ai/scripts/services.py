"""Own only this project's private native services; never touch existing database clusters."""
import argparse
import json
import os
import secrets
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import quote

import psutil

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.state'
sys.path.insert(0, str(ROOT))


def environment():
    env = os.environ.copy()
    for path in [ROOT / '.env', STATE / 'runtime.env']:
        if path.exists():
            for line in path.read_text().splitlines():
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    if key.startswith(('SEO_', 'FREE_', 'ALLOW_', 'MONTHLY_')):
                        env[key] = value.strip().strip('"').strip("'")
    env.update({'OLLAMA_HOST': '127.0.0.1:11435', 'OLLAMA_MODELS': str(STATE / 'models'), 'OLLAMA_NO_CLOUD': '1',
                'OLLAMA_MAX_LOADED_MODELS': '1', 'OLLAMA_NUM_PARALLEL': '1', 'OLLAMA_CONTEXT_LENGTH': '2048',
                'LANGSMITH_TRACING': 'false', 'LANGCHAIN_TRACING_V2': 'false', 'OPENBLAS_NUM_THREADS': '1',
                'OMP_NUM_THREADS': '1', 'TOKENIZERS_PARALLELISM': 'false'})
    return env


def private_directory(path):
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.chmod(0o700)


def initialize():
    private_directory(STATE)
    private_directory(STATE / 'logs')
    private_directory(STATE / 'pgsock')
    private_directory(STATE / 'pids')
    pgdata = STATE / 'pgdata'
    marker = STATE / 'owned-services.json'
    if not marker.exists():
        marker.write_text(json.dumps({'project': str(ROOT), 'postgres_port': 55432, 'ollama_port': 11435}))
        marker.chmod(0o600)
    elif json.loads(marker.read_text()).get('project') != str(ROOT):
        raise RuntimeError('Service ownership marker does not match this project')
    if not (pgdata / 'PG_VERSION').exists():
        if pgdata.exists() and any(pgdata.iterdir()):
            raise RuntimeError('Refusing to initialize a nonempty PostgreSQL directory')
        with (STATE / 'logs' / 'postgres-init.log').open('w') as log:
            subprocess.run(['initdb', '-D', str(pgdata), '-U', 'seo_bootstrap', '--auth-local=trust', '--auth-host=scram-sha-256', '--no-locale', '--encoding=UTF8'], check=True, stdout=log, stderr=log)
        socket_dir = str(STATE / 'pgsock').replace("'", "''")
        with (pgdata / 'postgresql.conf').open('a') as config:
            config.write(f"\nlisten_addresses='127.0.0.1'\nport=55432\nunix_socket_directories='{socket_dir}'\nmax_connections=24\nshared_buffers='64MB'\nwork_mem='4MB'\npassword_encryption='scram-sha-256'\n")
    status = subprocess.run(['pg_ctl', '-D', str(pgdata), 'status'], capture_output=True)
    if status.returncode:
        subprocess.run(['pg_ctl', '-D', str(pgdata), '-l', str(STATE / 'logs' / 'postgres.log'), '-w', 'start'], check=True)
    import psycopg
    from psycopg import sql
    with psycopg.connect(host=str(STATE / 'pgsock'), port=55432, user='seo_bootstrap', dbname='postgres', autocommit=True) as connection:
        runtime = STATE / 'runtime.env'
        if not runtime.exists():
            password = secrets.token_urlsafe(32)
            connection.execute(sql.SQL('CREATE ROLE seo_app LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE').format(sql.Literal(password)))
            connection.execute('CREATE DATABASE local_seo OWNER seo_app')
            runtime.write_text('SEO_DATABASE_URL=postgresql+psycopg://seo_app:' + quote(password, safe='') + '@127.0.0.1:55432/local_seo\nSEO_OLLAMA_HOST=http://127.0.0.1:11435\n')
            runtime.chmod(0o600)
    with psycopg.connect(host=str(STATE / 'pgsock'), port=55432, user='seo_bootstrap', dbname='local_seo', autocommit=True) as connection:
        connection.execute('CREATE EXTENSION IF NOT EXISTS vector')
    subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT, env=environment(), check=True)


def spawn(name, args, env):
    pid_path = STATE / 'pids' / (name + '.json')
    if pid_path.exists():
        previous = json.loads(pid_path.read_text())
        try:
            os.kill(previous['pid'], 0)
            if psutil.Process(previous['pid']).create_time() == previous['started']:
                return
        except (OSError, psutil.Error):
            pass
    with (STATE / 'logs' / (name + '.log')).open('a') as log:
        process = subprocess.Popen(args, cwd=ROOT, env=env, stdout=log, stderr=log, start_new_session=True)
    pid_path.write_text(json.dumps({'pid': process.pid, 'started': psutil.Process(process.pid).create_time(), 'args': args, 'project': str(ROOT)}))
    pid_path.chmod(0o600)


def start():
    initialize()
    env = environment()
    ollama = shutil.which('ollama')
    if ollama:
        spawn('ollama', [ollama, 'serve'], env)
    else:
        print('Ollama is unavailable; deterministic fallback remains enabled.')
    spawn('api', [sys.executable, '-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '8765', '--no-access-log'], env)
    if env.get('SEO_EXECUTOR') == 'celery':
        valkey = STATE / 'tools' / 'valkey' / 'valkey-server'
        if not valkey.is_file() or not (STATE / 'valkey.conf').is_file():
            raise RuntimeError('Run the explicit isolated setup_valkey.py command before choosing Celery')
        spawn('valkey', [str(valkey), str(STATE / 'valkey.conf')], env)
        spawn('worker', [sys.executable, '-m', 'celery', '-A', 'app.celery_app', 'worker', '-l', 'INFO', '-c', '1', '--pool=solo'], env)
        spawn('beat', [sys.executable, '-m', 'celery', '-A', 'app.celery_app', 'beat', '-l', 'INFO', '-s', str(STATE / 'celerybeat-schedule')], env)
    else:
        spawn('worker', [sys.executable, '-m', 'app.worker'], env)
    import httpx
    with httpx.Client(timeout=1, trust_env=False) as client:
        for _ in range(40):
            try:
                if client.get('http://127.0.0.1:8765/api/health').status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(.25)
        else:
            raise RuntimeError('API did not become healthy; inspect .state/logs/api.log')
    print('Local workspace: http://127.0.0.1:8765 — health verified; services bound to localhost only.')


def stop():
    marker = json.loads((STATE / 'owned-services.json').read_text())
    if marker['project'] != str(ROOT):
        raise RuntimeError('Cannot stop services without project ownership evidence')
    for path in (STATE / 'pids').glob('*.json'):
        record = json.loads(path.read_text())
        try:
            process = psutil.Process(record['pid'])
            if record['project'] == str(ROOT) and process.create_time() == record['started'] and process.cwd() == str(ROOT):
                os.killpg(record['pid'], signal.SIGTERM)
        except (psutil.Error, ProcessLookupError):
            pass
    subprocess.run(['pg_ctl', '-D', str(STATE / 'pgdata'), '-m', 'fast', '-w', 'stop'], check=False)
    print('Only this project’s native services were stopped.')


def status():
    import httpx
    with httpx.Client(timeout=3, trust_env=False) as client:
        for name, url in [('api', 'http://127.0.0.1:8765/api/health'), ('ollama', 'http://127.0.0.1:11435/api/tags')]:
            try:
                response = client.get(url)
                print(name, response.status_code, response.text[:200])
            except httpx.HTTPError:
                print(name, 'not running')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['init', 'start', 'stop', 'status'])
    command = parser.parse_args().command
    try:
        {'init': initialize, 'start': start, 'stop': stop, 'status': status}[command]()
    except (RuntimeError, subprocess.SubprocessError, OSError) as error:
        print('Local setup failed:', type(error).__name__, file=sys.stderr)
        print('Inspect the private .state/logs files; no existing service was intentionally replaced.', file=sys.stderr)
        sys.exit(1)
