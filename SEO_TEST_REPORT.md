# SEO test and evidence report

## Fresh verification

| Check | Result | Scope / limits |
|---|---|---|
| `DEBUG=True .venv/bin/python manage.py test apps --noinput` | 555 tests completed; OK, 8 existing skips | Isolated SQLite; production PostgreSQL remains CI verification |
| GSC focused reporting + existing sync test | 6 passed | Exact dates, pagination, explicit limits and compatibility |
| Guarded update + reporting tests | 9 passed | Dry run, no editor overwrite, restore point, counters/status, idempotence and public HTML |
| All source/update hashes | 11 checked | Sanitized source matches frozen pack; within 10,000-word editor limit |
| `npm run test:analytics` | 6 passed | Event semantics, data minimization, deduplication and blocked analytics failure |
| `python -m unittest discover -s scripts -p 'test_seo*.py'` | 6 passed | Metadata parser, canonical/link checks, XML ownership, nginx homepage artifact |
| Frontend `npm run build` | Passed | 1,612 prerendered outputs; static/dynamic import warnings retained |
| Admin `npm run build` | Passed | Existing large-editor chunk warning retained |
| `npm run validate` and final `validate:seo` | Passed | 203 preferred static URLs, lastmod, source resources, locations and learning gates |
| Existing performance + enquiry browser suite | 12 passed | Desktop/mobile, hydration, delayed CSS, no-JS, newsletter privacy link, forms and safe enquiry events |
| Enquiry event assertions | 4 enquiry scenarios passed | No lead for 503; one event per funnel stage after 201; no fixture contact values in event queue |
| Changed Python ruff checks / frontend lint | Passed; existing frontend warnings | No warning gate weakened |
| Default frontend `npm test` | Inconclusive: timed out | Baseline also stalled; direct `@testing-library/react` import stalled; unit checks were not disabled |
| Live crawl/recheck | 300 sitemap URLs observed at 200 | 72 initial failures recovered; not an uptime guarantee or Google indexing proof |
| Generic missing URL | 404 | One clearly nonexistent public URL |
| PageSpeed Insights | Blocked by 429 | No remote score or field data invented |

## Failure handling

Before fixes, tests reproduced the 29-day GSC range and missing reporting helpers, missing funnel events and unsafe analytics failure propagation. CMS update tests initially failed because the command did not exist. After implementation the focused checks passed. The initial browser run failed two obsolete homepage-newsletter assertions; baseline source proves that section is on its dedicated route. The consent assertion was moved there and the actual footer policy link remains tested. No tests were skipped to obtain a pass.

## Design/performance evidence

`artifacts/seo-growth/home-baseline-{390,1440}.png` and final counterparts support visual inspection; browser tests prove stable first-screen geometry, retained HTML during hydration and working no-JS rendering. Local unthrottled timings are lab-only:

| Viewport | Baseline / final LCP | Baseline / final CLS |
|---|---|---|
| 390px | 264ms / 156ms | 0.003389 / 0.003389 |
| 1440px | 164ms / 88ms | 0.001038 / 0.001038 |

Run-to-run timing differences are not evidence that these SEO changes caused a speed improvement. No speculative performance rewrite was introduced. INP and 75th-percentile field Core Web Vitals remain unverified. The final report must not claim a remote performance improvement from these observations.

Raw logs: `/tmp/codinghubs-seo-backend-tests.log`, `/tmp/codinghubs-seo-browser-integrated.log`, `/tmp/codinghubs-seo-final-build.log`, `/tmp/codinghubs-seo-final-validation.log`; structured evidence under `artifacts/seo-growth/`. Test outputs under `/tmp` are session-local.

## Evidence and limits

Audit date: 28 November 2026. Changes are local on `work/seo-growth-20261128`; production push is not authorized by this brief. Fresh evidence is under `artifacts/seo-growth/`; blank metrics mean unavailable, not zero. See [SEO_MASTER_STATUS.md](SEO_MASTER_STATUS.md) and [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md).
