import re
from pathlib import Path

from django.test import SimpleTestCase

from . import robots

TS = Path(__file__).resolve().parents[3] / 'frontend' / 'src' / 'seo' / 'robots.ts'


class RobotsRuleTests(SimpleTestCase):
    def test_python_rule_matches_the_frontend_module(self):
        if not TS.exists():  # the backend image does not contain the frontend sources
            self.skipTest('frontend/src/seo/robots.ts is not available')
        source = TS.read_text()
        for name in ('INDEX', 'NOINDEX', 'PRIVATE'):
            self.assertIn(f"export const {name} = '{getattr(robots, name)}'", source)
        self.assertEqual(int(re.search(r'hubMinCompleteLessons:\s*(\d+)', source).group(1)), robots.HUB_MIN_COMPLETE_LESSONS)

    def test_directives(self):
        self.assertEqual(robots.get_robots_directive('COMPLETE'), 'index, follow, max-image-preview:large')
        self.assertEqual(robots.get_robots_directive('THIN'), 'noindex, follow')
        self.assertEqual(robots.get_robots_directive('PLACEHOLDER'), 'noindex, follow')
        self.assertEqual(robots.get_robots_directive('COMPLETE', private=True), 'noindex, nofollow')
        self.assertEqual(robots.hub_status(0), 'PLACEHOLDER')
        self.assertEqual(robots.hub_status(1), 'COMPLETE')
