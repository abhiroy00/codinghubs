# CodingHubs platform refresh — review and operations

Implemented locally on 17 November 2026. Nothing was pushed, deployed, migrated in production, or emailed to real subscribers.

## Scope and preservation

The existing React 19 / TypeScript / Vite public app, Django 6.1 / DRF backend, protected React admin, JWT/browser sessions, PostgreSQL deployment and persistent private-media volume were extended. Existing SMTP configuration is reused through Django's email backend. No new framework, identity system, external email SDK or PDF viewer dependency was added.

The workspace already contained extensive uncommitted/staged performance work. It was retained. The initial working-tree/index patches and original status were captured under `/tmp/codinghubs-existing-*`; these are local preservation files, not deployment inputs. Existing performance edits were not committed or reset.

**Content inventory:** 43 course routes, 25 source-backed preparation mappings and 20 curricula remain. All **693 existing JSON data files** in the initial inventory are byte-for-byte unchanged. Existing roadmap/article/question identifiers and local progress keys remain stable. Eight original topic guides were added. The server search catalogue contains 259 resource URLs and also searches newly published database interview questions. See `artifacts/platform/content-preservation.json`.

The four public reference URLs from the request were attempted through the web tool and ordinary HTTPS access; they were inaccessible in this environment. No claims about their actual appearance or contents were used. New explanations, examples and exercises are original CodingHubs material.

## Requirements status

| Area | Status | Evidence / practical limit |
| --- | --- | --- |
| Interview routes and visible naming | Implemented | Canonical `/interview/`; old nested URLs permanently redirect individually, retaining query strings; client navigation retains fragments. |
| Content preservation and topic guides | Implemented | 693 original JSON files unchanged; 8 complete new guides with explanations, examples, exercises, TOC and related topics. |
| Search and filters | Implemented | Server full-text search, category/difficulty filters, URL state, pagination, loading/error/no-result states. Course overviews say “Mixed levels”; concrete guide/lesson difficulties use known metadata. |
| Bookmarks, completion and activity | Implemented | Owner-scoped authenticated article state; course-question completion continues through existing progress APIs. Public reading needs no account. |
| Guest progress | Implemented | Explicit import into the signed-in account; union of completion sets and highest quiz score; guest copy is removed only after acknowledged success and only if unchanged. Existing validation remains enforced. |
| Profile consolidation | Implemented | One `/my-account` destination with personal information, security, data export/deletion, courses/progress/certificates, Interview activity and existing Studio preferences. |
| Newsletter public/backend/admin | Implemented | Consent, durable opt-in outbox, expiration, unsubscribe/re-subscribe, published issues, safe HTML, private subscriber management and CSV export. |
| Campaign delivery | Implemented; live provider unverified | Explicit preview + SEND confirmation; durable batching/worker; unique campaign content version and recipient constraints; no automatic retry of ambiguous delivery. |
| Course brochures | Implemented | Stable course ID mapping, validated private PDF storage, replacement recovery, publish/unpublish/remove, public attachment downloads and admin management. |
| Header and navigation | Implemented | Consistent destinations, mobile focus containment/scroll restoration, Escape/outside click, hidden menus not tabbable, close after navigation, Resources hover/click conflict fixed. |
| Performance | Measured; targets not universally met | Three controlled cold mobile runs per representative route; see performance artifacts and table below. No field data or Lighthouse score is claimed. |
| External setup | Required | Verified SMTP sender/provider and explicit newsletter worker enablement; normal reviewed production migration/release process. |

## Routes and compatibility

| Destination | Behavior |
| --- | --- |
| `/interview/` | Searchable topic hub and all existing subject roadmap links. |
| `/interview/:course/` | Existing preparation content, with original progress identifiers. |
| `/interview/:course/levels/:level/` | Existing level overview. |
| `/interview/:course/levels/:level/articles/:article/` | Existing article, examples and questions. |
| `/interview/:course/levels/:level/days/:day/` | Existing daily content. |
| `/interview/guides/:slug/` | New original fundamentals guides. |
| `/interview/:course/?question=:id#practice` | Opens the corresponding published database question. |
| `/interview-prep/*` | Nginx and Django return 301 to the matching `/interview/*`; SPA compatibility also retains query/hash. |
| `/newsletter/` | Signup and actual published issue archive. |
| `/newsletter/issues/:slug/` | Published issue only, sanitized content and publication date. Drafts return 404. |
| `/newsletter/confirm/`, `/newsletter/unsubscribe/` | Explicit token action; no automatic mutation on opening a link. `no-store`, `no-referrer`, noindex. |
| `/brochures/` | Published PDFs only; honest empty state. |
| `/api/courses/brochures/:slug/download/` | Public PDF attachment, without signup. |
| `/my-account?section=learning` | Existing enrollments, progress and certificates in the account shell. |
| `/my-account?section=interview` | Actual bookmarks, completed resources and recent activity. |
| `/my-account?section=studio` | Existing Studio preference records and controls. |
| `/dashboard?tab=...` | Compatible client redirect into account learning with the tab retained. |
| `/interview-studio/profile` | Compatible redirect into account Studio preferences. |

Commerce APIs, entitlement checks, purchases, courses, enrollments, certificates, registration forms and existing content/download APIs remain. The pre-existing retired store/order frontend routes remain retired; no second commerce/account UI was introduced.

## Admin instructions

### Brochures

1. Open **Courses → Manage PDF brochure** for the correct database course.
2. Choose a PDF, enter its title, description and download filename, and upload. The default maximum file size is 10 MB; extension, MIME type and actual PDF signature are checked on the server.
3. Check **Published for public download** and save to expose it. Uncheck it and save to remove public availability.
4. To replace it, choose a new PDF and save. The new object and database update must succeed before the old file is retired. Failed replacements preserve the old record/file and remove the newly stored orphan when possible.
5. **Download current PDF** performs an authenticated download. **Remove brochure** requires confirmation and removes only the brochure, not the course.

Files use generated UUID storage keys in the existing persistent private volume, outside public `/media/`. Downloads are attachments with `application/pdf`, `Content-Disposition`, `nosniff`, CSP sandbox, frame denial and no-store. No PDF is embedded or prefetched on page load. The actual nginx admin-course proxy accepts the default 10 MB upload size plus multipart overhead; a 9 MiB PDF was verified through nginx and then removed from the isolated review database/storage. There is no inline app-origin PDF preview.

`python manage.py cleanup_brochures` lists unreferenced files older than 24 hours. Review the output before running `python manage.py cleanup_brochures --apply`. The grace period protects in-flight replacements; normal database/media backups remain necessary.

### Subscribers and issues

1. Open **Newsletter → subscribers** to search, filter by status and paginate. Consent, confirmation, source and unsubscribe timestamps are visible.
2. Unsubscribe a subscriber or explicitly confirm deletion. Filtered CSV export is authenticated/admin-only and neutralizes spreadsheet formula prefixes.
3. Open **issues → New issue**, fill title/slug/excerpt/content and save. HTML is sanitized server-side on save and again on public output.
4. **Publish on website** controls site visibility only. It does not send mail. Preview uses saved, sanitized server content. Unpublishing makes public detail/API access return 404.

### Campaigns

1. Publish the intended issue, then open **campaigns**.
2. Choose the issue and click **Preview recipients and content**. This counts currently confirmed recipients and issues a signed preview token valid for ten minutes. Editing the issue invalidates the preview.
3. Review, type **SEND**, then explicitly queue the campaign. Queueing is not delivery.
4. Repeated request keys and repeated queue requests for the same issue/content version reuse the campaign. Recipient rows are unique. Content is snapshotted; later edits do not alter already queued mail.
5. The worker rechecks subscription status and consent nonce immediately before each message. An unsubscribe or re-subscription invalidates older queued eligibility.
6. Inspect campaign counts and paginated delivery statuses. `sent` means the configured mail backend accepted the message; it does not prove inbox delivery. `unknown` means the provider may have accepted it before an error, or the worker was interrupted. Do not reset these rows to pending without provider reconciliation. The stable Message-ID contains the delivery row ID.

## Setup, migrations and worker

New additive migrations:

- `accounts/0004_interviewstate.py`
- `courses/0009_coursebrochure.py`
- `newsletter/0001_initial.py`
- `newsletter/0002_campaign_content_digest.py`

Run the normal reviewed `python manage.py migrate` during deployment after backing up the database and persistent private media. This session migrated **only an isolated SQLite review database** and Django's disposable test databases. SQLite uses short IMMEDIATE transactions for local concurrent writes; the PostgreSQL deployment is unchanged.

SMTP configuration is server-only. Placeholders and defaults are in `backend/.env.example` and `.env.prod.example`:

```dotenv
NEWSLETTER_EMAIL_ENABLED=False
NEWSLETTER_CONFIRM_TTL=172800
NEWSLETTER_UNSUBSCRIBE_TTL=31536000
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.invalid
EMAIL_PORT=587
EMAIL_HOST_USER=replace-me
EMAIL_HOST_PASSWORD=replace-me
EMAIL_USE_TLS=True
EMAIL_TIMEOUT=15
DEFAULT_FROM_EMAIL=replace-with-verified-sender@example.invalid
BROCHURE_MAX_BYTES=10485760
PRIVATE_MEDIA_ROOT=/app/private_media
```

Configure a verified provider/sender, confirm the existing private-media volume is mounted and backed up, then deliberately enable `NEWSLETTER_EMAIL_ENABLED`. Missing/disabled configuration returns an honest 503 instead of claiming mail delivery. Production confirmation and campaign mail require the worker:

```sh
docker compose --profile newsletter up -d newsletter-worker
# Or a supervised process in the existing backend environment:
python manage.py process_newsletter --watch --limit 50
# One bounded batch:
python manage.py process_newsletter --limit 50
```

The worker uses the database outbox and reuses Django SMTP; no fire-and-forget request thread is involved. Tune the bounded batch size to the provider's quota. Normal restarts preserve pending messages. Stale `sending` rows become `unknown` after 15 minutes on the next worker batch and are not automatically resent. Monitor pending/unknown counts through the admin and configure provider-side delivery/bounce monitoring before launch.

Keep `NEWSLETTER_EMAIL_ENABLED=False` until that external setup is complete. No real campaign was sent during implementation. Tests use in-memory mail; browser review used isolated `.test` recipients and an inactive delivery worker.

For rollback, disable the newsletter worker/email and revert feature exposure first. Keep additive tables and private files until exports/backups are verified. Do not drop subscription or progress data merely to roll back the UI. Preserve the legacy/new Interview URL shim when rolling back routing, since clients and search engines may retain permanent redirects.

## Performance and assets

The initial workspace already contained image variants, local fonts, compression, first-paint CSS and video edits; these were preserved rather than credited as new work. The historical 316 KB JPG / 114 KB WebP example did not match the current files: the current `banner.jpg` is about 84 KB and the prepared 1600/800 WebPs are about 60/25 KB. Responsive slider sources/preloads already use the matching variants. Originals were retained.

This change keeps the 2 MB full-text Interview index on the server, uses a small SEO projection instead of importing the 468 KB roadmap manifest through shared metadata, lazy-loads the new admin controls, and uses metadata preload for background video. New newsletter-body images load lazily. The public app still uses the existing lazy route/content loading architecture.

Measurements are local lab **PerformanceObserver** data: 390×844, CPU throttling ×4, 150 ms RTT, 1.6 Mbps down, three cold browser contexts per route, five-second observation. Existing-route before/after comparisons use the same local production preview. New database pages use the local production-style nginx/backend gateway and have no pre-feature baseline. Long-task blocking is recorded as a diagnostic; it is **not Lighthouse TBT**. No Lighthouse/CrUX/field score is claimed.

See `artifacts/platform/performance-before.json`, `performance-after.json`, `performance-new-before-posters.json` and `performance-new.json` for all runs and median values. The measured LCP is the hero background on home/hub/course pages and a paragraph on the representative existing interview article. Some mobile FCP/LCP targets remain unmet; no content or functionality was hidden to inflate the result.


| Route | FCP before → after | LCP before → after | CLS after | Transfer before → after |
| --- | --- | --- | --- | --- |
| Home | 2.71s → 2.52s | 2.84s → 2.74s | 0.0778 | 485 → 488 KiB |
| Interview hub | 1.64s → 1.53s | 2.64s → 2.68s | 0.0047 | 447 → 391 KiB |
| Existing Interview article | 1.70s → 1.60s | 4.15s → 1.60s | 0.0005 | 448 → 457 KiB |
| Course detail | 1.61s → 1.51s | 2.13s → 2.37s | 0.0109 | 426 → 435 KiB |

New gateway routes (after only; no pre-feature equivalent):

| Route | FCP | LCP | CLS |
| --- | --- | --- | --- |
| /newsletter/ | 2.20s | 2.22s | 0.0000 |
| /brochures/ | 1.64s | 1.64s | 0.0001 |
| /my-account?section=interview | 3.09s | 3.09s | 0.0003 |

Homepage and authenticated profile FCP/LCP, hub LCP, and newsletter FCP still exceed the requested goals under this lab setup. CLS is below 0.1 on the measured routes. Newsletter/Brochures first-paint posters reduced their measured LCP from 4.28/4.15 seconds to 2.22/1.64 seconds. Live Lighthouse TBT and field metrics remain unverified.

## Verification and review artifacts

- Public production build and prerender: 1,715 pages; 331 indexable sitemap URLs.
- Full `npm run validate`: content sync, Interview index sync, roadmap/GenAI checks, SEO/canonicals/links and location validation.
- Public TypeScript, all 13 Vitest tests and lint (warnings in existing code and new async data-state effects, no errors); admin production build; backend ruff and migration-drift checks.
- Full backend suite: 460 tests, 452 passed and 8 skipped; 25 focused lifecycle/security/failure tests pass. The eight existing Docker sandbox tests require `STUDIO_TEST_DOCKER=1` and reviewed runtime images; they remain skipped rather than being claimed as executed.
- Browser checks: 360/390/768/1440 widths, home/hub/article/newsletter/course/brochures, mobile menu keyboard/scroll behavior, search/filter refresh, legacy deep-link query/hash, login, persistent bookmark/completion, account redirects and protected admin navigation.
- Admin browser checks: issue sanitization/publication/preview, explicit campaign queue/duplicate prevention, authenticated CSV export, PDF upload, anonymous attachment download and unpublish.
- Actual nginx configuration syntax and permanent redirect checked locally; token-page response headers verified. Newsletter confirmation/unsubscribe were exercised through the actual local nginx/backend gateway.

Machine-readable evidence is under `artifacts/platform/`; screenshots include `interview-desktop.png`, `interview-mobile.png`, `guide-desktop.png` and `newsletter-mobile.png`. They show isolated local verification data, not a claim about production issues/subscribers.

## Main implementation surfaces

- Public UI: `frontend/src/interview/`, `frontend/src/community/`, `frontend/src/shop-pages/account.tsx`.
- Routing/static rendering: `frontend/src/App.tsx`, `frontend/src/entry-server.tsx`, `frontend/scripts/prerender.mjs`, `frontend/nginx.conf`.
- Authenticated state/search: `backend/apps/accounts/interview.py`, `backend/apps/accounts/models.py`, `backend/apps/courses/progress_import.py`.
- Newsletter: `backend/apps/newsletter/` and `admin-panel/src/CommunityAdmin.tsx`.
- Brochures: `backend/apps/courses/brochures.py`, `backend/apps/courses/test_brochures.py`, course admin controls and `cleanup_brochures` management command.
- Setup: `docker-compose.prod.yml`, environment examples, the migrations listed above.

Genuine external limitations: public inspiration/live-site access failed; SMTP sender/provider and worker activation were not verified live; production field performance and Docker sandbox execution were unavailable. These do not represent placeholder persistence or simulated production delivery.

## Local review

Public development preview: http://127.0.0.1:5178/interview/ (with the isolated review API). Admin preview: http://127.0.0.1:5177/admin-panel/. Production-style local nginx review: https://localhost:5181/ with a locally generated, self-signed review certificate. These are local review services, not a deployment.

The remote-tracking branch advanced by two commits while this work was in progress. No merge/rebase, commit or push was performed for this task; reconcile that remote advance before a later requested push, preserving the existing staged/unstaged performance work.
