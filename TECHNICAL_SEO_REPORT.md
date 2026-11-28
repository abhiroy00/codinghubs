# Technical SEO report

## Verified

The live master sitemap resolves to four XML child maps and 300 submitted URLs. Each submitted URL returned 200 at least once during the audit/recovery checks and had usable public metadata/canonical signals in the captured HTML. The final built inventory has no missing-metadata issues for the inspected content pages. The existing static validator checks 203 preferred URLs, robots directives, links, schema parsing and canonical consistency. Unknown public URLs return a genuine 404.

React and Django already supply readable public educational HTML. Protected and incomplete workspaces retain exclusions. The crawler did not treat duplicate titles on known canonical aliases as evidence that two preferred pages should be indexed. Source aliases, legacy paths and unused generated workspaces require route-aware review; raw duplicate counts alone are not a defect verdict.

## Empty-guide and pagination defects fixed locally

The submitted guide `/project-guides/ai` has error-placeholder content. Publication status alone previously made it indexable. The new anonymous-content predicate excludes guides without a real enabled public instruction section, preserves locked content/access rules, and keeps reading URLs and publication status intact. Empty guide collections are excluded when their visible page has no eligible guide. API and client-side metadata preserve the same exclusion after JavaScript loads. This is a minimum structural safeguard, not a guarantee of editorial quality or a magic word-count rule.

Project and guide pagination previously clamped nonexistent pages to the last page, producing duplicate 200 URLs. Focused tests reproduced this; out-of-range pages now return the existing branded noindex 404 response.

## Implemented

Added a robots-aware, two-worker URL inventory with explicit built-vs-live evidence; regression tests for metadata, JSON-LD syntax, sitemap ownership and the real nginx homepage artifact; GSC date/pagination fixes; conversion tests; source content and linking improvements. Existing robots.txt, sitemap endpoints, redirects and rendering architecture were preserved.

Only two sitemap pages received a new lastmod because their rendered content changed. The remainder of the date ledger stayed unchanged. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) calls for canonical URLs and accurate modification dates; splitting already working maps was unnecessary.

## Pending and limits

The 58 transient 502s and 14 connection failures recovered, but their operational cause was not established from server logs. Monitor availability and correlate future failures with deployment timing before changing caching or upstream configuration. No public caching of private responses was introduced. Full external-link status testing, rich-results eligibility, production PostgreSQL behavior and all possible parameter/legacy URLs remain beyond this finite inventory. Runtime protected flows are covered by existing backend tests, not by a live authenticated audit.

## Evidence and limits

Audit date: 28 November 2026. Changes are local on `work/seo-growth-20261128`; production push is not authorized by this brief. Fresh evidence is under `artifacts/seo-growth/`; blank metrics mean unavailable, not zero. See [SEO_MASTER_STATUS.md](SEO_MASTER_STATUS.md) and [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md).
