"""Dedicated runner ONLY. Never import this module from web request handlers."""
import json
import os
import selectors
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

from django.conf import settings

MAX_OUTPUT = 32768


def docker_arguments(name, source, language):
    image = settings.STUDIO_PYTHON_IMAGE if language == 'python' else settings.STUDIO_NODE_IMAGE
    command = ['python', '-I', '-B', '/source/main.py'] if language == 'python' else ['node', '/source/main.js']
    return ['docker', 'run', '--rm', '--pull=never', '--name', name, '--network=none', '--read-only', '--user=65534:65534', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--cpus=0.5', '--memory=128m', '--memory-swap=128m', '--pids-limit=32', '--ulimit=nofile=64:64', '--ulimit=fsize=1048576:1048576', '--tmpfs=/tmp:rw,noexec,nosuid,size=16m,mode=1777', '--mount', f'type=bind,src={source},dst=/source,readonly', '-i', image, *command]


def execute(code, language, stdin):
    if language not in ['python', 'javascript']:
        raise ValueError('Unsupported runtime')
    name = 'ch-studio-' + uuid.uuid4().hex
    start = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='ch-studio-') as directory:
        os.chmod(directory, 0o755)
        path = Path(directory) / ('main.py' if language == 'python' else 'main.js')
        path.write_text(code)
        path.chmod(0o444)
        proc = None
        try:
            proc = subprocess.Popen(docker_arguments(name, directory, language), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            try:
                proc.stdin.write(stdin.encode())
                proc.stdin.close()
            except BrokenPipeError:
                pass
            output = bytearray()
            state = 'ok'
            with selectors.DefaultSelector() as selector:
                selector.register(proc.stdout, selectors.EVENT_READ)
                while selector.get_map():
                    if time.monotonic()-start > 8:
                        state = 'timeout'
                        break
                    for key, _ in selector.select(timeout=0.1):
                        chunk = os.read(key.fd, 4096)
                        if not chunk:
                            selector.unregister(key.fileobj)
                            continue
                        output.extend(chunk)
                        if len(output) > MAX_OUTPUT:
                            state = 'output_limit'
                            break
                    if state != 'ok':
                        break
            if state == 'ok':
                proc.wait(timeout=1)
                if proc.returncode == 125:
                    state = 'infrastructure_error'
                elif proc.returncode == 137:
                    state = 'memory_or_process_limit'
                elif proc.returncode != 0:
                    state = 'runtime_error'
            return {'status': state, 'output': output[:MAX_OUTPUT].decode('utf-8', errors='replace'), 'duration_ms': int((time.monotonic()-start)*1000)}
        except (OSError, subprocess.TimeoutExpired):
            return {'status': 'infrastructure_error', 'output': '', 'duration_ms': int((time.monotonic()-start)*1000)}
        finally:
            # Also remove the container after CLI timeout/crash; --rm alone is insufficient.
            try:
                subprocess.run(['docker', 'rm', '-f', name], capture_output=True, timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                pass
            if proc is not None:
                if proc.poll() is None:
                    proc.kill()
                proc.wait()
                proc.stdout.close()


def equal_output(actual, expected):
    try:
        return json.dumps(json.loads(actual), sort_keys=True) == json.dumps(json.loads(expected), sort_keys=True)
    except (ValueError, TypeError):
        return actual.strip() == expected.strip()


def run_submission(submission):
    tests = submission.session.snapshot['tests']
    if submission.mode == 'sample':
        tests = [t for t in tests if not t['hidden']]
    elif submission.mode == 'custom':
        tests = [{'stdin': submission.custom_input, 'expected': None, 'hidden': False}]
    results = []
    for test in tests[:100]:
        run = execute(submission.code, submission.language, test['stdin'])
        result = {'hidden': test['hidden'], 'status': run['status'], 'passed': None if test['expected'] is None or run['status'] == 'infrastructure_error' else run['status'] == 'ok' and equal_output(run['output'], test['expected']), 'duration_ms': run['duration_ms']}
        if not test['hidden']:
            # Runtime output is text, never HTML; infrastructure diagnostics are suppressed.
            result.update(output=run['output'] if run['status'] != 'infrastructure_error' else '', input=test['stdin'], expected=test['expected'])
        results.append(result)
        if run['status'] == 'infrastructure_error':
            break
    return results
