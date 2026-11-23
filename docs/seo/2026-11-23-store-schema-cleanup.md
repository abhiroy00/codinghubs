# Validation export and retired Store cleanup — 23 November 2026

The owner supplied `Table.csv` and explicitly requested cleanup in both local and production databases with backups. This document records the pre-deployment findings and implementation. Post-deployment logs and live evidence are retained locally under `artifacts/store-cleanup-2026-11-23/`.

## Search Console export

The supplied file has **456 unique URLs**, not the entire reported 611. Its sibling `Metadata.csv` identifies the issue as **Excluded by ‘noindex’ tag**, with the scope “All known pages.” Every row's validation status is `Pending`; crawl dates are **9–18 November**, before the latest indexing deployment. Pending is a validation state, not proof that the current response is still noindex.

All 456 exact exported URLs were fetched over HTTPS without following redirects. Results:

| Current classification | Count | Action |
| --- | ---: | --- |
| Legacy `/interview-prep/` redirects | 393 | Preserve the single-hop permanent redirect and working successor. Source URLs should remain outside the index and sitemap. |
| Incomplete or duplicate Interview workspaces | 35 | Preserve content/progress routes; retain their existing noindex until substantive source material is published or an intentional canonical decision is made. |
| Private account/practice routes | 9 | Preserve noindex and existing authorization. |
| Published pages already fixed | 9 | Data Science and all eight topic guides now return indexable, self-canonical HTML. Their old crawl evidence predates the fix. |
| Functional published alias | 1 | `/interview/data-science-pro/` retains the Data Science primary canonical and progress functionality. |
| Learning curricula in preparation | 8 | Keep active learning-library records and their intentional exclusions. |
| Already-retired account orders route | 1 | `/my-account/orders` correctly returns a real 404. |

HTTP totals: **393 × 301, 62 × 200, one × 404**, with no request errors. Of the 62 successful responses, 52 retain their intentional noindex and ten no longer emit noindex (nine preferred pages and one alias). There are **no Store URLs in this export**. None of these 456 URLs was treated as evidence that a database record is unused.

The complete, URL-by-URL classification is [2026-11-23-validation-export-triage.csv](2026-11-23-validation-export-triage.csv). The original export is retained unchanged in the user's Downloads directory. Other exclusion reasons from the reported 611 still need their own URL exports. Search Console live testing, fix validation and requesting indexing require its authenticated interface; they were not submitted by this cleanup.

## Verified unused Store surface

Store routes/APIs and the UI were already retired in the repository. `shop.0008` already purged their data. Read-only inspection confirmed that all 16 retired Store models had **zero records** in the local database. Their only remaining runtime consumers were unreachable commerce views, serializers, calculations and templates, plus old product/order relations on retained resources. No replacement commerce flow was needed; active course enrollment payments are a separate application.

Removed:

- Runtime models/tables: Product, ProductCategory, ProductImage, Cart, CartItem, Coupon, CouponRedemption, StoreSettings, Order, OrderItem, Payment, PaymentEvent, Refund, InventoryMovement, DownloadPermission and FreeDownloadLead, all within `apps.shop`.
- The three product/coupon join tables, their 16 obsolete content types and associated Store-only model permissions.
- Unreachable product/cart/checkout/order/refund/inventory/customer views and serializers; Store payment gateway, pricing, inventory, order/email/money modules; two Store templates; the obsolete `audit_store_orders` command.
- Stale product admin form types/defaults and Store URL mappings; resource price fields, purchase coupling and the paid/free product filter in the frontend.
- Product foreign keys on Project, ProjectGuide and DigitalAsset, and the retired store-order foreign key on DownloadEvent.

Preserved:

- Projects, project questions, project guides, their content/relationships and asset/download/audit records.
- Private file storage and upload helpers used by project resources, course brochures and resumes. The `apps.shop` namespace and historical migrations remain active dependencies, so the entire app directory is not unused.
- Users, authentication/sessions, courses, enrollments, learning progress/certificates, CMS, Interview Studio and **course orders/payments in `apps.payments`**.
- Staff-only restricted project files; account-only/course-included guides. Former `paid` guide access becomes `restricted` and remains denied to unauthorized visitors. Existing download signatures retain their salt; the download TTL's former environment variable remains a compatibility fallback.
- Real 404s for retired public/API Store routes; active project/guide sitemaps, previews, admin permissions and authorized download endpoints.

No private media files were deleted from disk. Unattached files cannot safely be identified as obsolete from this Search Console export. No other feature or database domain had sufficient evidence of non-use to delete it.

## Migration and backups

`shop.0009_remove_retired_store_schema` requires `0008` and refuses to proceed if any retired Store table contains unexpected new records. The migration changes the legacy access label before removing product/order relationships and replaces the asset-owner constraint with exactly one project or guide owner. It then removes only the empty retired tables and their scoped content types/permissions.

Schema reversal restores empty Store tables and the previous access label while preserving resource rows. It does not restore previously purged Store data or removed permission assignments; those require the full database backup.

**Local:** created private, integrity-checked SQLite backup and migration-trial files under `artifacts/store-cleanup-2026-11-23/backups/` (mode 0600). Migrated the copy first, compared protected record counts and checked database integrity, then migrated the actual local database and ran `verify_store_retirement`. The local Store tables are gone. Counts changed only for migration/internal metadata, the 16 retired content types and 64 Store-only permissions. Protected data counts did not change.

**Production:** `infra/deploy-remote.sh` now creates a private PostgreSQL custom-format dump under `/opt/codinghubs/backups/` before startup can migrate. A failed dump, empty output or failed `pg_restore --list` stops deployment. The final archive path and SHA-256 checksum are logged. The deployment captures counts for User, Course, Enrollment, course Order, Project, ProjectGuide and DigitalAsset before migration; `manage.py verify_store_retirement --baseline-json ...` verifies that retired tables are absent and none of those counts decreased afterward. Initial installs without an existing database container are handled separately.

These production archives are host-local; the existing S3 backup process remains the separate off-host recovery mechanism. Automatic rollback to an old image after this schema cleanup is unsafe; restore the database backup with a compatible release when a full rollback is necessary.

## Verification

- Original schema-retirement regression checks failed against the old implementation, detecting registered Store models, product/order fields, the obsolete command, commerce payload fields and missing restricted access.
- Store/resource suite: **35 tests passed**, including historical purge → schema migration, populated resources and user/course payment preservation, restricted access, reverse migration and refusal to drop unexpected Store rows.
- Full backend suite before the final retained-count check was added: **506 tests, OK with eight existing skips**. The updated focused suite covers the added count-check failure path; CI runs the full integrated suite on PostgreSQL before deployment.
- `ruff check backend`, Django migration drift check, `bash -n infra/deploy-remote.sh`, and `git diff --check` passed.
- Production builds of frontend and admin passed; full frontend content/SEO/location validation and **37 frontend tests** passed. Existing lint/build warnings remain.
- Local Nginx + Django + actual built browser JS, using an isolated fixture database: retained project/guide pages returned 200 with matching canonicals; anonymous requests received no restricted body/files, no retired product/price payloads; the old commerce filter was absent. No uncaught browser errors. The project UI was visually inspected.
- Backup preflight simulation passed four cases: successful archive, failed dump, empty dump and failed archive-list validation. All failure paths stopped before publishing a final backup archive. This simulation is separate from validating the real production dump.

Changed surfaces are the retained Store/resource backend modules and tests, one migration and one read-only verification command, resource/admin frontend types and labels, the deployment script, current README/deployment documentation, this report and the URL classification CSV. Historical migrations and audit reports were preserved.
