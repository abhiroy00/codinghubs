# Technical SEO audit — codinghubs.in

Audit date: 2026-10-29. Method: repository inspection, read-only HTTP checks of the live site (`curl`, `frontend/scripts/seo-smoke.mjs`), build-time validators. This extends the earlier audit in `/SEO.md` (2026-10-26); items already fixed there are not repeated.

**Not verified (no access):** Google Search Console, Analytics, Business Profile, CrUX/field Core Web Vitals, PageSpeed Insights, backlinks, rankings. No claim is made about indexing or rankings.

## Stack
Django 6 + DRF backend, React 19 + Vite SPA, build-time prerender for home/program/locations/tutor/policies, server-rendered (Django → nginx proxy) HTML for blog, case studies, projects, guides, store. nginx in Docker on EC2, deployed by GitHub Actions on push to `main`.

## Summary
33 sitemap URLs (3 sitemaps) fetched live: all 200 except as listed. Canonicals are self-referencing, no accidental noindex, JSON-LD parses everywhere it exists, no images without `alt`. HTTP→HTTPS, www→apex and trailing-slash redirects are single 301 hops; unknown URLs return a real 404; app-only routes send `X-Robots-Tag: noindex`.

## Findings

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| 1 | High | `/policies` is indexable and in the sitemap but its HTML contained no content (empty root, 0 `<h1>`, 11 words) | `url-inventory.csv`; smoke test | **Fixed in repo** (prerendered through `Layout`, 648 words, 1 `<h1>`); live after deploy |
| 2 | High | Home page HTML sent no `Cache-Control` (only `ETag`/`Last-Modified`), so browsers/proxies may heuristically cache stale HTML after a deploy | `curl -I https://codinghubs.in/` | **Fixed in repo** (`nginx.conf`: `no-cache` on `location = /`) |
| 3 | Medium | No basic security headers on HTML (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`) | `curl -I` | **Fixed in repo** for static HTML locations. Not added: HSTS and CSP (need owner decision; CSP must allow Razorpay, TinyMCE, YouTube, fonts) |
| 4 | Medium | Project/guide pages with a short summary got a 10-character meta description, and two projects share the title "AI chatbot" | `/projects/ai-chatbot-10`, `/ai-chatbot-11`, `/project-guides/ai` | **Descriptions fixed in repo** (`payloads.fill_description`). **Owner action:** the two "AI chatbot" projects look like test data; delete or differentiate them in the admin panel |
| 5 | Medium | `sitemap-content.xml` / `sitemap-shop.xml` returned 502 for a short window during a deploy (backend restarting) | first fetch 502, re-fetch 200 | Operational: deploy restarts the backend while nginx keeps serving. Consider a health-gated deploy. Smoke test retries 5xx 3 times |
| 6 | Low | One location description is 168 characters (Panipat) — may be truncated in results | `url-inventory.csv` | Open (copy edit) |
| 7 | Info | `/faq` is `noindex` and out of the sitemap by design until the business reviews unsubstantiated claims | `SEO.md` #15 | Owner decision |
| 8 | Info | Phone/email inconsistent between site sections (+91 74640 99059 vs +91 84488 11540; `codingnowai.in`) | `SEO.md` | Owner decision |

## Verified OK
robots.txt valid, lists all three sitemaps, no CSS/JS blocked; sitemap URLs absolute https on apex; titles unique and 29–65 characters except finding 4; one H1 per indexable page (after fix 1); no keyword meta tag; JSON-LD limited to Organization/WebSite/Breadcrumb/Article-type content matching visible copy.

## Performance
Lighthouse numbers from the earlier audit are in `/SEO.md` (local, simulated mobile). No new measurements were taken in this pass and none are claimed. Re-measure with PageSpeed Insights after deploy.
