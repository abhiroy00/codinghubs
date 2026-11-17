# CodingHubs Interview, account, newsletter and brochures

## Contract and preservation
- Extend React/Vite + Django REST + existing protected React admin; keep the current JWT/browser-session authentication.
- Existing uncommitted performance work is user-owned. Baseline diffs and content hashes are preserved in `/tmp/codinghubs-existing-*` and `/tmp/codinghubs-content-before.json`.
- Keep learning content, progress identifiers, purchases, enrollments, certificates and private account controls. No push, deployment, production migration or live email is authorized.
- External reference pages failed through the web tool; attempt ordinary network/browser inspection and record only observed results.

## Dependency order
1. Inventory current content/routes/storage/email/profile; capture production build and browser baseline.
2. Preserve all nested Interview routes while changing public canonical URLs; implement a searchable hub and original focused guides.
3. Add authenticated, owner-scoped article bookmarks/completion; integrate existing profile/dashboard without a second identity system.
4. Build newsletter persistence, double opt-in, public issues, private admin, durable explicitly queued campaigns and tests.
5. Build stable-course brochure records, validated private durable storage, admin management, public attachment downloads and tests.
6. Integrate navigation, homepage signup, responsive/a11y states and static/server rendering.
7. Run existing checks, negative security tests, browser flows and matching performance measurements; document setup and limitations.

## Decisions
- PostgreSQL-backed outbox and bounded Django management worker reuse deployment infrastructure. Never send mail from a request or a fire-and-forget thread. Mark ambiguous SMTP outcomes for manual reconciliation, never automatic duplicate sending.
- Use the existing persistent private media volume; brochures download as attachments with nosniff and CSP sandbox. No inline untrusted PDFs on the app origin.
- Preserve existing course progress keys. New article state is authenticated only; guests read publicly and sign in to save, so there is no new guest merge ambiguity.
- Existing SMTP settings remain the provider adapter; newsletter delivery additionally requires an explicit enable flag. Tests use local-memory mail and isolated storage.

## Verification
Fresh frontend/admin builds, lint, full validation, Django migrations/checks and affected tests. Browser widths 360/390/768/1440; legacy routes, filters, menus, newsletter states, downloads and account authorization. Keep lab performance separate from unavailable field data.
