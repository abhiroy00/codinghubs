import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

from seo_inventory import ROOT, built_page_files, inspect_html


class SeoInventoryTests(unittest.TestCase):
    def test_homepage_inventory_matches_nginx_not_the_private_spa_shell(self):
        with TemporaryDirectory() as directory:
            dist = Path(directory)
            for name in ('index.html', 'home.html', '__shell.html', 'program/ai-for-all.html'):
                file = dist / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text('<html></html>')
            pages = dict(built_page_files(dist))
            self.assertEqual(pages['/'].name, 'home.html')
            self.assertIn('/program/ai-for-all', pages)
            self.assertNotIn('/__shell', pages)

    def test_duplicate_tags_and_restrictive_robots_are_detected(self):
        html = '<head><title>A</title><title>B</title><meta name="googlebot" content="noindex"><link rel="canonical" href="https://codinghubs.in/a"></head><main><h1>A</h1></main>'
        row = inspect_html(html, 'https://codinghubs.in/a', True, 200)
        self.assertEqual(row['indexability'], 'noindex')
        self.assertIn('sitemap_noindex', row['issues'])

    def test_missing_public_metadata_and_bad_json_are_reported(self):
        row = inspect_html('<main><h1>A</h1><img src="/a.png"><script type="application/ld+json">bad</script></main>', 'https://codinghubs.in/a', True, 200)
        self.assertTrue({'title_count:0', 'description_count:0', 'canonical_count:0', 'invalid_json_ld', 'images_missing_alt:1'} <= set(row['issues']))

    def test_canonical_sitemap_page_is_eligible_and_links_are_normalized(self):
        html = '<head><title>A</title><meta name="description" content="Useful A"><link rel="canonical" href="https://codinghubs.in/a"></head><main><h1>A</h1><p>Actual answer.</p><a href="/b#answer">B</a><a href="mailto:x@example.test">Email</a></main>'
        row = inspect_html(html, 'https://codinghubs.in/a', True, 200)
        self.assertEqual(row['issues'], [])
        self.assertEqual(row['internal_links'], ['https://codinghubs.in/b'])
        self.assertEqual(row['main_word_count'], 5)

    def test_sitemap_index_is_valid_xml_and_only_lists_owned_public_children(self):
        path = ROOT / 'frontend/public/sitemap-index.xml'
        root = ET.parse(path).getroot()
        self.assertEqual(root.tag, '{http://www.sitemaps.org/schemas/sitemap/0.9}sitemapindex')
        urls = [el.text for el in root.iter() if el.tag.endswith('}loc')]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertTrue(urls)
        for url in urls:
            parts = urlsplit(url)
            self.assertEqual((parts.scheme, parts.netloc), ('https', 'codinghubs.in'))
            self.assertRegex(parts.path, r'^/sitemap(?:-[a-z]+)?\.xml$')
            self.assertNotEqual(parts.path, '/sitemap-index.xml')
        robots = (ROOT / 'frontend/public/robots.txt').read_text()
        self.assertIn('Sitemap: https://codinghubs.in/sitemap-index.xml', robots)

    def test_sitemap_index_matches_actual_static_and_dynamic_routes(self):
        xml = (ROOT / 'frontend/public/sitemap-index.xml').read_text()
        for child in ('sitemap.xml', 'sitemap-content.xml', 'sitemap-shop.xml', 'sitemap-directory.xml'):
            self.assertIn(f'https://codinghubs.in/{child}', xml)
        self.assertTrue((ROOT / 'frontend/scripts/prerender.mjs').exists())


if __name__ == '__main__':
    unittest.main()
