# Coding Hub engineering ecosystem: phase 1 audit and architecture

Date: 11 November 2026. Scope: repository inspection, fetched upstream comparison, public reference research, baseline verification and implementation design. This phase does not publish content or deploy changes.

## 1. Baseline and critical integration finding

Local HEAD: `06b96caa104f88c9075f8192ad458cea2484e249`. Fetched `origin/main`: `02cc554bc247000f307dd76caefea175c00c3e9f`, 87 commits ahead. Pull was aborted because tracked local modifications and an untracked learning stylesheet overlap incoming changes. Local files were preserved.

There are two materially different platform implementations. The working tree has an untracked Django learning app, migrations, React lesson workspace and admin editors. Upstream already has a course directory, interview preparation, roadmap progress, learning progress, quizzes, certificates, editable preparation curricula, AI coach, jobs and gigs. These are existing features to preserve, not features to rebuild blindly. `GENAI-IMPLEMENTATION.md` describes an earlier local baseline; its statement that learning/progress features were absent must not be applied to fetched upstream.

Before phase 3, integrate in an isolated branch with a recoverable copy of all tracked AND untracked local work. Resolve routes and models explicitly. In particular, `/interview-prep/generative-ai` is shared by both implementations, and local `/courses/:slug` is checkout while upstream uses it for course details and `/enroll/:slug` for checkout. Do not overlay the local App.tsx onto upstream. Do not equate legacy day completion with assessed concept mastery. Do not run seed/import commands against production during reconciliation.

## 2. Existing architecture

| Layer | Observed implementation | Extension decision |
|---|---|---|
| Public UI | React 19, TypeScript 6, Vite 8, React Router 7, Axios, Lenis | Preserve stack and route splitting |
| Admin | Separate React/Vite app, TinyMCE, staff API | Extend current CMS |
| API | Django/DRF, SimpleJWT; requirements specify Django 6.1 range | Preserve accounts and permissions |
| Data | SQLite local default; PostgreSQL 16 production compose | Validate final migrations on PostgreSQL too |
| Commerce | Courses, enrollments, Razorpay, shop/orders/downloads/inventory | Reuse; keep financial state separate from mastery |
| Publishing | Blog/case-study SSR, React shell, location prerender and sitemap | Extend existing delivery pipeline |
| Runtime | nginx, Docker, Gunicorn, media/private-media volumes, AWS deployment described in README | Stage changes before release |
| Local learning | Module → Chapter → Concept, content JSON, immutable published snapshots, draft/publication history, progress, quiz attempts, graded assignments | Reconcile with upstream before adding parallel data stores |
| Upstream learning | Course/category, PrepCurriculum/PrepLesson, LearningProgress/RoadmapProgress, quiz attempts, questions and certificates | Retain IDs/history and define an explicit migration adapter |

Repository entry points inspected: frontend and admin route files, dependency manifests, backend settings/URL configuration, course and learning models, learning publication validation/authoring, learning renderer and tests, production compose, README and prior implementation report. Upstream models and routes were inspected via `git show`, without checking out or changing upstream files. This is a structural audit, not a line-by-line security review of every file. Production behavior and database contents remain unaudited.

## 3. Existing page inventory

| Area | Working-tree routes |
|---|---|
| Marketing | `/`, `/program/:slug`, `/book-a-tutor`, `/faq`, `/policies` |
| Editorial | `/blog`, `/blog/:slug`, `/case-studies`, `/case-studies/:slug` |
| Locations | `/locations`, `/locations/:slug` (18 registered locality pages) |
| Commerce | `/courses/:slug`, `/store`, `/store/:slug`, `/projects`, `/projects/:slug`, `/project-guides`, `/project-guides/:slug`, `/cart`, `/checkout`, `/payment/success`, `/payment/failure` |
| Account | `/login`, `/register`, `/dashboard`, `/my-account`, `/my-account/orders`, `/my-account/downloads` |
| Local learning | `/interview-prep/generative-ai`, `/interview-prep/generative-ai/:slug` |
| Administration | Separate `/admin-panel/` React app and Django `/admin/` |

Upstream additionally declares `/courses`, `/interview-prep`, `/interview-prep/:slug`, level/article/day learning routes, `/ai` and answer-evaluation/mock-interview/resume-analyzer/job-matcher pages, `/latest-jobs` and detail pages, `/gigs` and workspace/detail pages, tutor-detail booking, certificate redirects and `/enroll/:slug`. Upstream no longer declares `/faq` in App.tsx. A redirect decision is needed before losing that existing local URL.

`python scripts/audit-platform.py` regenerates exact static public/admin routes and model class inventories for both snapshots. It performs no network request, reads no `.env`, imports no application code, and makes no database writes. Dynamically composed routes and production rewrites require separate review.

## 4. Reference analysis

Accessed 11 November 2026:

- [AlgoMaster courses](https://algomaster.io/courses): public catalog groups subjects into clear sections with short outcome descriptions. Adopt category discovery and concise outcomes in an original Coding Hub layout.
- [AI Engineering roadmap](https://algomaster.io/learn/ai-engineering/course-roadmap): public text exposes chapter search, module counts, ordered lessons and progress. Adopt searchable prerequisite navigation; do not infer actual persistence, accessibility or paid lesson behavior from rendered text.
- [AI engineering resource README](https://github.com/ashishps1/learn-ai-engineering/blob/main/README.md): inspected topic groups and outbound resources, spanning foundations through agents and deployment. Use links for discovery; no curriculum prose or curated lists were imported.
- [Repository license](https://github.com/ashishps1/learn-ai-engineering/blob/main/LICENSE): inspected GPL-3.0 notice and license text. Record upstream provenance and separately inspect each selected resource's reuse terms. This report does not assert that linked resources share that license or are all free/current.

Public textual inspection establishes information architecture only. No copied illustrations, branding, paid lessons or source code. No new course has undergone market research yet; job-market demand and interview prevalence are unverified. Before authoring each course, retain dated role descriptions and primary technical documentation as evidence rather than guessing demand.

## 5. Proposed information architecture

Preserve upstream `/courses` as catalog and `/courses/:slug` as overview/roadmap. Add category/difficulty/tag filters as URL query parameters. Keep `/enroll/:slug` transactional. Keep existing interview-preparation routes and map old day/level IDs before introducing canonical lesson URLs such as `/learn/:course/:lesson`. Never redirect a legacy day to an arbitrary concept.

Course overview: introduction, measurable objectives, prerequisites, level, effort range, self-paced roadmap, projects and assessments. Lesson workspace: breadcrumbs, chapter navigation, objectives, concept content, diagram, walkthrough, code, applications, interviews and practice. Dashboard: actual enrollments, last position, revision queue, bookmarks and evidence-based completion. CMS: research inbox → authoring → verification → review → publication → supersession. Reserve the requested 22 subject families as taxonomy planning; do not display empty categories as complete courses.

The AI Engineering pathway will cover the requested A–K groups: mathematics, Python, ML, deep learning, NLP/transformers, GenAI/LLMs, RAG, fine-tuning/optimization, agents, production engineering and advanced applications. This is a requirement mapping, not a verified publishable curriculum. Sequence and effort estimates need course-specific evidence and editorial review.

## 6. Proposed database model

Use existing Course and accounts as identity anchors. Add a learning-course relation to Module after reconciling current globally unique module numbers/slugs. Enforce course-scoped ordering and stable public identifiers. Preserve existing learning and legacy progress tables until imports reconcile successfully.

| Entity | Important fields/relations |
|---|---|
| Course learning profile | Course FK, outcomes, prerequisites, level, effort range, skill tags, self-paced flag |
| Module / Chapter / Lesson | Parent FK, stable slug, position, outcomes, prerequisite edges, revision |
| LessonRevision | Schema version, immutable payload, author, review state, publication timestamp |
| ResearchSource | Title, URL, source type/tier, publication/access dates, locator, license/reuse notes |
| ClaimVerification | Lesson revision, concept/claim, sources, relevant sections, status, disagreements, reviewer/date, tested version |
| DiagramDefinition | Revision, renderer kind, typed definition, steps, formula, sources, alt text, fallback |
| Document / ExtractionJob | Hash, private storage key, metadata, rights, tool/version, status/errors |
| DocumentConcept | Document FK, chapter, page/region, extracted text/math/figure reference, extraction confidence/status, verification state, lesson mapping |
| Question / Assessment | Topic, difficulty, provenance, sources, answer/rubric, revision; company-style tags explicitly labeled |
| Attempt / Submission | User, immutable assessment revision, responses, scores, runtime/grading evidence |
| Progress / Bookmark | User and stable lesson ID, last position, completed revision, interaction state, updated timestamp |
| ContentReview | Revision, technical/educational/visual/source decisions, reviewer and evidence |

Indexes: course/slug, parent/position, user/lesson, source URL/hash, document hash, job status, revision/publication. Foreign keys protect published evidence. Prerequisite edits must reject cycles. Use atomic publication, immutable snapshots and optimistic edit versions already present locally. Server-side authorization must scope every private student object. Validate PostgreSQL constraints and rollback on a restored staging backup.

## 7. Proposed course content contract

Versioned JSON stored independently of UI, with stable section/block IDs. Course metadata contains objectives, prerequisites, level, effort and roadmap IDs. Lesson revisions have the ten requested ordered sections: introduction, intuition, technical deep dive, visual explanation, practical examples, real-world implementation, interview preparation, hands-on tasks, assessment and revision.

Blocks are a discriminated union: paragraph, list, formula, code, diagram-reference, callout, exercise and source-reference. Code blocks carry language, exact example asset/version, expected output and verification evidence. Questions carry provenance (`public_report`, `company_style`, `research_based`, `original`), optional company tags, sources and grading rubric. Student-facing payloads exclude correct answers until the assessment policy permits feedback.

Current local content requires exactly four parts (`concept`, `practice`, `industry`, `assessment`) and permits text/code/diagram bodies. Add a versioned adapter: introduction/intuition/deep dive/visual/revision → concept; examples/tasks → practice; implementation/interviews → industry; quizzes → assessment. Preserve existing content, then migrate explicitly rather than replacing the validator with an incompatible shape. Word-count and exact-question checks are structural checks, not proof of accuracy or independent verification.

## 8. Diagram and animation architecture

Current local diagrams render as preformatted text; no interactive/3D renderer exists in that workspace. Begin with dependency-free SVG renderers behind one DiagramPlayer interface. Definitions declare nodes, edges, ordered operations, labels, learning objective, source links, accessible description and optional mathematical state. Each step is deterministic and selectable without motion.

Player state: active step, play/pause, replay/reset, previous/next and 0.5/1/1.5/2 speed. No complex autoplay. Reduced-motion removes interpolation and moving particles without hiding explanations. Keyboard controls and a textual step list remain available. Formulas/labels update with the active operation. Validate graph references, edge direction and dimensions independently of playback.

Only introduce lazy-loaded Three.js/React Three Fiber when a reviewed concept benefits from spatial display, beginning with an embedding-space demonstration. Load on explicit activation, dispose GPU assets on unmount, cap device pixel ratio and pause offscreen. Always provide SVG/static and textual fallbacks. Do not load a bundle of unrelated visualization libraries. Visual publication requires a separate architecture/formula/sequence review; attractive rendering is insufficient.

## 9. PDF ingestion architecture

No PDF materials accompanied this request. No extraction or PDF-dependent lesson generation has occurred.

Staff upload → size/type/signature validation → private immutable object storage with checksum → queued extraction worker → page-level text/layout/metadata/TOC extraction → detect low-text pages → OCR → extract figures/code/math with page bounding boxes → human extraction review → concept candidates → course/lesson mapping → external technical verification → original authoring.

Use a dedicated worker with CPU/memory/time limits, no execution of embedded scripts, restricted filesystem/network and idempotent jobs keyed by document hash plus extractor version. Page-level failures remain visible and retryable. Preserve original page numbers, image crops and OCR uncertainty; never report incomplete extraction as complete. Equations need visual comparison where text extraction loses notation. Record author/title/chapter/page for every candidate. Rights/access and technical accuracy are separate reviews. Do not expose private uploaded books publicly or republish whole chapters. OCR engines and parser dependencies will be selected after representative PDFs are supplied and evaluated.

## 10. Research verification workflow

For each course: dated market evidence → discovery → authoritative technical cross-check → prerequisite design → original writing → visual design → review. Each chapter's source records include concept, title, URL, type, publication date if known, access date, relevant section, verification status and disagreement notes. Use exactly VERIFIED, PARTIALLY VERIFIED, NEEDS REVIEW and OUTDATED as evidence states, independently from editorial draft/in-review/approved/published states.

Every formula, algorithm, important claim, code output and diagram needs identifiable evidence. Record framework versions and execution results for code. Official documentation/original papers outrank community interpretation; investigate conflicts rather than silently dropping them. A source URL alone cannot set VERIFIED. Content changes invalidate affected reviews. Publication must refuse unresolved required claims, missing visual/code review, stale source checks or absent attribution. Periodic revalidation marks outdated revisions and opens replacement drafts while preserving learner history.

Local publication currently requires approved state, staff reviewer, code confirmation, references, outcomes, SEO metadata and structural depth checks. It does not enforce a normalized per-claim evidence registry, access dates, independent source checks or diagram review. These are genuine gaps, not completed features.

## 11. Incremental implementation and exit criteria

| Phase | Deliverable and required exit evidence |
|---|---|
| 1 | This architecture/route/model audit, read-only inventory tool, baseline builds/tests; retain local and remote differences explicitly |
| 2 | Reconcile upstream/local in isolated branch; approve route/progress mapping; dated research ledger and ADRs; no lost page/history |
| 3 | Extend existing data-driven catalog/roadmap with course-scoped modules, filters and prerequisites; API/constraint checks and browser navigation |
| 4 | Versioned ten-section content adapter and responsive lesson workspace; safe rendering, keyboard/mobile and old-content checks |
| 5 | Source/claim registry, independent review states and publication gates; negative tests proving unreviewed content cannot publish |
| 6 | Private PDF queue and page-provenance registry; real supplied PDFs, OCR/error cases and access tests |
| 7 | Reusable SVG player and definition validation; reviewed educational pilot with keyboard/no-motion checks |
| 8 | Lazy spatial renderer and all playback controls; GPU failure/mobile/reduced-motion fallbacks and performance measurement |
| 9 | Extend existing quizzes/assignments; isolated code runner with hard resource/network limits; abuse, timeout and grading tests |
| 10 | Extend existing question bank with evidence/provenance and role/company filters; no unsupported interview claims |
| 11 | Reconcile progress/history, resume/bookmarks/revision and real streaks; account isolation and migration reconciliation |
| 12 | Extend current CMS for all entities, reviews and versions; staff permissions/concurrent editing tests |
| 13 | Canonical URLs, sitemap, eligible structured data, caching, accessibility/security review; regression and performance budgets |
| 14 | Staging migration rehearsal, PostgreSQL and end-to-end checks, deployment/rollback plan, then production release |

Do not advance implementation merely because a phase has code. It must pass its exit checks. Content expansion proceeds only after research and human review. Secure runner/provider configuration and representative PDF samples are dependencies, not simulated completed features.

## 12. Phase 1 verification results

- Public frontend production build passed, including SSR/prerender (27 pages, 25 sitemap URLs).
- Admin production build passed.
- SEO and all 18 locality validators passed.
- Backend full current-working-tree suite: 216 tests passed using process-local `DEBUG=True` and in-memory SQLite. Initial invocation was blocked by inherited `DEBUG=release`; no saved configuration was changed. Test output includes expected mocked payment failures and a development JWT-key-length warning.
- These results apply to local HEAD plus existing uncommitted work, not the 87 unmerged commits. They establish no production, PostgreSQL, visual, accessibility, PDF, sandbox or curriculum-verification claim.

Phase 1 implementation adds the reproducible read-only inventory command and this report. No existing application page, database, lesson, progress record, deployment or publication was changed. Next executable milestone is upstream/local reconciliation followed by the phase 2 design/research ledger; importing unreviewed bulk curricula is excluded.
