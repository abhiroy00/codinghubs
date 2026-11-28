import json
import subprocess

from .config import ROOT
from .models import Evidence
from .network import PublicTransport


def mobile_audit(db, site, job, settings):
    url, addresses = PublicTransport.validate(site.base_url)
    address = next((value for value in addresses if ':' not in value), addresses[0])
    directory = settings.state_dir / 'mobile-results'
    directory.mkdir(exist_ok=True, mode=0o700)
    screenshot = directory / (job.id + '.png')
    result = subprocess.run(['node', str(ROOT / 'scripts' / 'mobile-audit.mjs'), url, address, str(screenshot)],
                            capture_output=True, text=True, timeout=40, check=True, cwd=ROOT)
    measured = json.loads(result.stdout)
    screenshot.chmod(0o600)
    db.add(Evidence(tenant_id=site.tenant_id, site_id=site.id, kind='performance', title='Isolated mobile browser lab',
                    data={'url': url, 'measurement': measured, 'screenshot_job_id': job.id}))
    return measured
