"""Generate private optional Linux Compose credentials; does not start/pull containers."""
import os
import secrets
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
state = ROOT / '.state'
state.mkdir(exist_ok=True, mode=0o700)
target = state / 'compose.env'
if target.exists():
    raise SystemExit('Private Compose configuration already exists; it has not been overwritten.')
password = secrets.token_urlsafe(32)
values = {
    'POSTGRES_PASSWORD': secrets.token_urlsafe(32), 'PG_APP_PASSWORD': password,
    'SEO_DATABASE_URL': 'postgresql+psycopg://seo_app:' + quote(password, safe='') + '@127.0.0.1:55432/local_seo',
    'SEO_OLLAMA_HOST': 'http://127.0.0.1:11435', 'SEO_PROFILE': 'lightweight',
    'GF_SECURITY_ADMIN_USER': 'local-owner', 'GF_SECURITY_ADMIN_PASSWORD': secrets.token_urlsafe(32),
    'FREE_ONLY_MODE': 'true', 'ALLOW_PAID_APIS': 'false', 'MONTHLY_EXTERNAL_API_BUDGET_INR': '0',
    'ALLOW_CLOUD_PROVISIONING': 'false', 'ALLOW_AUTOMATIC_PAID_UPGRADE': 'false',
}
with os.fdopen(os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
    stream.write(''.join(f'{key}={value}\n' for key, value in values.items()))
directory = state / 'compose' / 'app'
directory.mkdir(parents=True, exist_ok=True, mode=0o700)
(directory / 'metrics.token').write_text(secrets.token_urlsafe(32))
(directory / 'metrics.token').chmod(0o600)
print('Private config generated at .state/compose.env. No containers started. On Linux, grant UID 10001 access to .state/compose/app before starting.')
