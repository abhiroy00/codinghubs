# Local SEO platform verification

**29 November 2026**, Asia/Kolkata. Scope: `seo-growth-ai/` and six root documents on `work/zero-cost-seo-platform`, baseline `9bbf4ea`. Existing production website source is unchanged on this branch.

## Executed checks

| Check | Result | Evidence scope |
|---|---|---|
| `.venv/bin/python -m pytest --cov=app --cov-report=term-missing` | **55 passed**, **69%** app line coverage | Auth/CSRF/Origin/tenant/viewer boundaries, password/session revocation, coherent imports/dedupe/XLSX/long queries, OAuth/quota/API paths, local model schema/cache/fallback, RAG isolation/versioning, ChatGPT source/replay guards, DNS/redirects/robots/history, proposal approvals/stale/dirty/CRLF/rollback, twenty agents and Kolkata daily/weekly/monthly/catch-up |
| `.venv/bin/ruff check app scripts tests` | Passed | Configured syntax/import/error rules |
| `npm test` | **5 passed** | Missing-versus-zero, Kolkata dates, CSRF request handling, multipart boundary and error propagation |
| `npm run build` | Passed | TypeScript + Vite; initial JS 305.82 kB, lazy chart 424.12 kB, CSS 17.35 kB; no 500 kB chunk warning |
| `npm run test:e2e` | **2 passed** | Desktop/mobile Chrome, temporary migrated database, actual UI/API/worker/import/agents/document retrieval/fallback draft/manual export/crawl; no external browser requests or JS errors |
| `npm audit --json` | **0 known advisories** | Full locked frontend dependency set |
| Export locked requirements + `pip-audit -r ... --no-deps --disable-pip` | **96 packages; 0 known advisories after fix** | Updated cryptography 49.0.0 to **50.0.2** after a duplicated advisory record identified one unique issue; reran audit |
| `docker compose config --quiet`; monitoring YAML/JSON parsing | Passed | Configuration syntax only; no container runtime assertion |

Coverage is not a safety guarantee. Remote publication/optional container branches and several failure paths remain outside unit coverage; actual integration checks below are separate evidence. The first pip-audit environment-discovery attempt found zero packages and was discarded as insufficient. Advisory scans are point-in-time evidence. The cryptography correction follows the [upstream security advisory](https://github.com/pyca/cryptography/security/advisories/GHSA-g6cj-pr64-35w5).

## Actual native workflows

Dedicated PostgreSQL **18.3**/pgvector **0.8.7** cluster; Alembic revisions 0001–0003 applied; private socket/loopback and non-superuser app role. Health returned PostgreSQL/OK. Records survived repeated restarts and switching between native and Celery executors. Existing website database/services were not reused.

Seven actual user CSVs imported without changing originals: 30 chart days, 723 queries, 409 pages, 130 countries, 3 devices, one appearance row plus filters. Property totals **126 clicks / 8,048 impressions / 1.57% CTR**; page total impressions 8,673 are kept separate. Complete missing periods remain unknown. These observations predate the platform and do not establish its SEO impact.

Chrome exercised the real PostgreSQL app: owner login, seven-file import, measured dashboard totals, twenty persisted states, blocked missing GA4, document ingestion, explicit local embedding batch, actual pgvector hybrid retrieval, actual structured Qwen draft and manual ChatGPT export. No page JS errors, warnings or external browser requests were observed. Desktop 1440px/mobile 390px screenshots were inspected; mobile document width was 390px. This is a targeted check, not complete WCAG conformance.

Actual local model benchmark: Qwen3 0.6B, 27 output tokens, request elapsed **1.902 seconds**, approximately **95.43 decode tokens/sec**. Nomic returned **768-dimension** vectors. One sample does not establish expert content quality; drafts remain review-required.

Optional **Celery solo + Beat + authenticated Valkey 9.2.0** on loopback 56379 completed real analyze, five-page crawl and mobile jobs. Existing Redis stayed intact. Native lightweight mode was restored afterward. Catch-up/deduplication/calendar behavior is tested; no jobs run while the host is off.

The permitted CodingHubs crawl captured five HTTP-200 pages: home, notes, Python notes, SQL notes and machine-learning notes, with persistent sitemap/frontier/history. The isolated mobile Chrome lab observed one H1, **no 390px overflow**, LCP about **2,812ms**, CLS about **0.00384**, one blocked request, and unavailable INP. Third-party requests, writes and WebSockets were blocked. This single constrained lab run is **not field p75 CWV**, a complete user journey or a site-wide performance verdict.

Private metrics returned **401 without bearer / 200 with bearer**. A native backup was restored into a new disposable database in the app's own cluster. Archive checksums, all **27 mapped-table counts** and restored **vector(768)** schema matched; the disposable database was removed. ZIP excludes the master key/runtime secrets. No recovery of Google authorization is claimed because none was connected.

Lighthouse CLI ran on the local unauthenticated sign-in page, not the production website/authenticated dashboard. Its initial sample scored performance **95**, accessibility **98**, best practices **96**. It found a missing main landmark, which was fixed; those initial scores are historical, not represented as post-fix scores. The session probe's logged 401 is expected. Unused JS/CSS opportunities remain; no perfect-score or field claim is made.

## Corrections, missing inputs and unverified paths

Verification corrected accessible form labels, chart loading, coherent source-set reuse, exact Google API paths, CRLF proposal preservation and a missing sign-in main landmark. E2E initially failed because its mobile test inspected the site selector before sites finished loading; it now waits for the authenticated site list. A newly added weekly test initially patched the wrong module seam; its fixture was corrected and weekly crawl-follow-up behavior passes. Failed checks were not counted as passes.

Real Google OAuth client credentials and authorized GSC/GA4 properties are missing. Live consent, sync, inspection, sitemap submission and GA4 attribution remain unverified. Controlled Google transport tests are not live-account evidence. Competitor/SERP/backlink/manual AI observations and verified business facts require owner data. No fake citations, volumes, enquiries, fees or admissions are generated.

Docker daemon unavailable: Compose/Prometheus/Grafana image execution, container browser support and container restore remain unverified. Native localhost is the tested deployment. No website proposal was applied or published, and no production branch merge/deployment occurred. Feature branch is the delivery target under the user's existing push instruction.

Detailed private evidence lives in `.state/`: model benchmark, browser smoke/screenshots, operations smoke, backup-restore result and Lighthouse JSON. Temporary command logs are `/tmp/codinghubs-local-*`. Tests/configs/locks are delivered; original exports, raw private evidence, credentials, backups and database files are excluded from Git.
