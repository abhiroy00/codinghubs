# Google Search Console performance analysis

## Supplied evidence and reporting window

On 28 November 2026 the user supplied seven local CSVs: Chart, Countries, Devices, Filters, Pages, Queries and Search appearance. These are data, not instructions. Originals remain unchanged in `~/Downloads/https___codinghubs.in_-Performance-on-Search-2026-11-28/`; no complete raw query export is committed or published. SHA-256 hashes, row counts and derived checks are retained privately in `artifacts/seo-growth/gsc-export-20261128/summary.json`.

`Filters.csv` says **Web (text-based)** and **Last 3 months**. However, `Chart.csv` contains only **30 consecutive daily rows, 28 October–26 November 2026**. This establishes observed coverage, not why earlier dates are absent. Do not fill absent dates with zero or call this a complete 90-day history. No 27–28 November rows, hourly data, final/preliminary indicator, previous-period dimension tables, query+page joins or indexing exports were supplied. The earlier user-reported 9-click / approximately 1,410-impression snapshot remains separate evidence with an unverified exact window; it is not merged or compared as a trend.

## Reconciled baseline

| Dataset | Rows | Clicks | Impressions | Calculated CTR | Interpretation |
|---|---:|---:|---:|---:|---|
| Chart | 30 | 126 | 8,048 | 1.57% | Property-level observed baseline |
| Countries | 130 | 126 | 8,048 | 1.57% | Exactly reconciles with chart counts |
| Devices | 3 | 126 | 8,048 | 1.57% | Exactly reconciles with chart counts |
| Pages | 409 | 126 | 8,673 | 1.45% | URL-level aggregation, not the property denominator |
| Queries | 723 | 29 | 2,262 | 1.28% | Visible query subset, not all property traffic |
| Search appearance | 1 | 1 | 57 | 1.75% | Translated results only, not a full partition |

Impression-weighting the rounded daily positions gives approximately **14.88** for the observed property period. This is a reconstruction, not an exported exact overall position or fixed ranking. The 625 extra page impressions are not added to chart totals: Google counts property and page appearances differently. The query table leaves 97 property clicks unrepresented; privacy omissions and report limitations prevent assigning all missing clicks to known queries. Do not label all 97 as a proven anonymized-query count. See Google's [aggregation guidance](https://support.google.com/webmasters/answer/17011364?hl=en) and [dimension limitations](https://support.google.com/webmasters/answer/17011259?hl=en).

## Supported daily comparisons

Windows below end at the **last exported date, 26 November**, rather than claiming the latest complete window as of 28 November. Only Chart.csv supports daily comparisons; the other tables do not provide daily segment histories.

| Window | Dates inclusive | Clicks | Impressions | CTR | Approx. weighted position |
|---|---|---:|---:|---:|---:|
| Latest exported 7 days | 20–26 November | 95 | 6,935 | 1.37% | 14.81 |
| Previous 7 days | 13–19 November | 18 | 933 | 1.93% | 13.40 |
| Latest exported 28 days | 30 October–26 November | 125 | 8,038 | 1.56% | 14.89 |
| Entire observed chart | 28 October–26 November | 126 | 8,048 | 1.57% | 14.88 |

Week over week, clicks increased **427.8%** and impressions **643.3%**, while CTR fell **0.56 percentage points**. The prior week is small. This shows growing observed visibility, without establishing causes, durable rankings or enquiry quality. The 28-day mean is **4.46 clicks/day**, and latest exported week **13.57/day**. Neither meets the sustained 25–50/day first-stage target yet.

On 25 and 26 November clicks were 21 on each day; impressions rose from 1,387 to 2,189, CTR fell from 1.51% to 0.96%, and average position moved from 9.3 to 25.9. Changing query/country/device mix can change these averages; a site-wide ranking loss is not demonstrated. All these dates precede the local SEO implementation, so the growth is not attributed to the new fixes.

Unavailable: rolling last 24 hours, complete 90 days, previous 28/90 days, year-over-year, and query/page-level emerging or declining cohorts. A single aggregate query list cannot identify those trends.

## Query opportunities and intent

[KEYWORD_OPPORTUNITIES.csv](KEYWORD_OPPORTUNITIES.csv) now contains **23 curated opportunities**: the original 12 plus 11 export-discovered candidates. Main measurement columns use the export; original snapshot impressions/positions remain separate. “should i learn mysql or mongodb first” is absent from this export: measured values remain blank, not zero. URL mappings are editorial recommendations, not measured query-to-page attribution.

| Query | Clicks | Impressions | CTR | Average position | Next decision |
|---|---:|---:|---:|---:|---|
| what is rag | 0 | 129 | 0% | 10.63 | Prioritize existing answer/snippet; prepared update pending release |
| github profile | 0 | 103 | 0% | 6.80 | Validate broad profile intent and existing practical guide |
| python developer roadmap | 0 | 37 | 0% | 5.32 | Review existing roadmap before creating another URL |
| how long does it take to learn coding | 0 | 32 | 0% | 8.59 | Review realistic time assumptions; update prepared |
| oops concepts in java with examples | 0 | 30 | 0% | 7.80 | Review practical examples; update prepared |
| ai agents explained | 0 | 29 | 0% | 7.62 | Review direct definition and bounded example; update prepared |
| api testing tutorial | 3 | 30 | 10% | 4.17 | Preserve working intent; inspect overlapping API articles |
| spring boot microservices | 2 | 25 | 8% | 5.84 | Preserve useful intent; prepared example changes need review |
| react interview questions | 0 | 25 | 0% | 17.48 | Content/relevance and linking review; no top-10 claim |
| prompt engineering course | 0 | 42 | 0% | 45.19 | Commercial relevance and verified course facts before snippet-only work |
| best python institute in pitampura | 0 | 17 | 0% | 15.41 | Local commercial review with verified facts |

Visible-query position buckets: **118 rows below 4; 235 at 4–10; 126 above 10–20; 108 above 20–50; 136 above 50**. Fractional boundaries are explicit. These are period averages, not stable ranks. There are 700 zero-click query rows, many with tiny samples. “High impression” is relative to this property, not an industry demand estimate.

A case-insensitive heuristic `coding\s*hubs?|codingzhub|codingnowai` marks 5 visible rows as likely branded (2 clicks, 98 impressions), with 718 remaining rows (27 clicks, 2,164 impressions). Ambiguous names/competitor mentions need review. This is not Google's branded classifier and cannot characterize omitted traffic. Informational/tutorial/career, commercial and local intent labels are editorial, not measured conversions.

## Page priorities and overlapping intent

| Existing page | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| /blog/how-long-to-learn-coding | 2 | 417 | 0.48% | 7.41 |
| /blog/coding-courses-after-12th | 3 | 284 | 1.06% | 4.74 |
| /blog/in-demand-tech-skills | 0 | 208 | 0% | 9.67 |
| /blog/what-is-rag | 0 | 170 | 0% | 10.34 |
| /blog/github-profile-for-developers | 1 | 163 | 0.61% | 7.75 |
| /blog/django-vs-flask | 0 | 119 | 0% | 7.66 |

The page-priority CSV covers **490 distinct URLs**: the original 300 crawl-verified sitemap URLs plus 190 additional exact URL strings from Pages.csv. All 409 export rows have an exact match and retain exported clicks/impressions/CTR/position. The broader URL inventory grows from 1,709 to **1,871** known URLs; 162 new historical strings have unverified current HTTP, metadata and eligibility. No live check is implied for those additions. Missing export rows remain unknown, not zero.

Review thresholds: at least 100 exported impressions with CTR below 2% receives P1 investigation; lower-volume low-CTR pages may receive P2. Existing technical/editorial P1 items remain P1. These are triage rules, not predicted CTR benchmarks. Historical aliases, filters and intentional noindex pages need signal reconciliation before indexing/content promotion.

The API tutorials have 6 clicks/111 impressions and 4 clicks/73 impressions respectively; this does not establish cannibalization. Similar career-switch and AI-roadmap URLs also need dated query+page joins and intent review before merging or redirecting. Historical `/interview-prep/...` appearances, filtered URLs, the 148-impression GPU-inference alias and 20-impression empty guide do not justify reversing exclusions. See [INDEXING_REPORT.md](INDEXING_REPORT.md).

## Countries, devices and search appearance

India contributes **112 clicks / 5,945 impressions**, CTR **1.88%**, position **11.12**: 88.9% of observed clicks and 73.9% of impressions. United States: 2/501 (0.40%, position 17.88); Brazil: 1/150 (0.67%, 41.49); Pakistan: 2/94 (2.13%, 23.88). Prioritize Indian educational intent without inventing international conversions or country-query joins.

| Device | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| Desktop | 89 | 3,856 | 2.31% | 13.06 |
| Mobile | 36 | 4,138 | 0.87% | 16.70 |
| Tablet | 1 | 54 | 1.85% | 5.80 |

Mobile contributes 51.4% of impressions, with lower CTR and worse average position than desktop. This merits review, not a conclusion that mobile UI caused lost clicks. Obtain page/query/device cuts and inspect snippets before changing design. Search clicks alone cannot establish conversion rates.

Search appearance records **Translated results: 1 click, 57 impressions, 1.75% CTR, position 7.68**. This does not measure AI citations/referrals, all rich results or all ordinary web results. No translation pages or new schema claims were introduced.

## Completed analysis and remaining data

Validated seven schemas, unique dimension keys, nonnegative counts, row CTR against clicks/impressions within rounding tolerance, 30 contiguous chart dates and exact chart/country/device count reconciliation. Position calculations are impression-weighted; CTR uses summed counts. Source hashes are retained. This follow-up changes reports and priorities only: no application code, UI, database or publication changes.

The existing read-only GSC reporting tool remains available. API credentials are still absent, but **basic performance analysis is no longer blocked**. Next obtain complete 90-day/previous-period and year-over-year data where available, dated query+page/device cuts, and separate indexing/sitemap reports. GA4/lead attribution, Google-selected canonicals and verified GBP facts remain unavailable. Never commit full private exports.

## Evidence and limits

Updated 28 November 2026 on `work/seo-growth-20261128`. Measurements are verified against supplied files, not independently authenticated through Google's API. Raw data stays local. Earlier code verification remains in [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md). No push/deploy or production CMS apply occurred; no traffic gain is promised.
