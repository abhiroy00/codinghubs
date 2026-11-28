"""Use the verified cached Homebrew bottle locally when Redis prevents global Valkey linking."""
import json
import secrets
import subprocess
import tarfile
import platform
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.state'


def main():
    bottle = Path(subprocess.run(['brew', '--cache', 'valkey'], check=True, capture_output=True, text=True).stdout.strip())
    if not bottle.is_file():
        raise RuntimeError('Run the explicit free command HOMEBREW_NO_AUTO_UPDATE=1 brew fetch valkey first')
    directory = STATE / 'tools' / 'valkey'
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tarfile.open(bottle, 'r:gz') as archive:
        for name in ('valkey-server', 'valkey-cli'):
            member = next(item for item in archive.getmembers() if item.name.endswith('/bin/' + name) and item.isfile())
            if member.size > 30_000_000:
                raise RuntimeError('Unexpected binary size')
            target = directory / name
            if target.is_symlink():
                raise RuntimeError('Invalid tool destination')
            target.write_bytes(archive.extractfile(member).read())
            target.chmod(0o700)
            if platform.system() == 'Darwin':
                prefix = subprocess.run(['brew', '--prefix'], capture_output=True, text=True, check=True).stdout.strip()
                libraries = subprocess.run(['otool', '-L', str(target)], capture_output=True, text=True, check=True).stdout
                changed = False
                for line in libraries.splitlines():
                    library = line.strip().split(' ', 1)[0]
                    if library.startswith('@@HOMEBREW_PREFIX@@/'):
                        subprocess.run(['install_name_tool', '-change', library, library.replace('@@HOMEBREW_PREFIX@@', prefix), str(target)], check=True, capture_output=True)
                        changed = True
                if changed:
                    subprocess.run(['codesign', '--force', '--sign', '-', str(target)], check=True, capture_output=True)
        license_member = next((item for item in archive.getmembers() if item.name.endswith(('/COPYING', '/LICENSE')) and item.isfile()), None)
        if license_member:
            (directory / 'LICENSE').write_bytes(archive.extractfile(license_member).read())
    version = subprocess.run([str(directory / 'valkey-server'), '--version'], capture_output=True, text=True, check=True).stdout.strip()
    password = secrets.token_urlsafe(32)
    runtime = STATE / 'runtime.env'
    existing = runtime.read_text()
    if 'SEO_BROKER_URL=' not in existing:
        with runtime.open('a') as stream:
            stream.write('SEO_BROKER_URL=redis://:' + password + '@127.0.0.1:56379/0\n')
    else:
        from urllib.parse import urlsplit
        password = urlsplit(next(line.split('=', 1)[1] for line in existing.splitlines() if line.startswith('SEO_BROKER_URL='))).password
    data = STATE / 'valkey-data'
    data.mkdir(exist_ok=True, mode=0o700)
    config = STATE / 'valkey.conf'
    config.write_text(f'bind 127.0.0.1\nport 56379\nprotected-mode yes\nrequirepass {password}\ndir "{data}"\nappendonly yes\nmaxmemory 64mb\nmaxmemory-policy noeviction\n')
    config.chmod(0o600)
    runtime.chmod(0o600)
    print(json.dumps({'version': version, 'path': str(directory), 'binding': '127.0.0.1:56379', 'existing_redis': 'Not replaced or unlinked'}))


if __name__ == '__main__':
    main()
