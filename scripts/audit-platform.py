"""Read-only repository inventory; never imports Django or reads environment files."""
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, encoding='utf-8')


def inventory(read, files):
    routes = {}
    models = {}
    for name in files:
        if name in ('frontend/src/App.tsx', 'admin-panel/src/AdminApp.tsx'):
            routes[name] = re.findall(r'<Route\s+path=["\']([^"\']+)', read(name))
        if name.startswith('backend/apps/') and name.endswith('/models.py'):
            models[name] = re.findall(r'^class (\w+)\(', read(name), re.M)
    return {'routes': routes, 'models': models}


if __name__ == '__main__':
    files = git('ls-files', '--cached', '--others', '--exclude-standard').splitlines()
    files = sorted(set(files))
    remote_files = git('ls-tree', '-r', '--name-only', 'origin/main').splitlines()
    print(json.dumps({
        'head': git('rev-parse', 'HEAD').strip(),
        'remote': git('rev-parse', 'origin/main').strip(),
        'behind': int(git('rev-list', '--count', 'HEAD..origin/main')),
        'local': inventory(lambda p: (ROOT / p).read_text(encoding='utf-8'), files),
        'remote_inventory': inventory(lambda p: git('show', f'origin/main:{p}'), remote_files),
        'limitations': ['Static route declarations only; not a live-site or content accuracy audit.',
                         'Remote inventory is the last fetched origin/main, not a network request.'],
    }, indent=2))
