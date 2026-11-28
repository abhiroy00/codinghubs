import ast
import difflib
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath

from .models import Proposal
from .security import audit

SAFE_EXTENSIONS = {'.html', '.htm', '.md', '.json', '.ts', '.tsx', '.css'}
SENSITIVE = re.compile(r'(^|[/_.-])(auth|security|oauth|secrets?|credentials?|payments?|checkout|sessions?|migrations?|package-lock|uv\.lock)([/_.-]|$)', re.I)
SECRET_TEXT = re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|(?:SECRET_KEY|API_KEY|ACCESS_TOKEN)\s*=\s*[\'"][^\'"]{12,}', re.I)


def git(root, *args):
    result = subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True, timeout=20, check=True)
    return result.stdout.strip()


def file_target(repository, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or not path.parts or '\\' in relative or any(ord(char) < 32 for char in relative):
        raise ValueError('Use a relative source path inside the registered repository')
    if any(part.startswith('.') or part in ('node_modules', 'dist', 'vendor', '__pycache__') for part in path.parts) or SENSITIVE.search(relative):
        raise ValueError('Sensitive, hidden or generated paths require manual work outside this proposal engine')
    root = Path(repository.path).resolve(strict=True)
    candidate = root.joinpath(*path.parts)
    if any(parent.is_symlink() for parent in [candidate, *list(candidate.parents)[:len(path.parts)]]):
        raise ValueError('Symlinked files/directories are not eligible')
    target = candidate.resolve(strict=True)
    if not target.is_relative_to(root) or target.suffix not in SAFE_EXTENSIONS or not target.is_file() or target.stat().st_size > 300000:
        raise ValueError('Select an existing supported source file under 300 KB')
    text = target.read_bytes().decode('utf-8')
    if SECRET_TEXT.search(text):
        raise ValueError('Potential credential material detected; use a separately reviewed manual change')
    return target, text


def register_repository(db, site, settings, path):
    from .models import Repository
    root = Path(path).resolve(strict=True)
    allowed = [Path(value).resolve() for value in settings.repo_roots]
    if root not in allowed or Path(git(root, 'rev-parse', '--show-toplevel')).resolve() != root:
        raise ValueError('Repository must exactly match an OS-owner configured SEO_REPO_ROOTS entry')
    repository = Repository(tenant_id=site.tenant_id, site_id=site.id, name=root.name, path=str(root))
    db.add(repository)
    audit(db, site.tenant_id, 'repository_registered', site.id)
    return repository


def detect_framework(repository):
    root = Path(repository.path)
    frameworks = []
    for package in [root / 'package.json', root / 'frontend' / 'package.json']:
        if package.is_file() and not package.is_symlink() and package.stat().st_size < 100000:
            data = json.loads(package.read_text())
            deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
            frameworks.extend(name for name in ('react', 'next', 'vue', 'vite', 'astro') if name in deps)
    if (root / 'backend' / 'manage.py').is_file() or (root / 'manage.py').is_file():
        frameworks.append('Django')
    return sorted(set(frameworks)) or ['Static or unrecognized; manual source mapping']


def create_proposal(db, site, repository, relative, expected_hash, old_text, new_text):
    target, before = file_target(repository, relative)
    actual = hashlib.sha256(before.encode()).hexdigest()
    if actual != expected_hash:
        raise ValueError('Source changed since preview; reload before proposing')
    if not old_text or before.count(old_text) != 1:
        raise ValueError('The selected source fragment must occur exactly once')
    after = before.replace(old_text, new_text, 1)
    if after == before or SECRET_TEXT.search(after):
        raise ValueError('A meaningful source change without credential material is required')
    diff = ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/' + relative, tofile='b/' + relative))
    proposal = Proposal(tenant_id=site.tenant_id, site_id=site.id, repo_root=repository.path, path=str(target.relative_to(repository.path)),
        before_hash=actual, after_hash=hashlib.sha256(after.encode()).hexdigest(), before_text=before, after_text=after, diff=diff,
        results={'repository_id': repository.id, 'frameworks': detect_framework(repository), 'limits': 'No commit, push, publication or deployment is automatic'})
    db.add(proposal)
    db.flush()
    audit(db, site.tenant_id, 'proposal_created', proposal.id)
    return proposal


def apply_proposal(db, proposal, repository, approval):
    if approval != 'apply local proposal' or proposal.status != 'approved':
        raise ValueError('Separate owner approval is required before applying a proposal')
    target, current = file_target(repository, proposal.path)
    if hashlib.sha256(current.encode()).hexdigest() != proposal.before_hash:
        raise ValueError('Source is stale; no file was changed')
    if git(repository.path, 'status', '--porcelain'):
        raise ValueError('Repository must be clean; existing work will not be overwritten or stashed')
    baseline = git(repository.path, 'rev-parse', 'HEAD')
    branch = 'seo/proposal-' + proposal.id[:12]
    git(repository.path, 'switch', '-c', branch)
    target.write_bytes(proposal.after_text.encode('utf-8'))
    proposal.status, proposal.branch = 'applied', branch
    proposal.results = {**proposal.results, 'baseline_commit': baseline, 'application': 'Local uncommitted feature-branch change only'}
    audit(db, proposal.tenant_id, 'proposal_applied', proposal.id)


def test_proposal(proposal, repository):
    target, current = file_target(repository, proposal.path)
    if proposal.status != 'applied' or hashlib.sha256(current.encode()).hexdigest() != proposal.after_hash:
        raise ValueError('Apply an unchanged approved proposal before checking it')
    git(repository.path, 'diff', '--check')
    if target.suffix == '.json':
        json.loads(current)
    elif target.suffix in ('.html', '.htm'):
        parser = HTMLParser()
        parser.feed(current)
        parser.close()
    elif target.suffix == '.py':
        ast.parse(current)
    return {'status': 'passed', 'checks': ['Git whitespace/conflict check', 'Available static syntax parser'],
            'limits': 'Static checks are not application behavior tests. Run trusted framework build/tests locally before an authorized PR; no arbitrary commands are executed by this service.'}


def rollback_proposal(db, proposal, repository, approval):
    if approval != 'rollback local proposal' or proposal.status != 'applied':
        raise ValueError('Explicit owner rollback approval is required')
    target, current = file_target(repository, proposal.path)
    if hashlib.sha256(current.encode()).hexdigest() != proposal.after_hash:
        raise ValueError('The file has subsequent edits; rollback refused')
    if git(repository.path, 'branch', '--show-current') != proposal.branch or git(repository.path, 'rev-parse', 'HEAD') != proposal.results.get('baseline_commit'):
        raise ValueError('Branch or commit changed; review rollback manually')
    target.write_bytes(proposal.before_text.encode('utf-8'))
    proposal.status = 'rolled_back'
    audit(db, proposal.tenant_id, 'proposal_rolled_back', proposal.id)


def pr_body(proposal):
    return f'## Change\n\nReviewed SEO source update to `{proposal.path}`.\n\n## Validation\n\n{json.dumps(proposal.results.get("checks", {}), indent=2)}\n\nNo production deployment or publication is requested automatically.\n'
