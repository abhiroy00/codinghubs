# Coding Hubs technical SEO audit — 13 November 2026

**Status:** Code changes are prepared and verified locally. Nothing was deployed, pushed, committed, or changed in the production CMS. Production still exhibits the audited defects. No rankings, traffic, indexing, or rich-result outcome is promised.

## Executive summary — Hinglish

Site ke **1,731 discovered URLs** crawl kiye. In sab ka HTTP response 200 tha, lekin browser testing se important SEO problems mili: page badalne ke baad canonical purane page ka reh raha tha; tutor profiles listing-page HTML/canonical use kar rahe the; nonexistent tutor/job pages bhi 200 de rahe the. Password recovery ke dono URLs direct open karne par 404 the.

In issues ke local fixes implement aur verify ho gaye hain. FAQ schema, Studio robots tags, public-page metadata, directory sitemaps aur URL normalization bhi correct kiye. **Production abhi unchanged hai.** Mobile/desktop Lighthouse tests mein loading slow mili; performance tuning aur uploaded images ka kaam pending hai. Google indexing aur real-user Core Web Vitals ka data available nahi tha.

## Access, scope and reproducibility

| Surface | Actual access / evidence |
|---|---|
| Production website | Anonymous, read-only HTTPS requests and isolated Chrome. No login, booking, payment, lead form, account action, or message was submitted. |
| Repository | Full local source access; clean working tree at baseline `fa33f42`. No applicable AGENTS.md found in the project tree. |
| Browser | Standalone Playwright with installed Chrome 157. The in-app Browser execution tool was not exposed. Fresh isolated contexts; local QA blocked production analytics requests. |
| Crawler | Python requests + BeautifulSoup; reusable script and raw observations retained in `artifacts/seo-audit/`. |
| Hosting | Nginx/AWS deployment source available; no hosting account, server logs, deployment credentials, or production shell used. |
| Search Console | No connected property/report access. Ownership-file code is not evidence of indexing. |
| Analytics | Existing Google tag observed and preserved; no analytics reports available. |
| PageSpeed Insights / CrUX | Anonymous mobile and desktop API calls returned quota HTTP 429. Field metrics unavailable. Local Lighthouse 13.6.0 supplied lab measurements. |

Production discovery began around **00:37 IST**. The main HTML crawl covered **00:38:43–00:49:15 IST on 13 November 2026** (UTC timestamps retained in summary.json). Supplemental production probes, browser comparisons, and local verification continued afterward.

- Initial ceiling: 5,000 unique internal page URLs. **1,731 discovered / 1,731 fetched; zero queued at completion.** This exhausts the discovered frontier, not every possible database, authenticated, parameterized, or unlinked URL.
- **331 unique sitemap page URLs**: 321 static + 3 content + 6 shop + 1 learning. All fetched, successful, indexable by observed directives, self-canonical, and canonical targets returned 200.
- Recursively followed source HTML anchors and canonical targets. Browser-rendered links added three tutor profiles. Rendered baseline: seven page templates on desktop and mobile, **14 page visits**. JavaScript rendering was sampled, not applied to all 1,731 URLs.
- Robots.txt fetched before crawling; `/admin/`, `/admin-panel`, `/api/` excluded by policy. Two page requests maximum in parallel; persistent connections; short batch pauses; retry/backoff with Retry-After support. No production page 429/5xx was encountered. Separate PSI 429 responses were not retried.
- Six observed query URLs excluded: five `locations/?region=...` filters and one `blog?category=artificial-intelligence`. Their clean parent pages were crawled. Pagination/filter-query coverage is incomplete; no pagination defect is asserted.
- Did not submit forms or follow logout/action routes. Asset links were not enqueued as pages. Standard `/sitemap_index.xml` returned 404; the declared `/sitemap-index.xml` worked. The unused alternate spelling is not a broken-sitemap finding.
- **51 unique image URLs**: all HEAD probes returned 200. **57 external anchor targets**: 30 HTTP 200, one 301, two 403/inconclusive, three excluded by external robots policy, 21 WhatsApp contact/action URLs excluded. External checks were single link probes, without recursive external crawling. No external 404/410 was confirmed; this does not establish that blocked or redirected destinations are healthy.
- Initial urllib certificate verification failed in the local Python installation. Requests' trusted certificate configuration and curl accessed production successfully. This is not classified as a website certificate defect.

Evidence bundle: [crawl inventory](../../artifacts/seo-audit/crawl-inventory.csv), [issue register](../../artifacts/seo-audit/prioritized-issues.csv), [raw HTTP records](../../artifacts/seo-audit/crawl.jsonl), [crawl summary](../../artifacts/seo-audit/summary.json), [baseline rendered observations](../../artifacts/seo-audit/rendered-before.json), [variant and PSI probes](../../artifacts/seo-audit/variants-and-psi.json), [link/asset probes](../../artifacts/seo-audit/link-assets-check.json).

## Observable stack and URL conventions

Production sends `Server: nginx/1.27.5`, real prerendered HTML, module scripts, React-rendered markup, and fingerprinted assets such as `/assets/index-3y52TnZ3.js`. The matching repository explicitly uses **React 19, Vite 8, TypeScript**, and build-time `renderToString` in `src/entry-server.tsx` plus `scripts/prerender.mjs`. Backend manifests and routing establish **Django 6.1 / Django REST Framework** with a custom database-backed CMS and server-rendered blog/store/learning routes. Django version is repository evidence, not an exposed production version header. README references to Django 5 are older than the dependency manifest.

Preferred origin is **https://codinghubs.in**. HTTP apex, HTTP www, and HTTPS www each returned a single permanent redirect to it. TLS requests succeeded with certificate verification in curl/requests.

Existing conventions are preserved: `/program/<slug>`, `/faq`, `/policies`, and CMS detail routes without a slash; `/courses/`, `/interview-prep/`, `/locations/`, `/learn/`, `/visual-lab/`, and directory listings with a slash; `/interview-studio` without a slash. Tutor IDs keep their existing slashless links; job details retain their existing trailing slash.

## Prioritized findings

No P0 was established. Counts refer to this audit's coverage, not all possible production URLs. Full root causes, impact, confidence, exact fixes, effort, and evidence filenames are included in the issue-register CSV.

| ID | Priority | Confirmed issue / affected coverage | Evidence | Result |
|---|---|---|---|---|
| SEO-01 | P1 | Wrong canonical survives navigation; 25 marketing URLs share affected components | Production `/courses/ → / → /program/ai-for-all → /locations/` retained `/courses/` as canonical throughout. Three transitions directly reproduced; component inspection establishes the wider shared mechanism. | Shared metadata locally verified; production pending |
| SEO-02 | P1 | Listing shell reused for profiles and nonexistent records | Three real tutor profiles have the listing's identical title, description, text hash and canonical. Two deliberately nonexistent tutor/job probes returned 200. No live job-detail URLs were discovered. | Record-aware SSR/404 locally verified with isolated data |
| SEO-03 | P1 | Password-recovery direct visits fail | `/forgot-password`, `/reset-password`: 404, although React routes exist | Local 200 private shell + noindex verified |
| SEO-04 | P1 | Slow representative lab loading | Two URLs × mobile/desktop; LCP 3.1–7.3 seconds in single runs | Open; field performance unknown |
| SEO-05 | P2 | FAQ schema removed during browser rendering | `/faq`: FAQPage present in source, zero JSON-LD blocks after rendering | FAQ owns shared server/client metadata; locally verified |
| SEO-06 | P2 | Studio adds a second robots meta | `/interview-studio`: two robots tags after rendering; both observed as index directives on landing | Single managed tag locally verified |
| SEO-07 | P2 | Tutor discovery depends on JavaScript; absent sitemap entries | Three tutor detail URLs appear in rendered listing, absent from source link graph and sitemaps | SSR anchors + new directory sitemap locally verified |
| SEO-08 | P3 | Two successful visual-lab spellings | `/visual-lab`: 200 despite canonical `/visual-lab/` | Narrow 301 locally verified |
| SEO-09 | P3 | Program hero dimensions absent | Three program pages omit width/height on decorative hero image | Correct source dimensions in built output; no lazy-loading added |
| SEO-10 | P2 | Large CMS upload and dimensionless authored figures | `/projects` and `/projects/ai-chatbot-11` reference one 1,256,136-byte PNG; one blog page has four dimensionless figures | Open; production media/content not edited |
| SEO-11 | P3 | Staged aliases canonicalize to noindex targets | 151 non-self aliases; their sources are also noindex and excluded from sitemaps | Open publishing-policy follow-up |

SEO-01: high confidence in canonical inconsistency; consolidation impact is a supported risk, not a measured ranking loss. Root cause was page components managing only titles or no head fields while the shared effect restored the previous document head. Exact correction uses the existing `useSeo` cleanup mechanism with server-shared metadata. Effort: medium. Verification compares production navigation with local navigation, including returning to the homepage. Google recommends consistent source/rendered canonical signals. [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

SEO-02/07: Nginx's unconditional detail-shell rules caused the wrong response before JavaScript knew the record. Django now applies the existing active/published filters, renders actual public text and anchors, returns a real 404 for unavailable records, and supplies matching SEO in the public API payload. Active tutor and open-job details enter `/sitemap-directory.xml`; expired jobs retain informative 200 pages, use noindex, and leave that sitemap. No live job record was invented or published. Medium effort; public fixtures, inactive/draft records, escaped input, redirects, sitemap exclusions, and expired jobs are covered by regression tests. Three profiles are **source-HTML discovery gaps, not confirmed whole-site orphans**: rendered links do reach them.

SEO-03: the private Nginx allowlist omitted password-recovery routes. Small correction serves the existing application shell and adds matching client metadata. Both URLs remain crawlable with noindex, preserving their account purpose.

SEO-05/06: FAQ's parent frame set `json_ld: null`; Studio independently appended a meta element. Shared ownership now retains supported FAQ data and replaces directives cleanly. Both are small fixes. Existing visible FAQ wording is preserved; its business assertions have not been independently certified.

SEO-08/09: small configuration/static changes. Visual-lab normalization targets only its equivalent spelling and keeps queries. Program dimensions came from actual source files: 1600×533, 1280×683, 1280×801. This is a markup correction; no measured CLS gain is claimed.

SEO-10: optimize the specific upload through reviewed responsive modern-format derivatives, update references with a publication rollback path, and add actual figure dimensions through CMS editing/upload processing. Impact on those templates remains unmeasured; do not compress or replace production assets blindly. Effort: medium.

## Other audit results and limits

**Crawling and indexability:** all 1,731 discovered pages returned 200 on the original requested URL. No redirect loop, failed canonical target, or broken internal page link was found in this discovered set. Deliberate negative probes are recorded separately and exposed the soft-404 candidates above. A random unknown top-level URL already returned a real 404. Robots allows public resources; no blocked public stylesheet/script was identified. Private response headers and original HTML carry noindex. Robots blocking is not being used as a removal mechanism.

There are **1,394 noindex responses**: 1,388 public/staged guide responses with `noindex, follow`, plus six application responses with `noindex, nofollow`. Repository readiness logic deliberately excludes unfinished guides. Intent for every guide cannot be confirmed without the owner's publishing inventory and Search Console; this count alone is not an SEO defect. No useful page was automatically noindexed because of length.

**Canonicalization:** 194 pages have a non-self canonical. Three are the confirmed tutor defect; the other 191 relate to existing prep aliases and source consolidation. Their target requests returned 200; intended indexable primary sitemap URLs are self-canonical. Of those existing prep aliases, **151 point to targets carrying noindex**, while all 151 source aliases also carry noindex and are absent from the sitemap. This is a confirmed staging/consolidation inconsistency with low immediate search exposure, rather than evidence that a live indexable page is blocked (SEO-11). The canonical mapping does not check target readiness. Proposed correction: retain staging noindex and emit an alias canonical only when the primary target is intended indexable; otherwise omit that consolidation canonical. Effort is small/medium, but the existing publishing policy needs confirmation before changing this behavior. [Exact source/target pairs](../../artifacts/seo-audit/staged-canonical-targets.json) are exported. Existing aliases were preserved. Equivalence and business intent should be reviewed before considering further permanent redirects; no blanket rewrite was introduced. Parameter and case variants were not exhaustively enumerated.

**Sitemaps:** all five declared sitemap documents (index plus three children and separately declared learning file) parse as XML; current protocol sizes/counts are below 50,000 URLs and 50 MB. All 331 leaf URLs are successful, self-canonical, free of observed noindex and robots conflicts. The new directory file is a fourth index child locally. Static sitemaps and the new directory file omit lastmod rather than invent dates. Content sitemap dates use stored modification timestamps; this audit cannot independently establish the editorial meaning of historical production edits.

**Architecture:** maximum measured homepage depth in the original HTML graph is four. All 331 sitemap URLs have a homepage path in that graph. There is no confirmed sitemap orphan. Rendered-only tutor links account for the three blank depth fields in the CSV. No authenticated CMS export or Search Console inventory was available to discover completely unlinked records. Existing breadcrumbs/anchors were inspected; new record pages use real href links.

**Metadata, headings and duplication:** every response has a title. One exact duplicate title/description/body group contains the tutor listing and three profiles; these are addressed locally. Missing H1s are confined to six explicitly private application shells in the raw crawl, not the public sitemap pages. Original heading order is exported in the CSV; no forward jump larger than one heading level was observed. Near-duplicate content was not exhaustively fingerprinted: exact text hashes are supplied, and the existing location validator reports a maximum 8-word phrase overlap of 11.4%, below its 30% limit. Character counts are editorial guides, not ranking guarantees.

**Images:** zero missing alt attributes in source HTML; empty alt text on decorative images is intentional. Four source pages have images without both intrinsic dimensions: three programs corrected, one CMS blog still pending. All 51 unique source image URLs responded 200. Asset byte sizes and caching headers are retained in the link/asset report. The actual homepage LCP background was already preloaded, discoverable, high priority and not lazy-loaded; that behavior is preserved.

**Rendering and mobile:** raw HTML contains substantive content on sampled public templates, with the tutor/job directory gap described above. The 14 baseline rendered page visits recorded no pageerror events or horizontal overflow at 390 and 1440 pixels. Final local direct/mobile and navigation checks have no recorded browser errors. Password recovery, program/location navigation, and metadata restoration were exercised without submitting forms. Mobile screenshots preserve the homepage layout; animated code position varies. No exhaustive overlay, keyboard, or conversion audit is claimed.

**Structured data and international:** JSON-LD parsed without syntax errors throughout the source crawl; types and parse failures are exported per URL. Build validators inspect existing metadata, supported fields and content checks. FAQ uses its actual visible answers; directory schema uses WebPage, avoiding fabricated reviews, ratings or incomplete JobPosting promises. External Rich Results Test and complete schema.org semantic validation were not run. Correct markup does not guarantee rich results. [Google structured-data policy](https://developers.google.com/search/docs/appearance/structured-data/sd-policies). The site uses en-IN; no genuine alternate-language/regional content set was found, so hreflang was not added.

## Performance evidence

These are **single-run local Lighthouse lab measurements against production**, run sequentially for performance sessions. Other audit/verification processes were active on the workstation, and network/host variation is uncontrolled. Use them to select follow-up profiling, not as stable population estimates. TBT is a lab diagnostic and is **not INP**. PSI quota prevented retrieving field data; no CrUX/INP percentile or field pass/fail is asserted.

| URL | Profile | Performance score | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|
| `/` | Mobile | 40 | 7.1 s | 720 ms | 0 |
| `/` | Desktop | 44 | 3.2 s | 490 ms | 0 |
| `/courses/` | Mobile | 57 | 7.3 s | 180 ms | 0 |
| `/courses/` | Desktop | 66 | 3.1 s | 0 ms | 0.049 |

[Mobile home report](../../artifacts/seo-audit/lighthouse-home-mobile.json), [desktop home](../../artifacts/seo-audit/lighthouse-home-desktop.json), [mobile courses](../../artifacts/seo-audit/lighthouse-courses-mobile.json), [desktop courses](../../artifacts/seo-audit/lighthouse-courses-desktop.json).

Mobile homepage diagnostics recorded roughly 3.0 seconds of LCP render delay, about 1.65 seconds of resource-load duration in its LCP breakdown, blocking `free-session.css` (~45.7 KB transfer; ~545 ms reported opportunity), and ~125 KiB unused-JS opportunity including the analytics script and entry bundle. Existing fingerprinted caching and gzip are configured, and compression is observed in Lighthouse requests. These observations do not isolate a single root cause. Analytics removal is not an authorized optimization.

Next performance slice: collect repeated controlled traces; separate application startup, DOM replacement, animation/layout, font, and CSS costs; compare source-first paint with browser replacement; inspect startup prefetching; optimize the dominant measured cost while retaining interaction and tracking. Capture three comparable mobile and desktop runs before/after on the same origin/build environment. No performance uplift is claimed from this patch.

Good **field** targets at the 75th percentile remain LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. [web.dev threshold reference](https://web.dev/articles/defining-core-web-vitals-thresholds).

## Implementation map

| Files / configuration | Observable change |
|---|---|
| `frontend/src/seo/site.ts`, `FreeSession.tsx`, `Curriculum.tsx`, `Policies.tsx`, `locations/LocationsIndex.tsx`, `locations/LocationRoute.tsx` | Consistent canonical, title, description, social metadata and schema on navigation; reuse existing content/metadata. |
| `pages/Faq.tsx`, `App.tsx`, `entry-server.tsx`, `studio/Studio.tsx` | Shared FAQ/Studio metadata in original and rendered HTML; no extra robots element. |
| `seo/PrivateRouteMeta.tsx`, `pages/NotFound.tsx`, `frontend/nginx.conf` | Password reset routes served as private application pages; missing-page metadata clears inherited canonical/schema. |
| `backend/apps/content/directory_seo.py`, `directory_ssr.py`, `templates/content/directory.html`, `ssr.py`, `backend/config/urls.py` | Record-aware public rendering, status, normalization, metadata and directory sitemap. Existing content shell/analytics retained. |
| `backend/apps/jobs/serializers.py`, `backend/apps/tutors/serializers.py`, frontend `seo/directory.ts`, `pages/BookTutor.tsx`, `pages/LatestJobs.tsx`, `main.tsx` | Add read-only public SEO payload; seed public records for first render; preserve existing filtering, booking and application UI. |
| `frontend/scripts/prerender.mjs` | Generate directory.css from existing compiled page CSS and its static dependencies, preserving server-first styling. |
| `frontend/public/sitemap-index.xml`, `scripts/validate-seo.mjs` | Declare and validate the new dynamic public directory child sitemap. |
| `pages/free-session/programs.ts`, `pages/Curriculum.tsx` | Actual intrinsic dimensions on three decorative program hero images; eager loading preserved. |
| `backend/apps/content/test_directory_seo.py`, `frontend/src/seo/routes.test.tsx`, `frontend/vitest.config.ts` | Seven directory regression cases and three metadata regression cases; existing tests retained. |

No database migration or content publishing is required. The additive `seo` API field is read-only. No dependency or lockfile change was made. Local Nginx was installed for verification; Lighthouse used npx's tool cache. There is no request to merge/push into the auto-deploying main branch.

Narrow redirect map (equivalent URLs only):

| Existing spelling | Preferred destination | Result |
|---|---|---|
| `/visual-lab` | `/visual-lab/` | 301; query retained |
| `/book-a-tutor/<existing-id>/` | `/book-a-tutor/<existing-id>` | 301; query retained |
| `/latest-jobs/<existing-slug>` | `/latest-jobs/<existing-slug>/` | 301; query retained |

Existing directory-list slash normalization remains. Missing records return 404 without redirecting to an unrelated page. No published canonical route is removed.

## Before/after verification

| Behavior | Production baseline | Local result |
|---|---|---|
| Courses → home → program → locations canonical | `/courses/` persists incorrectly | Each destination gets its own canonical; additional locality → policies transitions pass |
| Tutor detail `/book-a-tutor/1` | Listing title/body and `/book-a-tutor/` canonical | Fixture profile's actual H1/body and self canonical in source and browser |
| Missing tutor/job detail | 200 listing shell | 404 and noindex, with no canonical |
| Password routes | 404 | 200 private shell; noindex header and rendered metadata |
| FAQ | Source FAQPage disappears after JS | FAQPage retained; homepage navigation removes old FAQ markup |
| Studio landing | Two robots meta tags | One intended robots meta; private path header remains noindex |
| Visual-lab variant | 200 | Single-hop 301 to existing canonical |
| Directory discovery | Three profiles absent from original anchors/sitemap | Public anchors and a filtered directory sitemap verified with fixture data |
| Program hero dimensions | Missing | Source dimensions match files; all three built images include attributes |

Verification environment: local Nginx 1.31.8 on test ports using the repository configuration with substituted local paths/upstream and a local self-signed certificate; Django with an isolated SQLite fixture database. Production uses Nginx 1.27.5; exact production image/platform behavior remains a post-deploy check. Local production-origin canonicals were intentionally retained. HTTP assertions supply the intended Host; browser tests map the target hostname to localhost. No production database was copied. Local fixture identity/employer labels are QA data, not live business claims.

Fresh checks:

- `npm run build`: pass; **1,705 prerendered pages, 321 static sitemap URLs**. Existing ineffective-dynamic-import warnings remain.
- `npm run validate`: pass, including SEO, source/content, roadmaps and location validations.
- `npm run lint`: exit 0; application warnings remain, including existing hook/ref warnings and an additional mixed-export FAQ metadata warning. This is not a warning-free result.
- `npm test`: final **10 passed**. An intermediate run failed the existing Studio draft-conflict test (`pass` versus edited draft). That component/test was unchanged by this work; inspection shows editor visibility can precede initialization effects. The isolated check and clean HEAD baseline (7 tests) passed, then the final full suite passed. This is a timing-sensitive failure with an unconfirmed root cause, not a claimed repaired defect; no tests were disabled or weakened.
- `DEBUG=True python3 manage.py test apps --noinput`: **485 completed; OK, 8 skipped** by existing environment-dependent conditions. Database engine was local SQLite, not CI's PostgreSQL.
- Focused directory/public API suite: **24 passed**. New directory checks first failed before implementation; metadata checks first failed all three intended assertions.
- Ruff on changed backend files: pass. `git diff --check`: pass.
- `nginx -t` on substituted local configuration: pass. Local HTTP re-crawl: **26 representative routes, zero failures**.
- Final local mobile browser record: **18 direct/navigation states, zero recorded errors/failures**. Additional desktop marketing navigation: **five transitions** with canonical assertions.
- Read-only production recheck: eight affected paths still show original behavior, confirming this is local work rather than a deployed fix.

Evidence: [local HTTP re-crawl](../../artifacts/seo-audit/local-recrawl.json), [final rendered checks](../../artifacts/seo-audit/rendered-after.json), [baseline transitions](../../artifacts/seo-audit/transitions-before.json), [final marketing transitions](../../artifacts/seo-audit/transitions-after.json), [production recheck](../../artifacts/seo-audit/production-recheck.json), [backend test log](../../artifacts/seo-audit/backend-tests.log), [final frontend test log](../../artifacts/seo-audit/frontend-tests-final.log), [baseline test log](../../artifacts/seo-audit/frontend-baseline-tests.log).

## Remaining work, in order

1. **Review and explicitly authorize deployment** through the existing repository/AWS process. This audit does not authorize deployment. Run the production-image Nginx check and CI's PostgreSQL tests before merging. Deploy backend, frontend, directory.css and sitemap-index changes together. Keep the previous release as rollback; no schema migration is involved.
2. **After deployment:** repeat the 26 route checks and browser transitions against production; verify all current active tutor/open-job records in the new sitemap, not the QA fixtures. Re-crawl affected production routes and run the existing SEO smoke test. A local pass is not a production pass.
3. **P1 performance:** run controlled repeated traces on home/courses, implement the dominant measured bottleneck fix, and repeat comparable lab tests. Obtain authorized PSI/CrUX or Search Console field data before reporting field Core Web Vitals.
4. **P2 CMS media:** address the specific 1.26 MB project image and four blog-figure dimensions through reviewed CMS/media changes. Do not replace originals or publish new references without a reversible artifact and authorization.
5. **Search Console owner workflow:** inspect sitemap processing, selected canonicals, Page Indexing, live URL rendering, and Core Web Vitals. Submission/indexing status is currently unknown. Avoid treating successful crawlability or an index directive as confirmed indexing.
6. **Coverage follow-up:** compare an authorized published CMS/database export with crawl and sitemap inventories; sample filter/pagination variants; review guide publishing intent and alias equivalence; monitor the intermittent Studio initialization test separately.
