"""Opt-in integration suite. Runs real containers only on a local/dedicated test host.
STUDIO_TEST_DOCKER=1 python manage.py test apps.studio.tests_sandbox
"""
import os
import subprocess
from unittest import skipUnless

from django.test import SimpleTestCase
from .runner import execute


@skipUnless(os.environ.get('STUDIO_TEST_DOCKER') == '1', 'Set STUDIO_TEST_DOCKER=1 with Docker and reviewed runtime images available.')
class SandboxIntegrationTests(SimpleTestCase):
    def test_python_correct_program(self):
        result = execute('import json,sys\na=json.loads(sys.stdin.read())\nprint(sum(a))', 'python', '[2,3,5]')
        self.assertEqual(result['status'], 'ok', result)
        self.assertEqual(result['output'].strip(), '10')

    def test_javascript_correct_program(self):
        result = execute('const fs=require("fs");console.log(JSON.parse(fs.readFileSync(0,"utf8")).reduce((a,b)=>a+b,0))', 'javascript', '[2,3,5]')
        self.assertEqual(result['status'], 'ok', result)
        self.assertEqual(result['output'].strip(), '10')

    def test_runtime_and_syntax_errors_are_not_success(self):
        for source in ['raise ValueError("candidate failure")', 'def invalid(:']:
            with self.subTest(source=source):
                result = execute(source, 'python', '')
                self.assertEqual(result['status'], 'runtime_error', result)

    def test_time_and_output_limits(self):
        self.assertEqual(execute('while True: pass', 'python', '')['status'], 'timeout')
        self.assertEqual(execute('print("x"*100000)', 'python', '')['status'], 'output_limit')

    def test_memory_limit(self):
        result = execute('a=bytearray(512*1024*1024);print(len(a))', 'python', '')
        self.assertIn(result['status'], ['memory_or_process_limit', 'runtime_error'], result)

    def test_network_root_and_source_writes_are_denied(self):
        source = '''import socket
for path in ["/source/main.py", "/studio-test-file"]:
    try:
        open(path,"w").write("changed")
        print("UNSAFE")
    except OSError:
        print("write denied")
s=socket.socket();s.settimeout(1)
try:
    s.connect(("1.1.1.1",53));print("UNSAFE")
except OSError:
    print("network denied")
'''
        result = execute(source, 'python', '')
        self.assertEqual(result['status'], 'ok', result)
        self.assertEqual(result['output'].splitlines(), ['write denied', 'write denied', 'network denied'])

    def test_process_limits(self):
        source = '''import subprocess
children=[]
try:
    for _ in range(50):
        children.append(subprocess.Popen(["sleep","1"]))
    print("UNSAFE")
except OSError:
    print("process limit enforced")
finally:
    for p in children:
        p.terminate();p.wait()
'''
        result = execute(source, 'python', '')
        self.assertEqual(result['status'], 'ok', result)
        self.assertIn('process limit enforced', result['output'])

    def test_containers_are_removed_after_timeout(self):
        before = subprocess.check_output(['docker','ps','-aq','--filter','name=ch-studio-'], text=True)
        execute('while True: pass', 'python', '')
        after = subprocess.check_output(['docker','ps','-aq','--filter','name=ch-studio-'], text=True)
        self.assertEqual(before, after)
