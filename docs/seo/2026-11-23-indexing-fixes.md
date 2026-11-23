# Interview indexing fixes — 23 November 2026

This report records local implementation and pre-deployment verification. Production was checked before deployment using certificate-verified HTTPS requests. Search Console indexing outcomes remain unverified.

## Findings and fixes

1. **Published guides inherited a lesson-count exclusion.** `/interview/data-science/` resolves through `App.tsx` to `LearnFrame` and `InterviewPrep`. `learningMeta()` in `src/seo/learning.ts` consulted `prep-generated/manifest.json` and emitted `noindex` below three substantive lessons. Data Science has two real lessons, exported from `backend/apps/courses/prep_content/data-science/`, and its questions, examples and explanations already render in initial HTML. The same metadata feeds `entry-server.tsx` → `prerender.mjs` → `dist/interview/data-science/index.html` and the browser's `useSeo()` effect. Nginx serves that file without an indexing exclusion header. The production response reproduced this mechanism: **200, correct canonical, `robots: noindex, follow`, no Googlebot tag, no X-Robots-Tag**, and omission from the 332-entry static sitemap.

   The rule now allows guides with at least one substantive exported source lesson. The exporter still rejects placeholders. This deliberately separates publication of existing useful content from completion of an entire 30-day curriculum. The five affected primary URLs are `/interview/data-science/`, `/interview/aws-developer-associate/`, `/interview/aws-certified-solutions-architect/`, `/interview/java-full-stack-developer-gen-ai/`, and `/interview/mern-stack/`. Their published source-backed aliases inherit the same correction. No-source workspaces, planned daily briefs and empty levels retain their existing exclusions. No content, authentication, permissions or stored progress was changed.

2. **All eight topic guides lost their metadata after JavaScript ran.** `InterviewGuide` used `LearnFrame`, which interpreted `guides` as a course slug, resulting in `noindex` and the `/interview/` canonical. Initial HTML was correct. Added shared `interviewGuideMeta()` and an explicit metadata override for `LearnFrame`; the server and browser now agree on title, description, canonical, robots and LearningResource schema. Regression tests reproduced the original failure for every guide.

3. **Legacy redirects took two hops for slashless URLs.** Nginx now normalizes `/interview-prep` and its nested paths directly to the corresponding preferred `/interview/.../` URL. Query strings survive. Existing certificate redirects remain. No public interview resource was deleted.

4. **Retired store variants redirected before failing.** Existing retirement documentation and routes establish that Store, cart, checkout and order/download screens are retired. Removed Store from the generic slash-normalization rewrites: `/store/` and `/store/<slug>/` now return 404 directly, matching their slashless counterparts. Existing 404 handling remains for all other retired commerce routes. No new retirement or database operation was introduced.

5. **Discovery and validation now follow canonical publication.** The Interview hub's static HTML already links to Data Science and the other course guides. Its roadmap list now omits the five duplicate curriculum aliases in favor of existing primary entries, while functional aliases and saved-progress links remain available. Removed retired Store/cart and obsolete certificate URLs from the CSS coverage utility, including its synthetic 200 mocks; corrected the video-source document's route references without renaming assets. The sitemap generator fails if an eligible page's final head has any robots/Googlebot exclusion or lacks exactly one self-canonical. Build validation rejects retired links instead of allowing them as app or CMS routes. The HTTP smoke check now inspects every robots/Googlebot tag, duplicate canonicals, and restrictive headers, including `none`.

## Target response evidence

| Check | Local production build, served through Nginx | Production before deployment |
| --- | --- | --- |
| URL | `/interview/data-science/` | `https://codinghubs.in/interview/data-science/` |
| HTTP | 200 | 200 |
| Canonical | Exactly one: `https://codinghubs.in/interview/data-science/` | Same |
| Robots meta | Exactly one: `index, follow, max-image-preview:large` | `noindex, follow` |
| Googlebot meta | Absent; no conflicting directive | Absent |
| X-Robots-Tag | Absent | Absent |
| Static sitemap inclusion | Yes; 337 entries | No; 332 entries |
| Main content | Questions, answers, examples and lesson material in initial HTML; also checked in Chrome | Existing page and exclusion reproduced; no claim of changed production behavior |

The local server used the repository's main HTTPS virtual-host routing rules on loopback HTTP, with local paths/upstream substituted and TLS/HTTP2/gzip_static omitted. Nginx 1.31.8 passed configuration validation. This establishes routing, status and headers locally; it does not establish production TLS, CDN, admin-subdomain or staging behavior. An isolated temporary Django database provided proxied directory responses. The existing local database was opened read-only for evidence inspection only; no migrations or writes were run against it.

## Inventory and URL disposition

No Search Console URL export, URL-level traffic export, or backlink export was found. Existing `url-inventory.csv`, `current-static-url-inventory.csv`, `course-page-inventory.csv`, and `artifacts/seo-audit/` contain historical repository/crawler evidence, not the missing Search Console exclusion export. The existing local database has no cached GSC fields or slug redirect records available for this audit. Neither zero traffic nor absence of backlinks is inferred. The Search Console sync command was not run because it writes cached records and only covers blogs.

The current build enumerates **1,716 pages**. Full route/file/canonical/directive evidence is in the local artifact `artifacts/indexing-2026-11-23/all-built-urls.csv` and `inventory.json`. The committed [review inventory](2026-11-23-interview-url-inventory.csv) lists all 43 course-guide routes, all eight topic guides, and 15 cleanup/redirect examples.

| Route family | Build classification | Disposition |
| --- | --- | --- |
| `/interview/<course>/` | 20 source-backed primaries; five aliases; 18 without a published source | Index the primaries, canonicalize aliases without noindex, retain no-source workspaces with noindex. All have active application/content roles. |
| `/interview/guides/<slug>/` | Eight published, distinct topic guides | Keep all eight indexable and self-canonical in initial HTML and after navigation. |
| `/interview/<course>/levels/...` | 1,586 pages: 231 indexable, 1,355 excluded by existing noindex rules | Preserve study briefs, incomplete levels and functional duplicates. The excluded set includes 186 alias-level/article/day URLs. These are not verified unused URLs. |
| Other build pages | 78 sitemap entries, plus the noindex 404 document | Preserve. The static sitemap total is 337. |
| `/interview-prep` and descendants | Legacy route family with exact successor | Preserve permanent redirects, omit legacy URLs from sitemap and active discovery links. |
| `/certificates[/<course>]` | Existing legacy certificate entry points | Preserve existing redirects to Interview; in-page certificates/progress remain functional. |
| `/store[/<slug>]`, `/cart`, `/checkout`, `/payment/*`, `/my-account/orders`, `/my-account/downloads` | Already retired by the repository's prior Store-removal work | Preserve real 404s; remove redundant Store slash redirects and stale diagnostic references. No unrelated homepage redirect. |
| Account/admin/API, CMS drafts/previews, learning staff previews, Gigs pilot | Explicit application/security/publishing exclusions | Preserve existing noindex/access-control behavior. No staging or admin configuration was widened. |
| CMS, projects/guides, tutor/job records, learning library | Dynamic database-backed URLs and existing sitemap endpoints | Preserve publication/active-record/canonical filters. Existing CMS, project-guide and directory tests exercise unpublished records, preview noindex, real 404s and sitemap exclusion of canonical overrides. Production records were not changed or retired. |

Preferred duplicate mappings retained:

| Alias under `/interview/` | Primary under `/interview/` |
| --- | --- |
| `ai-engineering/` | `ai-engineering-diploma/` |
| `vibe-coding/` | `vibe-coding-with-ai/` |
| `data-science-pro/` | `data-science/` |
| `aws-solutions-architect/` | `aws-certified-solutions-architect/` |
| `azure-az-104/` | `azure-administrator-az-104/` |

Redirect mappings verified through Nginx:

- `/interview-prep` and `/interview-prep/` → `/interview/` (301).
- `/interview-prep/data-science` and its trailing-slash variant → `/interview/data-science/` (301).
- `/interview-prep/data-science/levels/1?review=1` → `/interview/data-science/levels/1/?review=1` (301).
- `/interview-prep/generative-ai/levels/1/articles/ai-ml-deep-learning/?review=1` → corresponding `/interview/...` URL, preserving query (301).
- `/certificates/data-science` → `/interview/data-science/` (existing 301).
- `/interview/data-science` → `/interview/data-science/` (existing 301).

Every listed destination returned 200 without another redirect. The complete legacy rule preserves arbitrary nested path tails and adds the preferred trailing slash; nonexistent successor routes still return 404 rather than redirecting to an unrelated resource.

`robots.txt` allows public Interview paths and crawling needed to observe account noindex responses. Its only disallows are admin, admin-panel and API paths. It declares `https://codinghubs.in/sitemap-index.xml` and the separate `sitemap-learning.xml`; the index references the static, content, shop-resource and directory sitemaps. No robots change was necessary. The remaining shop-named sitemap serves retained projects/guides and is an active dependency, so it was not removed.

## Remaining evidence and editorial work

- The reported **456 noindex, 90 discovered-but-not-indexed, eight alternate canonical URLs**, and individual 404/redirect/canonical mismatch entries have no accompanying URL list. They cannot be mapped to this build or treated as unused. Export each reason's URLs with report date, last crawl, user canonical and Google-selected canonical. Inspect exact affected URLs after deployment. Supply Search Performance landing-page clicks/impressions, analytics landing pages, backlinks and server logs before proposing further retirement.
- No URL-level “Crawled — currently not indexed” examples were available. The target and representative public pages contain main content without JavaScript; the browser and sitemap checks verify discovery and metadata, not Google's content evaluation. The five shared-curriculum aliases are known duplicates and retain their existing primary canonicals. Other canonical mismatches need their exact URLs and response/rendered evidence.
- Data Science publishes two substantive lessons, Java/MERN one each, and the two AWS guides two each. Publication now permits their existing material; this does not certify completeness or guarantee indexing. Editorial review should decide which missing lessons to write next, based on actual demand and query intent, rather than generating filler.
- The 18 no-source course workspaces remain noindex and retain users' progress functionality. Their precise slugs are in the review inventory. Empty levels and planned daily briefs also remain available and excluded; do not delete them based on their exclusion status.
- Level, article and day interfaces reuse source lesson material for reading, daily tasks and progress. Decide editorially whether a particular article/day pair should share one search landing URL after comparing its actual content and demand. No blanket canonical change or route removal was made for these distinct application views.

## Verification

- Regression first: the added interview tests failed on the original implementation (15 failures, three passes), including Data Science, its alias and all eight topic guides; all now pass.
- `npm test`: **37 tests passed** across six files. Existing private metadata and missing-page tests remain green.
- `node --test scripts/seo-html.test.mjs`: **three tests passed**, covering second robots tags, Googlebot overrides, `none`, attribute ordering, canonical duplicates and ignored comments/body text.
- `npm run build`: TypeScript, production browser build, SSR build, 1,716 prerendered pages, 337 sitemap entries, and precompression passed. Existing bundler warnings remain.
- `npm run validate`: content synchronization, Interview index, prep, GenAI, roadmaps, SEO, all sitemap links/reachability and all 18 location pages passed.
- `npm run lint`: passed with existing warnings; no lint errors.
- `DATABASE_URL=sqlite:///:memory: FRONTEND_SHELL_URL= DEBUG=True env/bin/python manage.py test apps.content apps.shop.test_retirement.RetiredStoreRoutesTests apps.accounts.test_interview apps.content.test_directory_seo`: **74 tests passed** on a disposable database.
- Same isolated environment, `manage.py test apps.shop.tests.SeoTests apps.shop.tests.ProjectGuideTests.test_guide_preview_needs_a_signed_token_and_is_noindex`: **five tests passed**.
- `node scripts/verify-indexing.mjs http://127.0.0.1:18183`: all **337 sitemap URLs** returned 200 with one preferred canonical and no robots/Googlebot/header noindex; five intentional exclusions, two functional aliases, eight single-hop redirects and ten real 404 probes passed.
- `node scripts/verify-indexing-browser.mjs http://127.0.0.1:18183`: **14 rendered-head observations** passed in isolated guest Chrome, including hub → Data Science → hub → searched topic guide navigation, all eight topic guides, private login and a no-source workspace. No uncaught page errors. These tests do not assert that all APIs/assets across the application are error-free.
- `git diff --check`: passed. Verification made no migrations or data edits against existing databases, changed no authentication controls, and did not deploy.

Detailed local JSON/CSV/log evidence is retained under `artifacts/indexing-2026-11-23/` (ignored by Git). Verification scripts are included as repository source and can be rerun against a site served by Nginx with its backend available. The live-site all-sitemap HTTP smoke tool also remains available as `npm run seo:smoke`.

## Changed files

- Metadata/publication: `frontend/src/seo/learning.ts`, new `frontend/src/seo/interview-guide.ts`, `frontend/src/learning/LearnFrame.tsx`, `frontend/src/interview/InterviewGuide.tsx`, `frontend/src/entry-server.tsx`.
- Discovery/route cleanup: `frontend/src/interview/InterviewHub.tsx`, `frontend/nginx.conf`, `frontend/scripts/css-coverage.mjs`, `frontend/public/assets/hero/video/SOURCE.md`.
- Sitemap/verification: `frontend/scripts/prerender.mjs`, `frontend/scripts/validate-seo.mjs`, `frontend/scripts/seo-smoke.mjs`, new `seo-html.mjs`, `seo-html.test.mjs`, `verify-indexing.mjs`, `verify-indexing-browser.mjs`, `frontend/src/seo/interview-indexing.test.tsx`, and the frontend package scripts.
- Evidence/report: this document and `2026-11-23-interview-url-inventory.csv`.

## After deployment

1. Fetch Data Science and the other four priority guides from production; confirm 200, one preferred HTTPS canonical, one indexable robots tag, no Googlebot/header exclusion, and sitemap inclusion. Check rendered metadata on a topic guide and retain login/draft-preview exclusions. Test a slashless legacy redirect and both retired Store variants.
2. Run Search Console **URL Inspection → Test live URL** for Data Science, the four other affected primary guides, and representative topic guides. Inspect tested HTML, then verify the indexed version's last crawl and Google-selected canonical when refreshed.
3. Submit/resubmit `https://codinghubs.in/sitemap-index.xml` and confirm its child sitemaps are readable. Retain the separately declared learning sitemap submission. Request indexing for the five priority primary guides and representative corrected topic guides after their live tests pass. Do not submit duplicate aliases or no-source workspaces.
4. Use **Validate Fix** for the relevant noindex issue after production checks pass, then monitor URL-level results and updated Page Indexing reports. Crawl/index updates are asynchronous; these changes establish eligibility and discovery, not a promise of indexing.
