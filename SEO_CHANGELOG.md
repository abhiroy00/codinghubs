# SEO changelog — local work, 28 November 2026

Baseline: `4a74106`. Branch: `work/seo-growth-20261128`. No production push in this task.

- Added `scripts/seo_inventory.py`, robots-aware live/built inventory, complete content URL CSV and audit/sitemap contract tests.
- Corrected Search Console's inclusive reporting range; added bounded pagination, explicit truncation and Pacific daily comparisons. Added private, read-only `seo_gsc_report` exports and tests.
- Added safe custom course/interview, enquiry/demo, form, contact and brochure/resource events. Existing `generate_lead` remains intact; duplicate listeners/effects are suppressed and analytics failures cannot break accepted forms.
- Added allowlisted event parameters, query-free event page locations and private-route exclusions. This does not configure all GA4 property-level automatic collection.
- Improved 11 existing source articles with original answers/exercises, accurate metadata and contextual links. Added a guarded, dry-run-first updater with revision snapshots and no editor overwrite.
- Added original `rag-retrieval-demo.py`; added 15 Related guides links for five existing courses. Dated only the two sitemap pages whose rendered preferred content changed.
- Added analytics and sitemap/inventory checks to existing CI. Repaired stale newsletter test placement while preserving consent styling and no-JS policy-link coverage; added enquiry event/privacy assertions.
- Preserved design, authentication, payments, public URLs, robots/sitemap architecture and private content controls. No content was deleted, merged or mass-published by this task.

Pending: authorized deployment, guarded review/apply of existing production CMS records, GSC/GA4/field datasets, verified business facts and future content/outreach execution.

## Evidence and limits

Audit date: 28 November 2026. Changes are local on `work/seo-growth-20261128`; production push is not authorized by this brief. Fresh evidence is under `artifacts/seo-growth/`; blank metrics mean unavailable, not zero. See [SEO_MASTER_STATUS.md](SEO_MASTER_STATUS.md) and [SEO_TEST_REPORT.md](SEO_TEST_REPORT.md).
