# Repository audit and implementation plan — 10 November 2026

## Verified baseline before edits
- Public app: React 19, React Router 7, TypeScript 6, Vite 8; build-time renderToString plus an SPA. CMS/shop routes use Django HTML and the frontend content shell. Two separate React applications; no framework migration needed.
- Backend: Django/DRF, SQLite default, PostgreSQL production, JWT. Apps: accounts, courses, enrollments, leads, payments, adminpanel, tutors, jobs, content, shop, aicoach.
- AWS deployment: GitHub Actions ci.yml tests/builds then auto-deploys pushes to main using OIDC, ECR, SSM and EC2. nginx handles TLS, real static 404s, noindex app routes and proxy SSR. No push/deploy is authorized for this task.
- 43 learning catalog entries and 43 existing interview-prep URLs. 20 source curricula contain 600 day files and map to 25 entries. Five pairs share the same curriculum. 18 entries have generic fallback material only.
- Prep prerender currently has a generic first day, repeated fallback questions and track-level titles. Detailed API lessons are missing from initial HTML. Course metadata is not updated on client navigation. learningJsonLd ignores its breadcrumb argument. All prep routes are included in the static sitemap regardless of source coverage.
- Three existing sitemap endpoints: /sitemap.xml (static), /sitemap-content.xml and /sitemap-shop.xml (database). Static lastmod correctly omitted. Dynamic lastmod uses model updated_at. robots references all three, allows assets, blocks private/API paths. Private disallows also prevent crawlers from seeing noindex responses.
- GA4 tag is present in frontend/index.html. Search Console verification HTML exists. Neither proves account access, successful collection or property ownership. Organic sessions, clicks, impressions, CTR, conversions, indexed pages and CWV are UNKNOWN.
- Live homepage, reference prep page, robots and sitemap requests failed through the web tool. Repository is authoritative; status/redirect/mobile/performance claims about production cannot be verified.
- Exact “Gigs for Gigs” product could not be reliably identified from a quoted-name search; use an original generic skills-based client-brief marketplace, not a copied product.
- No existing marketplace models/routes were found. No marketplace payment, escrow, messaging, identity verification or dispute service exists.

## Baseline checks
Initial build/lint attempts could not find installed tools. npm ci using existing lockfiles restored them; lint subsequently passed with 97 pre-existing warnings and zero errors. Build and backend baseline outcomes are recorded in the final verification report. Python is installed but dependencies were incomplete; use an isolated backend/.venv. Do not infer live functionality from repository tests.

## Implementation order
1. Generate public prep summaries from existing curriculum JSON with source validation; reuse them in initial HTML and browser navigation. Keep all existing URLs, remove generic-only and shared-curriculum duplicate prep pages from sitemap; give duplicates their primary canonical and leave unsupported pages noindex.
2. Share learning metadata between SSR and client navigation, add visible breadcrumbs with matching schema, social image alternatives, and validate canonical-only sitemap output. Keep current routes/design/hosting.
3. Document marketplace product boundaries before implementation. Build a disabled-by-default moderated client-brief pilot with authenticated ownership, private proposals, staff moderation and reports. Keep pilot noindex and out of sitemaps; defer transactions, messages, acceptance/work contracts and public profiles.
4. Extend existing checks for source coverage and pilot authorization. Run builds, lint, SEO/location checks and Django tests. Record actual limits, content specifications, social checklist, growth KPIs and manual deployment steps.

## Final content-audit correction ? 11 November 2026

The initial inventory counted files, not substantive lessons. The existing placeholder detector subsequently identified 98 substantive lessons and 502 template lessons across the 600 files. Public exports now exclude every detected placeholder. There are 15 primary prep guides with at least three substantive lessons, five thinner source curricula staged noindex, and 18 entries without a dedicated source. The final static sitemap has 87 canonical URLs. Eligible shared-curriculum aliases use canonical consolidation without noindex, following current Google guidance; aliases remain outside the sitemap. This correction supersedes any earlier assumption that all 20 curricula were complete. See implementation-report.md and content-specifications.md for the final state.
