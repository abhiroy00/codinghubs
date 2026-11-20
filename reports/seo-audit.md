# SEO audit — Coding Hubs School of AI (20 November 2026)

Read-only audit of https://codinghubs.in/ (release `bcd8408`) and the repository. Builds on `docs/seo/2026-11-13-technical-audit.md` and `docs/seo/seo-implementation-log.md`; items fixed there are not repeated. No Search Console, GA4 or Google Business Profile access was available, so indexing, queries and field Core Web Vitals are unverified.

## Stack (from source)

React 19 + Vite + TypeScript SPA with build-time prerendering (`frontend/scripts/prerender.mjs`, 1,716 pages); Django 6 / DRF backend with a database CMS rendered server-side for blog, case studies, store, projects, guides and directories (`backend/apps/content/ssr.py`, `backend/apps/shop/ssr.py`); separate React admin (`admin-panel/`); nginx on AWS EC2, deployed by GitHub Actions on every push to `main`.

## Evidence collected

- Full crawl of all five sitemaps (395 URLs, 4 parallel requests): **395 × 200**, 394 self-canonical, **0 duplicate titles, 0 duplicate descriptions, every page one H1, 0 images without alt**, 39 titles over 65 characters, 1 description over 165.
- Lighthouse 12, mobile emulation, single run against production (lab data, not field data):

| URL | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | 81 | 100 | 100 | 100 | 2.0 s | 2.8 s | 270 ms | 0.003 |
| `/courses/agentic-ai/` | 55 | 100 | 100 | 100 | 7.2 s | 8.2 s | 130 ms | 0.001 |

- `curl` TTFB from the audit machine: 1.55 s for both `/` and `/courses/agentic-ai/`.

## Findings

| # | Issue | URL / file | Evidence | Sev | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | Empty listing in sitemap while noindex (regression from 20 Nov) | `/case-studies`, `backend/apps/content/ssr.py` | 0 published case studies; page `noindex`, listed in `sitemap-content.xml` | P1 | List a listing only when it has published items | **Fixed locally, test added** |
| 2 | Course pages paint late: stylesheets discovered in a chain | `/courses/*/`, `frontend/scripts/prerender.mjs` | Critical chain: HTML → `index.css` (3.8 s) → 6 more stylesheets at ~6.1 s; home has inlined critical CSS (`scripts/home-critical-css.mjs`) | P1 | Emit `<link rel="preload" as="style">`/direct links for every route stylesheet in prerendered course HTML; measure before/after | Confirmed, planned |
| 3 | Slow server response | all pages | TTFB ≈ 1.5 s for HTML; even static `robots.txt`: TCP connect 0.39 s, TLS 0.77 s, TTFB 1.16 s, so latency dominates. `codinghubs.in` → 13.236.145.34 (AWS ap-southeast-2 address range) | P1 | CDN in front of nginx or hosting in an India region | Suspected cause; **infrastructure change needs approval** |
| 4 | No conversion events | `frontend/index.html`, `RegisterForm.tsx`, `FloatingContact.tsx` | Only `gtag('config')`; no lead/WhatsApp/call events | P1 | `generate_lead` on successful demo registration; `contact` events on WhatsApp/phone clicks; no personal data in events | Confirmed, planned |
| 5 | Course schema minimal; course facts missing | `/courses/*/`, `frontend/src/learning` | `Course` has name/description/provider only; page says "confirm schedule, fees and prerequisites" | P2 | Add `offers`/`hasCourseInstance` only after owner supplies fees, mode, duration, batches | **Owner input** |
| 6 | Long titles on interview articles | `/interview/*/levels/*/articles/*` (39 URLs) | 66–69 characters | P3 | Shorten title template suffix | Planned |
| 7 | NAP inconsistency | `INSTITUTE.email` | Email `info@codingnowai.in` on site `codinghubs.in` | P2 | Owner decides domain; update everywhere at once | **Owner input** |
| 8 | No About/Contact/Faculty pages | routes | Not in router; trainer credentials unverified | P2 | Build after verified bios/photos/contact hours | **Owner input** |
| 9 | Third-party script weight | all pages | gtag.js 194 KB, largest request on course page | P3 | Keep (analytics is required); load after interaction only if owner approves | Enhancement |

**Not defects (checked):** robots.txt valid and lists `sitemap-index.xml`; http/www redirect once to `https://codinghubs.in`; real 404s with noindex; preview links 301 to clean URLs; blog pagination/category links crawlable; `VideoObject` on `/demo-videos`; `EducationalOrganization` with verified address; 18 location pages have no branch claims and an 11.4% maximum phrase overlap (`npm run validate`).

## Proposed implementation batches (awaiting approval)

1. **Batch A (done locally):** finding 1.
2. **Batch B — course page speed:** finding 2, with three before/after Lighthouse runs per URL.
3. **Batch C — conversion tracking:** finding 4, plus a Playwright test that registration still succeeds and sends one event.
4. **Batch D — titles:** finding 6.
5. **Reports:** keyword map, content gap, competitor (public SERP observations only, no invented metrics), AEO/GEO, local SEO, 90-day roadmap, test results and changelog in `reports/`.
6. **Needs your decision:** CDN/region (finding 3), email domain, course facts, faculty pages.
