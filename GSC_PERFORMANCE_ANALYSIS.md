# Google Search Console performance analysis

## Available evidence

The user's 27–28 November 2026 snapshot reports 9 clicks, approximately 1,410 impressions, 0.6% CTR and average position 28.4. The implied aggregate CTR is about 0.64%, consistent with rounding. The exact reporting window, property filters and final/fresh status were not supplied. These figures are not independently verified and must not be labeled a daily baseline or a sustained trend.

`GSC_SERVICE_ACCOUNT_JSON` / `GSC_SERVICE_ACCOUNT_B64` are not configured locally. Running `manage.py seo_gsc_report` fails explicitly before making requests; no credentials or metrics were invented. Existing November 23 validation-triage CSVs describe historical URL exclusions, not query/click performance. Scoped connected-Drive searches also found no relevant CodingHubs performance export; unrelated teaching files were not opened.

| Requested cut | Current state |
|---|---|
| Last 24 hours | Unavailable; optional hourly export supports later analysis, but two calendar days are not automatically a rolling 24-hour total |
| Last 7/28/90 days | Unavailable; exact daily windows and read-only exports implemented |
| Previous-period comparison | Equal-length, non-overlapping windows implemented; no actual trend calculated |
| Year-over-year | 28-day, leap-day-safe comparison implemented; historical data availability unknown |
| Queries/pages/query+page | Export dimensions supported; 12 supplied queries mapped in the opportunities CSV |
| Countries/devices/search appearance | Export dimensions supported; no fabricated segments |
| Indexed/non-indexed/sitemaps | No authenticated current property data; public sitemap/HTTP checks are in INDEXING_REPORT |

## Provisional opportunities

[KEYWORD_OPPORTUNITIES.csv](KEYWORD_OPPORTUNITIES.csv) maps all 12 supplied queries to 11 existing articles. The two agent queries share a target. Positions around 8–17 suggest pages to inspect, but 3–18 impressions per query are too little evidence for reliable CTR tests, trend claims or revenue forecasts. Clicks and query CTR were not supplied and are left blank. A fractional position of 10.8 is an aggregate, not proof of a stable position 11 ranking.

Zero-click/high-impression, declining, emerging and cannibalizing queries cannot be diagnosed from this snapshot. First compare query+page rows over 28/90 days, separate branded/non-branded intent, and then inspect country/device cuts. Do not sum query rows to pretend they are complete property totals.

## Completed reporting changes

Fixed the inclusive-day error in existing blog sync. Added paginated, capped requests, explicit truncation, preserved API metadata, Pacific reporting dates, stable daily windows, previous-period windows and an optional recent hourly export. Raw exports remain under ignored `artifacts/`, not in public endpoints or committed CSVs.

After authorized credentials are supplied, from `backend/` run:

```bash
DEBUG=True .venv/bin/python manage.py seo_gsc_report --as-of 2026-11-28 --recent-hours
```

Use the production environment's normal DEBUG setting when running there. Review privacy limits, incomplete hours, anonymized query omissions and row caps before deriving opportunities. The service account needs read-only access to the intended property. [Google's Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) documents inclusive dates, pagination, fresh data and top-row limits.

Pending: obtain authorized exports/access, compute the actual requested comparisons, and validate the provisional priorities.

## Evidence and limits

Audit date: 28 November 2026. Changes are local on `work/seo-growth-20261128`; production push is not authorized by this brief. Fresh evidence is under `artifacts/seo-growth/`; blank metrics mean unavailable, not zero. See [SEO_MASTER_STATUS.md](SEO_MASTER_STATUS.md) and [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md).
