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

## 20 November 2026 — blog discovery, listing canonicals, author schema, course guides

Live checks (anonymous curl, 20 Nov): home, `/courses/`, two course details, `/blog`, a blog post, `/projects`, `/interview/`, `/faq`, missing URLs, http/www variants. Redirects, 404s, self-canonicals and robots were correct. Fixed locally (not deployed):

- **Blog pagination and categories were buttons after React rendered**, so the rendered DOM had no links to pages 2–6 or to category listings. `Pager` now takes `hrefFor` and renders `<a rel="prev|next">`; categories are links (`BlogList.tsx`, `shared.tsx`). The server template also lists category links.
- **Listing canonicals:** `/blog?category=x` produced `...?category=x&`. `listing_seo()` now builds the query with `urlencode` and never adds `page=1`; pager links to page 1 use the clean URL (`ssr.py`, `blog_list.html`, `case_list.html`).
- **Out-of-range and unknown listings** returned 200 with the last page (`/blog?page=99`) or an empty category. They now return 404 (searches still fall back, they are noindex).
- **Category listings** get their own title, description and H1 ("Python Articles | Coding Hubs Blog"); the React list keeps head metadata in sync on in-app navigation (`useSeo`).
- **Author schema:** a "Coding Hubs Team" byline was emitted as `Person`; organization bylines now reference the `EducationalOrganization` (`services.is_organization_author`).
- **Course → blog links:** course pages gain a "Related guides" section (`learning/relatedArticles.ts`); `validate-seo.mjs` fails if a linked slug is not a seeded post.

Verification: `npm run build` (1,716 pages, 332 static sitemap URLs), `node scripts/validate-seo.mjs` pass, `npm test` 19 passed, lint exit 0 (118 warnings, baseline 119), Django `apps` 489 tests OK (8 skipped), ruff and `git diff --check` clean.
