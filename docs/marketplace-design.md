# CodingHubs Gigs: staged product design

## Product choice
The named reference could not be reliably identified. This is an original client-brief marketplace: clients/teams publish bounded project requests; learners/freelancers browse and submit private proposals. No listing represents a job guarantee or verified identity. Existing course learning and checkout are separate.

## Journeys and MVP
- Browse: public, staff-approved open briefs only; plain-text scope, skills and deliverable. No owner email, phone, account ID or proposal is public.
- Publish: signed-in client saves a draft, edits it, submits for review. Only staff with model change permission can approve/reject. Editing an approved brief withdraws it to draft and clears its approval. Owners can close their own brief. No instant public publishing.
- Propose: signed-in learner submits one private plain-text proposal per open brief; cannot propose on own brief. Owner can read proposals to their own brief; submitter can read their own. No public proposal directory.
- Workspace: owner sees their briefs and received proposals; freelancer sees their submitted proposals. Authentication and ownership are enforced server-side, not through hidden buttons.
- Report: signed-in users report a public brief; reports remain staff-only in Django admin. Staff can reject/close a brief. No contact data or attachments are requested.
- Messaging and work management: deferred. Pilot UI states these are unavailable; proposals are expressions of interest, not contracts or paid commitments.

## Data and routes
Gig: owner FK, UUID-based immutable slug, title, scope, deliverable, skill list, status (draft/pending/open/rejected/closed), approved_by/at, created/updated.
Proposal: gig FK, applicant FK, pitch, created; unique gig/applicant.
GigReport: gig FK, reporter FK, reason, resolved, created; unique gig/reporter.
/api/gigs/status/, /api/gigs/, /api/gigs/workspace/, /api/gigs/<slug>/, submit/, close/, proposals/, report/.
/gigs and /gigs/<slug> use Django crawler-ready HTML; /gigs/workspace uses a private React workspace. Django admin supplies moderation, with model permissions and audit logging.

## Trust, privacy, and launch gates
Default GIGS_ENABLED=False returns 404 for listing/data operations. Status endpoint exposes only enabled state. Pilot pages send noindex, follow and are excluded from every sitemap. No public profiles, account identifiers or contact endpoints. Private API responses use no-store; role is derived from request.user. Public text is escaped in React and Django; no HTML editor or file upload. Enforce content length, bounded pagination, duplicate constraints, scoped throttles and explicit staff review.
Before enabling outside a local pilot: appoint moderators, approve prohibited-content/report response rules, retention/deletion process, support contact and terms; manually inspect every approved listing for personal data, scams and quality. Existing login is not identity verification. Reports have a staff resolution checkbox, not an automated investigation service.

## Deferred decisions
Payments/escrow: unavailable; requires business model, currency/refund/tax policies and provider suitability review. Do not reuse course Razorpay checkout as escrow.
Messaging: unavailable; needs retention, blocking, abuse handling and notification provider decisions.
Contracts, proposal acceptance, milestones, disputes, identity checks, ratings, public profiles and team roles: unavailable. Choose policies before implementing; do not advertise them.

## Indexing after pilot
Keep entire pilot noindex. Later, only sufficiently useful, moderated, active listing detail pages may become indexable after an explicit product decision, server-rendered metadata and canonical sitemap integration. Search/filter pages, proposals, drafts, reports and dashboards remain noindex; private data stays authenticated. No JobPosting or review schema for generic freelance briefs. No location doorway pages or fabricated listings.
