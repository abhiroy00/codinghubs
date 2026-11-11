# Google Search Console setup — 11 November 2026

## Submit one master sitemap

After deployment, submit:

**https://codinghubs.in/sitemap-index.xml**

This master XML index references:

- https://codinghubs.in/sitemap.xml — canonical static pages, regenerated on each frontend build.
- https://codinghubs.in/sitemap-content.xml — currently published blog and case-study pages, generated from the database on request.
- https://codinghubs.in/sitemap-shop.xml — currently published store, project and guide pages, generated from the database on request.

Existing child sitemap submissions can remain. One master submission is sufficient to discover all three children. New public CMS/shop entries appear in the relevant child sitemap after publication; drafts, future scheduled content and pages canonicalized elsewhere do not. New static routes need a build and deployment. Crawling and indexing remain Google's decision.

## Before submitting

The master index was added locally; it was not deployed by this task. The live master URL returned 404 during the pre-deployment check. Do not submit it until it returns HTTP 200 with XML, not an HTML app shell or login page. The local copy can be inspected at http://127.0.0.1:5173/sitemap-index.xml while the dev server is running.

Run the existing local verification and reviewed deployment process in [local-preview-and-deployment.md](local-preview-and-deployment.md). Pushing to main triggers production deployment; this task did not push or merge. Keep GIGS_ENABLED=False in production.

After deployment:

```powershell
curl.exe -I https://codinghubs.in/sitemap-index.xml
curl.exe https://codinghubs.in/sitemap-index.xml
curl.exe https://codinghubs.in/robots.txt
cd frontend
npm run seo:smoke -- https://codinghubs.in
```

The robots file should advertise the master index. The smoke check follows nested sitemap indexes and checks the final page URLs for HTTP status, self-canonical metadata, noindex conflicts, titles, descriptions, h1s and JSON-LD. It does not check actual Search Console indexing or guarantee rich results.

## Search Console steps

1. Open the existing verified CodingHubs property in Google Search Console. This task did not access or verify the account.
2. Open **Sitemaps**. In **Add a new sitemap**, enter `sitemap-index.xml` if the domain prefix is already displayed; otherwise enter the full URL above. Submit it.
3. Confirm the submitted sitemap is fetched successfully. If it says “Couldn't fetch,” first check the live HTTP response, HTTPS certificate, XML content and crawler access. Repeated submissions do not fix a 404 or deployment problem.
4. Use **URL Inspection** on a few important canonical pages. Run the live test and request indexing where appropriate. Do not repeatedly request the same URL expecting faster crawling.
5. Monitor the **Page indexing** and **Performance** reports. Review reasons for excluded pages, Google-selected canonicals and actual clicks/impressions. Account/private pages, thin guides and staged pilot pages are intentionally excluded.

## Verified state and limitations

Local: 87 preferred static URLs, valid master XML, exact three child references, 358 passing backend tests, successful frontend build and source/SEO/location checks. The 15 primary prep guides in the static sitemap are based on substantive source lessons; unfinished content is documented in content-specifications.md.

Pre-deployment live check: homepage, robots and all existing sitemap endpoints were reachable. The read-only SEO smoke check passed for 123 URLs from the currently deployed child sitemaps. This deployed inventory differs from the new local inventory because the local source-quality exclusions have not been deployed. These HTTP results do not prove that Google has indexed the pages, nor that their content is complete.

Sitemap submission helps discovery. Google explicitly states that [submitting a sitemap does not guarantee crawling or indexing](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). No automatic or guaranteed indexing service, ranking promise, or Search Console submission was implemented.
