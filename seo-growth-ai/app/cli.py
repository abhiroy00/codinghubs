"""Explicit OS-owner operations. No CLI action runs automatically from model output."""
import argparse
import getpass
import json
import os
import re
import subprocess
from pathlib import Path

from sqlalchemy import delete, select

from .config import ROOT, Settings
from .db import database
from .models import Proposal, Repository, Session, Site, User
from .proposals import git, pr_body, register_repository, test_proposal
from .security import PASSWORDS


def load_runtime():
    from scripts.services import environment
    os.environ.update(environment())
    return Settings()


def publish_reviewed_pr(db, proposal, repository, approvals):
    if not all(approvals):
        raise ValueError('Explicit branch-push, draft-PR, framework-test and free-public-CI confirmations are all required')
    if proposal.status != 'applied' or git(repository.path, 'branch', '--show-current') != proposal.branch:
        raise ValueError('An applied local feature-branch proposal is required')
    result = test_proposal(proposal, repository)
    if result['status'] != 'passed':
        raise ValueError('Static proposal checks did not pass')
    if git(repository.path, 'diff', '--cached', '--name-only') or git(repository.path, 'diff', '--name-only').splitlines() != [proposal.path]:
        raise ValueError('Only the reviewed file may be changed and the index must be empty')
    remote = git(repository.path, 'remote', 'get-url', 'origin')
    match = re.fullmatch(r'(?:https://github\.com/|git@github\.com:)([A-Za-z0-9_-][A-Za-z0-9_.-]*/[A-Za-z0-9_-][A-Za-z0-9_.-]*?)(?:\.git)?', remote)
    if not match:
        raise ValueError('Only an explicitly authorized GitHub origin is supported')
    full_name = match.group(1)
    metadata = json.loads(subprocess.run(['gh', 'api', 'repos/' + full_name], capture_output=True, text=True, check=True, timeout=20).stdout)
    if metadata.get('private') is not False:
        raise ValueError('Automatic PR creation is disabled for private/unknown billing accounts; prepare a manual PR instead')
    # Even public CI can use paid runners or cloud tools; fail closed on ambiguous workflows.
    import yaml
    for path in (Path(repository.path) / '.github' / 'workflows').glob('*'):
        if path.suffix not in ('.yml', '.yaml'):
            continue
        workflow = yaml.safe_load(path.read_text())
        if not isinstance(workflow, dict):
            raise ValueError('Workflow could not be verified')
        for job in workflow.get('jobs', {}).values():
            guard = str(job.get('if', ''))
            main_push_only = 'github.ref' in guard and 'refs/heads/main' in guard and 'github.event_name' in guard and "'push'" in guard
            if main_push_only:
                continue  # Not triggered by a feature-branch push or draft PR.
            if job.get('runs-on') not in ('ubuntu-latest', 'windows-latest', 'macos-latest', 'ubuntu-24.04', 'ubuntu-22.04'):
                raise ValueError('Runner pricing cannot be established; automatic PR blocked')
            serialized = json.dumps(job).lower()
            if re.search(r'aws-actions|terraform|pulumi|gcloud|openai|anthropic|semrush|ahrefs|deploy|billing|secrets\.(?!github_token)', serialized):
                raise ValueError('A potentially billable/deploying workflow requires a separately reviewed manual PR')
    body_path = ROOT / '.state' / 'pr-exports' / (proposal.id + '.md')
    body_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    body_path.write_text(pr_body(proposal))
    body_path.chmod(0o600)
    git(repository.path, 'add', '--', proposal.path)
    git(repository.path, 'commit', '-m', 'seo: apply reviewed source proposal')
    git(repository.path, 'push', 'origin', 'HEAD:refs/heads/' + proposal.branch)
    created = subprocess.run(['gh', 'pr', 'create', '--repo', full_name, '--draft', '--base', metadata['default_branch'],
        '--head', proposal.branch, '--title', 'SEO: reviewed source improvement', '--body-file', str(body_path)],
        cwd=repository.path, capture_output=True, text=True, timeout=40, check=True)
    proposal.status = 'pr_created'
    proposal.results = {**proposal.results, 'pull_request_url': created.stdout.strip(), 'owner_confirmed_framework_tests': True}
    db.commit()
    return {'url': created.stdout.strip(), 'state': 'Draft PR only; no merge/deploy performed'}


def main():
    parser = argparse.ArgumentParser(description='Local SEO OS-owner maintenance')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('health')
    commands.add_parser('backup')
    restore = commands.add_parser('restore-test')
    restore.add_argument('--file', required=True)
    register = commands.add_parser('register-repo')
    register.add_argument('--site', required=True)
    register.add_argument('--path', required=True)
    reset = commands.add_parser('reset-password')
    reset.add_argument('--username', required=True)
    prepare = commands.add_parser('prepare-pr')
    prepare.add_argument('--proposal', required=True)
    publish = commands.add_parser('pr')
    publish.add_argument('--proposal', required=True)
    for flag in ['authorize-branch-push', 'authorize-draft-pr', 'confirm-framework-tests-passed', 'confirm-free-public-standard-ci']:
        publish.add_argument('--' + flag, action='store_true')
    args = parser.parse_args()
    settings = load_runtime()
    engine, sessions = database(settings)
    try:
        with sessions() as db:
            if args.command == 'health':
                from sqlalchemy import text
                print(json.dumps({'database': engine.dialect.name, 'connected': db.scalar(text('SELECT 1')) == 1, 'free_only': settings.free_only_mode}))
            elif args.command == 'backup':
                from .operations import backup
                print(json.dumps(backup(settings), indent=2))
            elif args.command == 'restore-test':
                from .operations import restore_test
                print(json.dumps(restore_test(settings, args.file), indent=2))
            elif args.command == 'register-repo':
                site = db.get(Site, args.site)
                if not site:
                    raise ValueError('Local website ID not found')
                repository = register_repository(db, site, settings, args.path)
                db.commit()
                print(json.dumps({'registered': repository.id, 'site_id': site.id, 'tenant_id': site.tenant_id}))
            elif args.command == 'reset-password':
                user = db.scalar(select(User).where(User.username == args.username))
                if not user:
                    raise ValueError('Local username not found')
                password = getpass.getpass('New local password (12–128 characters): ')
                if not 12 <= len(password) <= 128 or password != getpass.getpass('Confirm password: '):
                    raise ValueError('Passwords do not match or length is invalid')
                user.password_hash = PASSWORDS.hash(password)
                db.execute(delete(Session).where(Session.user_id == user.id))
                db.commit()
                print('Local password changed; existing sessions invalidated.')
            elif args.command in ('prepare-pr', 'pr'):
                proposal = db.get(Proposal, args.proposal)
                if not proposal:
                    raise ValueError('Proposal not found')
                repository = db.get(Repository, proposal.results['repository_id'])
                if not repository or repository.tenant_id != proposal.tenant_id or repository.site_id != proposal.site_id:
                    raise ValueError('Repository permission does not match this proposal')
                if args.command == 'prepare-pr':
                    directory = settings.state_dir / 'pr-exports'
                    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
                    path = directory / (proposal.id + '.md')
                    path.write_text(pr_body(proposal))
                    path.chmod(0o600)
                    print(json.dumps({'body_file': str(path), 'network_requests': 0, 'publication': 'None'}))
                else:
                    print(json.dumps(publish_reviewed_pr(db, proposal, repository, [args.authorize_branch_push, args.authorize_draft_pr,
                        args.confirm_framework_tests_passed, args.confirm_free_public_standard_ci])))
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
