# Coding Hubs SEO audit — 28 November 2026

## Scope and conclusion

Audited repository architecture, the final built public HTML and the live sitemap hierarchy. [SEO_URL_INVENTORY.csv](SEO_URL_INVENTORY.csv) contains **1,709 known content URLs**, with requested metadata, heading, canonical, schema, link-count and content-size fields. **300 sitemap URLs** were HTTP-verified: 228 initially returned 200; 58 initially returned 502 and 14 had connection errors. All 72 failed requests returned 200 on a second, two-worker check. These are observations at different times, not proof of uninterrupted uptime. Generic missing URL `/seo-check-nonexistent-20261128` returned 404. The internal public `/content-shell.html` probe also returned 404.

The crawler fetched robots first, used two workers, followed same-origin sitemap children and made no submissions or JavaScript view-count calls. Built-only rows explicitly say `unverified` for HTTP. Internal-link adjacency is retained in `artifacts/seo-growth/final-inventory.json`; the CSV gives counts. Content word counts are review signals, not a quality score. Verification files, app fallback and shell artifacts are not educational content pages. Complete external-link crawling and CMS/private-record inventories were not available.

## Architecture inspected

| Area | Existing implementation | Decision |
|---|---|---|
| Frontend | React 19, Vite 8, TypeScript | Keep framework and design |
| Rendering | Build-time React rendering/prerendering; homepage hydration; lazy client routes | Keep SSR/SSG content visible without JS |
| Backend | Django/DRF, JWT/session auth; SQLite locally, PostgreSQL in CI/production | Preserve auth, database and APIs |
| Dynamic content | Django HTML and API payloads for blogs, cases, projects, guides, directory/course records | Preserve publication rules and SSR |
| CMS | Separate React admin; revisions, preview tokens, publishing, sanitized HTML | Guard existing editorial changes |
| Learning | Course catalogue, interview hubs/levels/articles; completeness-based robots rules | Keep incomplete lessons noindex |
| Locations | 20 existing locality guides and a central location hub | No fabricated branches or new doorway pages |
| Metadata | `seo/site.ts`, `useSeo.ts`, learning/location modules and Django content services | Extend current system rather than duplicate it |
| Canonicals/redirects | Existing nginx normalization and Django slug redirects | No URL migrations needed for this work |
| Sitemaps | Master index plus static/content/shop/directory children | Keep current working architecture |
| Schema | Existing Organization/EducationalOrganization, pages, breadcrumbs, Course, Article, lists | Match visible facts; no fabricated ratings/offers |
| Images/fonts | Responsive hashed assets, modern formats, self-hosted fonts and below-fold lazy loading | Preserve existing optimizations |
| Internal links | Crawlable cards, course guides, learning navigation, contextual article links | Add relevant links through existing components |
| Analytics | Deferred GA4 tag, accepted-lead events and delegated contacts | Fill conversion gaps; minimize custom-event data |
| GSC | Read-only service-account integration, blog inspection sync | Fix dates; add bounded multi-period exports |
| Deployment | GitHub Actions test/build gates, ECR images, EC2/SSM deployment on main | Work on local branch; do not push |

## Prioritized findings

| ID | Priority | Finding | Outcome |
|---|---|---|---|
| GSC-01 | P1 | Existing 28-day request included 29 calendar days and only one page of rows | Fixed exact inclusive dates; bounded pagination and explicit truncation; tests pass |
| MEASURE-01 | P1 | Requested course, interview, enquiry, demo and download events were missing | Added custom events with deduplication, allowlisted parameters and failure isolation; local tests pass |
| OPS-01 | P1 monitor | Transient 502/connection failures during live crawl | All 72 recovered; production logs/ongoing availability still need operational review; cause not proven |
| DATA-01 | P1 blocked | No local authorized GSC credentials, GA4 reporting access or backlink dataset | Reports mark unavailable data; read-only reporting tool ready |
| CONTENT-01 | P1 | Priority queries can be served better by existing articles | 11 source articles improved; guarded, dry-run-first CMS updater prepared |
| LINKS-01 | P2 | Five course pages had no curated guide mapping | Added 15 relevant course-to-article links; 26 contextual internal links added in source answer sections |
| TRUST-01 | P2 owner | Current fees, batches, qualifications, GBP and placement facts need verification | No invented claims, prices, authors, ratings or branches added |
| PERF-01 | P2 measurement | Field p75 data unavailable; remote PSI returned 429 | Local timings and regression tests recorded; no speculative performance rewrite |
| QA-01 | P2 | Two old browser assertions expected a newsletter on the homepage | Moved consent assertion to its existing newsletter route; retained current footer/no-JS checks |

No persistent P0 indexing blocker was reproduced. Do not read that as a guarantee of rankings, Google indexing, external resource correctness or future uptime.

## Completed work and remaining work

Actual source changes cover GSC reporting correctness, safe funnel measurement, 11 answer/metadata updates, one runnable original resource, five course guide mappings, accurate lastmod updates for two affected sitemap pages and new CI checks. Production CMS content has not been overwritten. Source/live differences, including earlier blog-consolidation intentions versus currently published legacy URLs, require editorial reconciliation before additional redirects or withdrawals.

Existing validators pass for 203 canonical static sitemap URLs. Sitemap eligibility does not mean Google has indexed those URLs. Historical GSC validation-triage CSVs in `docs/seo/` were identified as historical, not current performance exports.

## Evidence and limits

Audit date: 28 November 2026. Changes are local on `work/seo-growth-20261128`; production push is not authorized by this brief. Fresh evidence is under `artifacts/seo-growth/`; blank metrics mean unavailable, not zero. See [SEO_MASTER_STATUS.md](SEO_MASTER_STATUS.md) and [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md).
