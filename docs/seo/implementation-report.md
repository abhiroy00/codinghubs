# CodingHubs local implementation report — 11 November 2026

## 1. Inspected baseline

Read the repository's framework/dependency manifests, public and admin routing, authentication, learning/catalog/lesson system, AI services, content CMS, store/payment boundaries, SEO builders/validators, robots, nginx, Docker configuration and GitHub Actions deployment workflow. The public app is React 19/Vite/TypeScript with build-time prerendering; database-driven content/shop pages use Django SSR. The staff panel is a separate React app. Production uses Django/DRF, PostgreSQL, nginx and AWS EC2/ECR/SSM, with automatic deployment on pushes to main.

The actual learning inventory has 43 entries, 20 source curricula mapped to 25 entries, and 600 day files. Crucially, file presence did not mean finished teaching content: the existing placeholder detector found 98 substantive lessons and 502 template lessons. Only Generative AI has all 30 substantive lessons. This finding supersedes the early file-count assessment in the discovery notes.

Before changes: frontend build and SEO/location validation passed with 115 static sitemap URLs; lint passed with 97 warnings and no errors; the existing Django suite passed 340 tests. The deeper lesson-runner check subsequently exposed eight fixture/example failures in five Generative AI days. Those source files were unchanged when the failures were discovered.

Live homepage, reference prep page, robots and sitemap retrieval failed through the web tool. Production HTTP status, redirect chains, current CMS inventory, mobile behavior, indexing, traffic and field performance could not be established from the repository. The browser connector was unavailable; native Computer Use then stopped because it could not verify Chrome's URL sufficiently to operate safely. No visual/mobile pass is claimed.

## 2. Changes by area

### Technical SEO

- Shared learning metadata now drives both prerendered HTML and browser navigation: unique titles/descriptions, canonical and OG URLs, robots and structured data.
- Added visible learning breadcrumbs and matching BreadcrumbList data. Retained supported organization/course schemas; did not add fabricated ratings, reviews, outcomes, authors or FAQ/QAPage eligibility claims.
- Added a private-route metadata guard so account, checkout and AI app routes do not inherit indexable metadata during SPA navigation.
- Kept every existing route. Eligible shared-curriculum prep aliases use the primary canonical without a conflicting noindex directive. Incomplete thin/generic-only guides remain noindex. No existing course URL was redirected or deleted.
- Static sitemap now contains 87 preferred canonical URLs, excluding aliases, staged thin/generic-only prep pages, private pages, errors and the gig pilot. Static lastmod remains omitted because real editorial timestamps are not tracked.
- robots.txt retains admin/API restrictions, allows public assets, and lets crawlers reach public app shells to read noindex. Authorization continues to protect private data; robots is not treated as removal or access control.
- Extended existing SEO validation for source coverage, template exclusion, retained routes, canonicals and sitemap eligibility. Course links are no longer skipped as if all course pages were private app routes.

### Course pages and AEO/GEO

- Updated metadata/breadcrumb behavior across the 43 course and 43 prep routes and their two directory pages.
- Added generated, readable source-backed excerpts to the 25 prep routes with source mappings. The exports contain only substantive lessons and disclose incomplete coverage. Unsupported days no longer display their template lesson bodies in these mapped guides.
- Fifteen primary guides meet the editorial minimum of three substantive lessons; this is a local publishing safeguard, not a Google ranking rule. Five thinner source curricula are staged noindex. Eighteen other catalog entries have no dedicated source curriculum and retain a clear content-status notice and noindex.
- Questions have direct answers, examples, review checks, available lesson outlines, related resources and visible learning goals without requiring account creation. Partial pages do not claim completed 30-day coverage. No missing advanced lessons, prerequisites or instructor credentials were invented.
- Corrected Generative AI days 16, 18, 23, 28 and 29: retrieval tokenization expectations, overlap output, ignored Thought lines, exact-match count, a real long-input fixture and whitespace-preserving redaction. Replaced calculator eval with an arithmetic-only AST evaluator and added malformed-expression checks to the existing fixture format.
- Kept source excerpts maintainable through prep:sync/prep:check. Existing database lessons edited in admin remain protected by the seed command; reconcile approved CMS changes back into source before regenerating public excerpts.

### Social sharing

- Added OG/Twitter image alternatives and measured 1254 × 1254 dimensions for the existing logo fallback, across prerendered pages and shared CMS/shop SSR metadata.
- Client navigation updates social fields and removes stale dimensions when a different image has unknown dimensions.
- Added a reusable sharing checklist and distribution plan for the Instagram, LinkedIn, YouTube and Facebook links present in source. Ownership/reach were not verified. Nothing was posted, messaged or created externally.

### Marketplace

- Implemented an original client-brief pilot at /gigs, /gigs/:slug and /gigs/workspace, integrated with the existing account system and design. The resources menu appears only when the backend reports the pilot enabled.
- Added draft editing, submission for staff review, explicit staff approval/rejection/closure, public approved listings, private proposals, owner workspaces and private abuse reports. Staff moderation uses Django admin; no custom-panel marketplace management is claimed.
- Added server-enforced ownership, private response fields, immutable random slugs, bounded inputs/pagination, duplicate constraints, throttles, no-store responses and 16 authorization/privacy/moderation/search tests. Editing approved content withdraws approval and requires another review.
- GIGS_ENABLED defaults to False. All pilot pages remain noindex and outside sitemaps even if enabled locally. The migration creates the data model but does not create fictional listings, users, reviews or activity.
- Payments, escrow, messaging, identity verification, public profiles, proposal acceptance, work contracts, disputes and marketplace email notifications are not implemented. Terms, moderation staffing, report response, retention/deletion and support arrangements must be decided before launch. See ../marketplace-design.md.

The exact “Gigs for Gigs” reference could not be reliably identified in research, so no claim is made that this reproduces its features or design.

## 3. Exact course-page scope

Every exact course/prep URL and its content/indexing state is listed in [course-page-inventory.csv](course-page-inventory.csv). Existing URLs were improved rather than creating parallel keyword URLs.

The 15 preferred prep URLs included in the static sitemap are:

- /interview-prep/generative-ai/
- /interview-prep/agentic-ai/
- /interview-prep/prompt-engineering/
- /interview-prep/ai-engineering-diploma/
- /interview-prep/data-analytics/
- /interview-prep/data-analytics-using-python/
- /interview-prep/vibe-coding-with-ai/
- /interview-prep/ai-integrated-full-stack/
- /interview-prep/python-full-stack/
- /interview-prep/mean-stack/
- /interview-prep/react-full-stack/
- /interview-prep/net-full-stack/
- /interview-prep/mern-stack-gen-ai/
- /interview-prep/python-training-course/
- /interview-prep/azure-administrator-az-104/

Eligible aliases ai-engineering, vibe-coding and azure-az-104 retain their content/progress URLs and point to the respective primary guide. The five thin primary curricula are AWS Developer Associate, AWS Certified Solutions Architect, Data Science, Java Full Stack Developer + Gen AI and MERN Stack. All remaining lesson/course gaps and replacement specifications are in [content-specifications.md](content-specifications.md).

## 4. Sitemap and robots behavior

After a reviewed deployment, the endpoints remain:

- https://codinghubs.in/robots.txt — three sitemap references; public CSS/JS allowed; no private-data protection is delegated to this file.
- https://codinghubs.in/sitemap.xml — 87 canonical static URLs, including 15 primary prep guides; no invented lastmod values.
- https://codinghubs.in/sitemap-content.xml — published public blog/case-study listings and details from the database, with model update dates for detail pages.
- https://codinghubs.in/sitemap-shop.xml — public store/project/guide listings and details from the database, with model update dates for detail pages.

Dynamic CMS counts and actual deployed responses remain unverified. The local canonical static list is saved in [current-static-url-inventory.csv](current-static-url-inventory.csv).

## 5. Validation and limits

| Check | Result |
|---|---|
| Frontend TypeScript/client/SSR build | Pass; 116 preserved prerendered files, 87 canonical sitemap URLs |
| Existing SEO checks plus new source/canonical/placeholder gates | Pass |
| Existing location checks | Pass, all 19 current locality pages |
| XML parsing | Pass, 87 unique fully-qualified canonical static URLs |
| Frontend lint | Exit 0; 97 warnings, no errors, matching the baseline warning count |
| Admin-panel TypeScript/Vite build | Pass |
| Django suite | 358 tests pass, including 16 new gig tests; baseline was 340 |
| Generative AI lesson/exercise validation | Pass for all 30 lessons after fixture/solution corrections |
| All-curriculum schema validation with --no-run | Pass; reports the existing 502 unfinished template lessons |
| Migration consistency | Pass: no changes detected after the new migration was generated |
| git diff --check | Pass |

Representative built HTML checks confirm one h1 per tested page, index/follow for Generative AI and Python Full Stack, and noindex/follow for the staged AWS Developer and generic-only CISSP prep pages. The complete sitemap-level checker validates headings, metadata, JSON-LD, links, assets and reachability for preferred static pages. Existing Django tests cover dynamic sitemap/publishing behavior; pilot tests cover SSR escaping and privacy.

Not completed: desktop/mobile visual inspection, keyboard interaction QA, real browser SPA metadata assertions, production nginx configuration execution, production redirects/404s, field Core Web Vitals, actual GA4 collection and Search Console indexing. C#/Java exercise execution across other curricula was not available in this environment. A successful schema check does not mean unfinished lessons are ready for publication. The initial main JS bundle is still substantial; no field performance improvement is claimed from code splitting alone.

The sandbox helper failed to initialize; approved local shell checks were used. A host DEBUG environment value of release initially prevented Django setup; final checks explicitly used DEBUG=True. No production settings or credentials were changed.

## 6. Analytics still needed

GA4 configuration and a Search Console verification file are present in source. Organic traffic, clicks, impressions, CTR, indexed pages, rankings, engagement, conversions and field CWV remain unknown. Obtain read-only access or exports and verify SPA events before adding tracking that could duplicate existing collection. No secrets were inspected or exposed.

## 7. Growth plan

[organic-growth-and-sharing-plan.md](organic-growth-and-sharing-plan.md) contains the prioritized 30/60/90-day plan, source-backed content opportunities, local/international discovery safeguards, sharing checklist, measurement definitions and process KPIs. The 1,000+ daily organic-session target is measured on a 28-day average, with no guaranteed traffic level or date. Set growth-rate expectations only after establishing verified baseline data.

## 8. Product decisions before marketplace launch

Review [../marketplace-design.md](../marketplace-design.md): choose moderation ownership, prohibited content, support/retention/report procedures and terms before enabling the flag. Decide separately whether a later marketplace should support transactions, direct messaging, contracts or identity checks. This local pilot demonstrates moderated discovery and private expressions of interest only.

## 9. Preview and release

Exact PowerShell setup, validation, local pilot, review-branch and manual deployment steps are in [local-preview-and-deployment.md](local-preview-and-deployment.md). Complete the outstanding visual/nginx checks before merging to main. Existing AWS CI/CD is preserved. No commit, push, production deployment, social post or external message was performed.

## Follow-up integration review ? 11 November 2026

Course/account changes now reset the interview-prep session, and fetched lessons are matched to their course and day before rendering. A failed API request for a mapped source lesson displays a retry state instead of generic exercises and completion controls. The retry refreshes the outline and the lesson request.

Gig search now uses title matching consistently in the API and server-rendered HTML. Search and pagination are retained in the URL, including initial direct visits. Invalid listing page numbers return 404 consistently. Two new Django regression tests cover matching search results and invalid-page behavior.

Revalidation: 356 Django tests pass; frontend build and all SEO/source/location checks pass; 87 canonical static sitemap URLs remain; lint exits successfully with 97 warnings and no errors. Browser automation was retried and the helper exited before page inspection, so desktop/mobile and browser interaction QA remain outstanding. No deployment occurred.

## Running local application smoke test ? 11 November 2026

Started Django on 127.0.0.1:8000, the public Vite app on 127.0.0.1:5173 and the staff Vite app on 127.0.0.1:5174/admin-panel/. The preview uses a fresh temporary SQLite database with the existing 24-course seed and 600 lesson records. Gigs is enabled only in this local server process. No production database or deployment was used.

Actual HTTP checks through the frontend proxy passed for course catalog, public curricula/day lesson, gig availability/listing, tutors and jobs. Disposable QA account registration, draft status enforcement, no-store headers, cross-user edit/submit denial, private workspace isolation, pending-listing privacy and owner closure passed. Public/prep/gigs/admin app shells returned 200. Both dynamic sitemap responses parsed as XML, and robots exposed its three sitemap references. The full Django suite passed 356 tests; frontend/admin builds and source/SEO/location validation passed again.

Browser automation could not initialize because its helper exited with a sandbox setup error. HTTP app-shell success is not a rendered browser, accessibility or mobile-layout pass. Payment and external AI calls were disabled in this isolated preview; no real purchases or provider requests were made. Local QA records remain confined to the temporary preview database. Development servers were left running for manual review.

## Search Console master sitemap ? 11 November 2026

Added frontend/public/sitemap-index.xml, copied to the build output, with the exact static/content/shop child sitemap URLs. robots.txt now advertises this master index. The existing child routes remain unchanged. Dynamic sitemaps exclude pages with a canonical override pointing elsewhere. Added two regression tests for explicit self-canonicals and alternate canonicals across blogs, case studies, products, projects and guides. The live smoke tool now walks nested sitemap indexes rather than mistaking child sitemap URLs for HTML pages.

Validation: all 358 Django tests pass; frontend build, source/SEO/location checks and JavaScript syntax checks pass. A real XML parser confirms the master index contains the exact three children; local HTTP serves it as XML with status 200 and robots advertises it. No fabricated lastmod timestamps were added. Earlier statements about three direct robots references describe the previous implementation; the new single master reference supersedes them.

Production homepage, robots and the existing sitemap were reachable during this follow-up; /sitemap-index.xml returned 404 before deployment. Live visibility does not mean the local changes were deployed. Search Console instructions are in search-console-setup.md. No commit, push, deployment or Search Console submission was performed.

The subsequent read-only production SEO smoke check passed for 123 URLs from the deployed child sitemaps. This is the deployed inventory, not the new local static count of 87 plus current CMS URLs. Local changes to content-quality exclusions and the master index still require deployment.
