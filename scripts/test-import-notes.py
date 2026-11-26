import importlib.util
from pathlib import Path
import unittest

from bs4 import BeautifulSoup

spec = importlib.util.spec_from_file_location('notes_importer', Path(__file__).with_name('import-notes.py'))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class NotesImportTests(unittest.TestCase):
    def sanitize(self, html):
        return importer.sanitize(BeautifulSoup('<div>' + html + '</div>', 'html.parser').div)

    def test_preserves_code_tables_and_explanations(self):
        result = self.sanitize('<h2>Example</h2><pre><code>print(&quot;hello&quot;)\nif x &lt; 2:\n    pass</code></pre><table><tr><td colspan="2">A &amp; B</td></tr></table>')
        self.assertIn('print("hello")\nif x &lt; 2:', result)
        self.assertIn('<td colspan="2">A &amp; B</td>', result)

    def test_removes_executable_content_and_nested_controls(self):
        result = self.sanitize('<p onclick="bad()" style="color:red">Keep me</p><form><div><input><button>Submit</button></div></form><script>bad()</script><a href="javascript:bad()">Bad</a><img src="data:text/html,evil" onerror="bad()">')
        self.assertIn('<p>Keep me</p>', result)
        for unsafe in ['onclick', 'onerror', '<script', '<form', '<input', '<button', 'javascript:', 'data:']:
            self.assertNotIn(unsafe, result)

    def test_rewrites_subject_and_topic_links(self):
        result = self.sanitize('<a href="/notes/python">Python</a><a href="https://codingnowai.in/notes/python/history-of-python">History</a>')
        self.assertIn('href="/notes/python/"', result)
        self.assertIn('href="/notes/python/?topic=history-of-python"', result)


if __name__ == '__main__':
    unittest.main()
