# SEO implementation log (2026-10-29)

| Change | Files | Why |
|---|---|---|
| Prerender `/policies` content through `Layout` with Auth/Lenis/Modal providers | `frontend/src/entry-server.tsx` | Indexable page had an empty HTML body, no H1 |
| `Cache-Control: no-cache` on home; `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` on static HTML | `frontend/nginx.conf` | Stale-HTML risk; basic hardening. **Not tested with a running nginx in this session** (Docker unavailable) — check `nginx -t` in CI/deploy |
| `fill_description()` pads meta descriptions under 70 chars for products, projects and guides | `backend/apps/shop/payloads.py` | 10-character descriptions on live pages |
| `seo-smoke.mjs` + `npm run seo:smoke` | `frontend/scripts/seo-smoke.mjs`, `package.json` | Repeatable live check (status, sitemap, canonical, noindex, title/desc/H1, JSON-LD, redirects, 404) |
| Reports | `docs/seo/*` | Deliverables |

## Tests run
- `python manage.py test apps.shop` — 101 tests OK (before docs).
- `npm run build`, `npm run validate` — pass.
- `node scripts/seo-smoke.mjs` against live — 5 problems, all matching findings 1 and 4 (pre-deploy); re-run after deploy.

## Remaining
Delete/differentiate duplicate "AI chatbot" projects; decide FAQ indexing, phone/email, HSTS/CSP; add Search Console review; real Core Web Vitals field data.

## 2026-10-31 addendum
- Home: new sections **Practical projects** and **Project guides / tutorials** (show only published database items, hidden when none) and **Locations** (all 18 location pages, prerendered links) for internal linking; Resources menu now lists FAQ; header has a "Free Demo" register CTA (opens the registration popup); header switches to the burger menu below 1400px so nothing clips.
- Not done (needs owner input/approval): Rohini location page (4,000+ words of verified, unique local content), genuine testimonials/reviews, hero copy rewrite, per-location "online vs offline" availability facts.
