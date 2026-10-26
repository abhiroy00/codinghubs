# SEO notes — Coding Hubs School of AI

Last audited: 2026-10-26. Scope: what can be verified from the repository, the production site over plain HTTP,
and local Lighthouse runs. **Not verified** (no access): Google Search Console, Analytics, Google Business Profile,
backlinks, rankings, production Core Web Vitals field data, production response headers beyond what `curl` showed.

## How to run the checks

```bash
cd frontend
npm run build            # type-check, bundle, SSR bundle, prerender 26 pages, write sitemap.xml
npm run validate         # validate:seo (site-wide) + validate:locations (18 location pages)
```

CI runs the same two scripts. `validate:seo` reads `dist/sitemap.xml` and checks every listed page: title/description
length and uniqueness, canonical = URL, robots meta, `lang`, Open Graph tags and image files, one `<h1>`, no heading-level
jumps, `<img>` alt (and width/height as a warning), JSON-LD validity (no LocalBusiness, ratings, reviews or prices; no
BreadcrumbList without a visible breadcrumb), internal links resolve, links match the trailing-slash policy, local assets
exist, every sitemap URL is reachable from the home page through HTML links, nothing in the sitemap is blocked by
robots.txt, `404.html` and the SPA shell are `noindex`.

## Verified findings (evidence) and what was done

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | **Soft 404s.** Any unknown URL returned 200 with the home shell. | `curl https://codinghubs.in/this-page-does-not-exist` → `200` | nginx now serves only known routes; everything else gets a real `404` + a `noindex` 404 page (`nginx.conf`, `404.html`). React also has a catch-all `NotFound` route. |
| 2 | **Duplicate host.** `www.codinghubs.in` resolved and served the whole site (200). | `curl https://www.codinghubs.in/` → `200`, DNS → 13.236.145.34 | `www` (HTTP and HTTPS) now 301s to `https://codinghubs.in/...` (needs the existing cert, which already lists `www`). |
| 3 | **Program pages had the home page's title/description and an empty `<div id="root">`.** | `curl https://codinghubs.in/program/ai-for-all` | Home, the 3 program pages and `/locations/**` are prerendered with their own title, description, canonical, Open Graph/Twitter tags and JSON-LD (`scripts/prerender.mjs`, `src/seo/site.ts`). |
| 4 | **No canonical / Open Graph / structured data on the home page**, title was 88 characters. | `index.html` | Home: 58-char title, 160-char description, canonical, OG/Twitter, `EducationalOrganization` + `WebSite` JSON-LD. |
| 5 | **Sitemap** listed only `/` and locations, with an invented `lastmod`. | `curl .../sitemap.xml` | Generated from the prerendered pages (24 URLs), no `lastmod` (we do not track real change dates). |
| 6 | **App-only routes** (login, register, dashboard, checkout, admin panel) returned the indexable home shell. | `index.html` had the home meta | Shell is now `noindex`; those routes also send `X-Robots-Tag: noindex, nofollow`; `robots.txt` disallows them. |
| 7 | **Hero/background images 404** (`/img/banner.png`, `bg.png`, `bg2.png`; the CSS paths were wrong) **and the PNGs were 1–2 MB each**. | Lighthouse console errors; file sizes | Paths fixed *after* converting images to JPEG/WebP (≈10 MB → ≈0.9 MB). Program/OG images are JPEG. |
| 8 | **Render-blocking font request** for 4 families, 3 unused on these pages. | Lighthouse `render-blocking` | Prerendered pages request only Inter + Poppins, non-blocking (`font-display: swap`). |
| 9 | Videos below the fold fetched their first frames on load (~350 KB). | Lighthouse transfer list | `preload` switches from `none` to `metadata` when the carousel is within 600 px of the viewport. |
| 10 | nginx used HTTP/1.1 only; no cache headers. | `curl -I`, `nginx.conf` | `http2 on`; fingerprinted assets cached 1 year (`immutable`), images 1 week, HTML `no-cache`; gzip for XML/plain text too. |
| 11 | Address written in two orders (`9th Floor, …, 904, …`). | grep | One official form everywhere: `904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034`. |
| 12 | `BreadcrumbList` markup on location pages whose breadcrumb is no longer visible. | `seo.ts` | Removed (markup must match visible content). Program pages still have a visible breadcrumb and keep theirs. |
| 13 | Footer carried 18 location links on every page. | footer markup | Replaced by 5 region links (+ "all locations"); the full list lives on `/locations/` and in the header menu. |
| 14 | Contrast and heading-order issues. | Lighthouse | `.opt` text and WhatsApp button darker; reel titles `h4` → `h3`. |
| 15 | `/faq` page makes claims that are not substantiated ("100% placement assistance", "3200+ students trained"). | `src/pages/Faq.tsx` | **Not edited** (business copy). The page is set to `noindex` and kept out of the sitemap until the business reviews it (`FAQ_META.indexable` in `src/seo/site.ts`). |

### Local Lighthouse (mobile emulation, simulated 4G, local nginx — not field data)

| Page | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 76 | 96 | 100 | 100 | 3.8 s | 4.3 s | 80 ms | 0 | 469 KB (was 899 KB) |
| `/program/ai-for-all` | 80 | 98 | 100 | 100 | 3.6 s | 4.0 s | 10 ms | 0.044 | 447 KB |
| `/locations/ai-course-in-gurugram/` | 82 | 96 | 100 | 100 | 2.7 s | 4.1 s | 10 ms | 0.014 | 542 KB |

Still open: the main JS bundle (≈168 KB transferred) is shared by every page and Lighthouse flags ≈88 KB as unused on the home
page; `global.css` (only needed by the account/FAQ/policy pages) loads everywhere. Code-splitting the account pages would
fix both. Measure real field data (CrUX / PageSpeed Insights / Search Console "Core Web Vitals") after deploy.

## Not changed on purpose / needs a business decision

* **Phone and email are inconsistent across the site.** Home/location pages use `+91 74640 99059` and `info@codingnowai.in`;
  the account/FAQ/policy pages (`src/components/Footer.tsx`, `src/lib/icons.tsx`) show `+91 84488 11540`. The email domain is
  `codingnowai.in` while the site is `codinghubs.in`. Confirm the correct values; NAP consistency matters for local SEO.
* **Course facts are limited to what the site already states** (free 2-hour live online demo; three 15-day online programs;
  the listed course names). No fees, durations, certificates, placement or trainer claims were added.
* **Hosting `www`:** after deploy confirm the cert covers `www` (it was issued with `-d www.codinghubs.in`).

## Keyword and intent map (hypotheses, no volume data)

No search-volume, difficulty or ranking data exists in this repository. Treat the themes below as hypotheses to test with
Search Console queries.

| Page | Primary intent theme | Secondary topics | Closest sibling (cannibalisation risk) |
|---|---|---|---|
| NSP | AI course near the head office; how to enquire and visit | head office, Python for AI | Pitampura, Patel Nagar |
| Pitampura | North-West Delhi learners comparing AI options | school/college learners, families | NSP |
| Tagore Garden | West Delhi students and early-career learners | online-first learning | Uttam Nagar, Patel Nagar |
| Connaught Place | Central-Delhi working professionals | evening/online schedules | Gurugram Cyber Hub (professional audience) |
| Lajpat Nagar | SE-Delhi students and business owners | AI for small business | South Extension |
| Laxmi Nagar | East-Delhi students, programming foundations | Python for beginners | Lajpat Nagar |
| Patel Nagar | Central-west learners and exam aspirants | AI as a second skill | NSP |
| Uttam Nagar | West-Delhi commuters, online-first | study routine | Tagore Garden |
| South Extension | South-Delhi professionals | compare travel/format | Lajpat Nagar |
| Aya Nagar | Border-area learners | online option | Gurugram |
| Noida Sector 62 | Tech students/professionals | RAG, applications | Greater Noida, Sector 2/3 |
| Noida Sector 2 | Part-time learners | returning professionals | **Sector 3** |
| Noida Sector 3 | Small-business learners | automation for SMEs | **Sector 2** |
| Gurugram | Formats and schedules | AI for professionals | **Cyber Hub** |
| Gurugram Cyber Hub | Corporate professionals | governance, confidentiality | **Gurugram** |
| Faridabad | Industrial-city learners | AI in manufacturing | Greater Noida |
| Greater Noida | University/engineering students | final-year projects | Noida Sector 62 |
| Panipat | Learners outside Delhi | online delivery | — |

Highest overlap risk: Sector 2 vs Sector 3, Gurugram vs Cyber Hub, NSP vs Pitampura vs Patel Nagar. The page bodies are
independently written (mean pairwise 8-word-phrase overlap ≈2%, max ≈11%), but if Search Console shows two of these pages
alternating for the same queries, merge them into one page with a 301 instead of keeping both.

Do not publish ranking, traffic or conversion promises from this map.

## Location articles (editorial words, from `validate:locations`)

South Extension 4343 · Pitampura 4369 · Tagore Garden 4454 · Connaught Place 4432 · Lajpat Nagar 4368 · Laxmi Nagar 4406 ·
Patel Nagar 4383 · Uttam Nagar 4534 · NSP 4480 · Aya Nagar 4445 · Noida Sector 62 4373 · Noida Sector 2 4394 ·
Noida Sector 3 4307 · Gurugram 4339 · Gurugram Cyber Hub 4291 · Faridabad 4271 · Greater Noida 4336 · Panipat 4382.

Counting rule: visible hero + article text (headings, paragraphs, FAQs), excluding navigation, contents list, form,
head-office card, related links and footer. Word count is a business requirement, not a ranking factor. The articles still
need a human editorial review for repetition and factual accuracy.

## After deploy: Search Console steps (need account access)

1. Verify `https://codinghubs.in/` as a **Domain** property (DNS TXT) so `www` and `admin` are covered.
2. Submit `https://codinghubs.in/sitemap.xml`.
3. Use URL Inspection on `/`, `/program/ai-for-all`, `/locations/` and two location pages: confirm "URL is on Google"
   eligibility, the user-declared canonical, and that the rendered HTML contains the article.
4. Watch Pages → "Why pages aren't indexed" for: *Duplicate, Google chose different canonical* (location pages),
   *Crawled – currently not indexed* (thin/duplicate signal), *Soft 404* (should now be zero).
5. Check `curl -I` on: `http://codinghubs.in/` (301), `https://www.codinghubs.in/` (301 → apex), an unknown URL (404),
   `/login` (`X-Robots-Tag: noindex`), `/program/ai-for-all/` (301 → no slash).

## Monitoring plan (first 12 weeks)

* Weekly: Search Console Pages (indexed vs not indexed), Performance by page and query, Core Web Vitals report.
* Fortnightly: queries per location page; flag pages that share queries (cannibalisation) and pages with impressions but
  no clicks (title/description test).
* Monthly: enquiry volume by `source_page` in the admin panel (`/admin-panel`) — location pages store their path as the lead source.
* After every content or template change: `npm run build && npm run validate`.
