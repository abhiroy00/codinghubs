# Newsletter technology news feed

`/newsletter/` shows recent technology headlines below the email signup. The two features are independent: the feed never touches subscribers, and the signup works when the feed is empty or failing.

## How it works

- **Sources** — `backend/apps/newsletter/feeds.py` → `SOURCES`. Only publisher-provided public RSS/Atom feeds are read: The GitHub Blog, Stack Overflow Blog, AWS News Blog, Hugging Face Blog, MIT Technology Review (AI topic feed) and InfoQ. No API keys or credentials are needed. Each source lists the domains its item links may point to; items linking elsewhere are dropped.
- **Editorial taxonomy** — `CATEGORIES` in the same file: AI & machine learning, Software development, Data & databases, Cloud & DevOps, Developer tools, plus *Learning & careers* as a secondary label only. A title match scores 2 and a summary match 1; an item needs 2 or more in one technology category. Summary-only mentions (ambiguous), education-only items and items matching the exclusion list (sports, politics, celebrity, deals/discounts, sponsored, …) are dropped.
- **Normalisation** — plain-text titles (200 chars) and summaries (280 chars) with markup, scripts and entities removed; UTC ISO dates; canonical `https` URLs without tracking parameters or fragments. Items without a valid date, dated more than a day in the future or older than 60 days are dropped. Duplicates are removed by canonical URL and by normalised title across sources, newest first, at most 60 items.
- **Safety** — 2 MB response limit, connect/read timeouts, documents with a DTD or entity declarations in the prolog are rejected. The page renders text only (no HTML from feeds) and every headline links to the original article in a new tab.
- **Caching and failures** — the validated feed is stored in the Django cache with no expiry and refreshed when older than `TECH_FEED_TTL`. A refresh fetches all sources in parallel; a source that fails (timeout, HTTP error, malformed XML) keeps its last validated items and is reported as failing in the API response. With no cached data and every source failing, the API returns an empty list and the page shows an honest empty state.
- **API** — `GET /api/newsletter/feed/` (optional `?category=ai|software|data|cloud|tools|education`). Like every `/api/` response it is `private, no-store` for browsers; the server-side cache absorbs traffic.

## Settings (`backend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `TECH_FEED_TTL` | `1800` | Seconds before a request triggers a refresh |
| `TECH_FEED_TIMEOUT` | `6` | Read timeout per source, seconds (connect timeout is 3.05 s) |
| `TECH_FEED_REFRESH_ON_REQUEST` | `True` (`False` in tests) | Refresh synchronously on the first request after the TTL. A cache lock ensures only one request refreshes; others are served the cached feed |

Persistence of the last good feed depends on the cache backend: the production file cache (`CACHE_LOCATION`, default `backend/.cache`) survives restarts; use Redis when running more than one host.

## Operations

```sh
cd backend
python manage.py refresh_tech_feed            # fetch now and print each source's status
python manage.py refresh_tech_feed --watch    # optional worker: refresh every 30 minutes
```

To keep request latency flat, run the `--watch` command as a worker (same image as the backend, like `newsletter-worker` in `docker-compose.prod.yml`) and set `TECH_FEED_REFRESH_ON_REQUEST=False`. Adding or removing a source is a code change to `SOURCES`; confirm the publisher offers the feed publicly for syndication first.

## Tests

`backend/apps/newsletter/test_feeds.py` covers RSS and Atom parsing, mixed tech/non-tech items, ambiguous items, duplicates across sources, malformed and unsafe XML, off-domain and `javascript:` links, missing/future/old dates, provider failure with last-good fallback, the honest empty state and API filtering. `frontend/src/community/TechFeed.test.tsx` covers loading, rendering, filtering, empty, malformed-response and partial-failure states.

Live check on 18 November 2026: all six sources returned valid feeds; 90 validated items were reduced to 60 after de-duplication and the item limit.
