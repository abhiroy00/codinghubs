# Free integrations and evidence limits

Status: 29 November 2026. No paid API credentials, billing account, paid trial or new cloud service was activated.

| Integration | Implemented path | Verified state / required input |
|---|---|---|
| GSC exported data | Bounded CSV/XLSX, coherent import sets, hashes, counts, provenance | Seven supplied CSVs imported into real PostgreSQL; XLSX behavior tested |
| GSC API | OAuth PKCE, property list/selection, dated dimensions including query/page joins, URL inspection, sitemap monitoring | Boundary/refresh/quota/pagination tests pass; real Google client credentials and property permission missing |
| Sitemap submission | Optional additional write scope and explicit per-request approval | Permission tests pass; no live submission attempted |
| GA4 Data API | Read-only runReport and property selection | Code/boundary tests; missing authorized property/client credentials; no invented conversions |
| Keyword Planner / Trends | Manual permitted CSV/XLSX exports, UTF-16/tab exports and Trends preamble support | Parser/evidence tests; Ads competition is not organic difficulty; Trends interest is not search volume |
| Keywords, SERPs, indexing, backlinks, AI observations, performance | Separate manual evidence categories | Provenance and explicit completeness limits; no automatic Google/SERP scraping |
| Competitor research | User-provided public domains, bounded public crawl and captured-content comparisons | Same crawler protections as owned sites; no competitor domains were invented/imported as authorized |
| Local AI | Qwen3 0.6B via Ollama on localhost | Actual generation, cache, schema/fallback and browser workflow exercised |
| Local embeddings | Nomic Embed Text v1.5 via local Ollama | Actual 768-dimension embeddings and real PostgreSQL hybrid retrieval exercised |
| ChatGPT subscription | Copyable evidence prompt and validated JSON import | Browser export + import/source/replay tests; consumer website is never automated |
| Git / GitHub | Registered local repo, diff, approval, local apply/static checks/rollback; explicit draft-PR CLI | Local fixture tests and actual repo registration; no new remote PR, push or deployment performed |
| Monitoring | Local resource dashboard and bearer-protected Prometheus exposition | Actual unauthorized 401/authorized 200 checked; optional Prometheus/Grafana containers not run |

## Connect Google when credentials are available

Use an existing/free Google Cloud project without attaching billing or enabling unrelated paid products. Enable Search Console API, Analytics Data API and Analytics Admin API as needed. Create an OAuth Desktop client for loopback authorization, configure the consent screen and add the owner as a test user if the project is in testing. Do not commit the downloaded client JSON. Enter client ID/secret in the local Data & integrations UI, connect Google, then select an authorized GSC property and optional numeric GA4 property (`properties/123456`). The callback is `http://127.0.0.1:8765/api/google/callback`; use that host/port consistently.

Read-only scopes are the default. Enabling sitemap write needs a new consent grant and does not itself submit anything. Tokens and client secrets stay encrypted in the local database. OAuth testing-mode refresh limitations can require reconnecting. Actual consent, scope approval and API availability remain unverified until an owner connects their account. See [Google's installed-app OAuth guidance](https://developers.google.com/identity/protocols/oauth2/native-app), [Search Console authorization](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing) and [GA4 Data API setup](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries).

The app uses deliberately conservative local quotas (200 requests/day, 20/minute, 50 inspections/day) in addition to Google's limits, fixed-method/path allowlists and a five-page pagination cap per sync dimension. A quota pause stays in SQL and never falls back to a paid provider. Initial daily retry scheduling is conservative, not a guarantee of Google's reset time. Sync uses final historical days ending two Pacific days before the current day; CSV freshness cannot establish final/preliminary status. API results can be truncated; pagination limits are included in source metadata. See [GSC usage limits](https://developers.google.com/webmaster-tools/limits) and [search analytics query behavior](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

## The supplied CodingHubs export

The chart covers **28 October–26 November 2026**, 30 observed days: **126 clicks, 8,048 impressions, 1.57% CTR**. It does not contain the requested November 27–28 baseline or complete 90-day/year-over-year data. Query/page tables are independently aggregated; page impressions total 8,673 and must not replace the property chart's denominator. Last observed seven days have 95 clicks; the preceding seven have 18. These are source observations that predate this local platform, not improvements caused by it.

No GA4, complete GSC Links report, manual AI visibility dataset, verified faculty/fees/placements or competitor SERP dataset was supplied. Missing sources remain blocked/partial. Identifiable referrals are domain-matched traffic observations, not proof of a citation, verified backlink, enquiry or admission.

## License choices

The selected [Qwen3 0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) and [Nomic embedding model](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) publish Apache-2.0 licenses. Ollama is MIT and pgvector uses the PostgreSQL license. The local embedding runtime avoids remote model-code execution and does not require installing Sentence Transformers. Redis was not replaced; the optional compatible queue uses Valkey.

Prometheus is Apache-2.0; Grafana OSS is AGPL and has redistribution/network-use obligations. Docker Engine/Compose are optional; no Docker Desktop subscription is required. Dependency names/versions are locked in `uv.lock` and `frontend/package-lock.json`; model/OSS licensing should be reviewed again before redistribution. A zero budget is not a blanket legal compatibility opinion.
