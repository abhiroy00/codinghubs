# Engineering academy implementation

11 November 2026. This is a working implementation increment, not a claim that the entire master prompt or every planned lesson is finished or production-approved.

## What is implemented

- Fetched and fast-forwarded main through `02cc554`. The original tracked/untracked local learning work is recoverable in stash `preserve local learning implementation before upstream integration` and branch `backup/local-learning-20261111`. No stash was dropped and nothing was pushed.
- Preserved upstream course/preparation routes, 42 subject roadmaps, AI coach, jobs, gigs, checkout and account features. Restored the local FAQ route and prerendered page. Kept local learning styles separate from upstream styles to prevent class collisions.
- Added `/learn/`: responsive searchable course catalog with URL-persisted category/level filters, original descriptions, prerequisites, effort estimates, outcomes, skill tags, project briefs and source links. Eight course roadmaps cover AI engineering, Python, ML, deep learning, frontend development, databases, cloud/platform work and application security.
- Added `/learn/:course/` and `/learn/:course/:slug/`: course-scoped navigation and the restored four-part lesson/assessment workspace. New academy outline has 346 concepts, including the existing local 270-topic AI outline. Planned concepts are explicitly distinguished from published lessons. No forced 30-day duration was added to these courses; legacy 30-day preparation remains available separately.
- Restored local learning APIs and CMS: versioned drafts, optimistic editing, immutable published snapshots, reviewer actions, quizzes, assignment submissions, review history, account-scoped notes/bookmarks and evidence-based mastery. Course summaries are filtered to the selected course. These do not replace legacy progress records or convert self-reported practice into mastery.
- Added `/visual-lab/`: six original teaching definitions (RAG, attention, 3D vectors, gradient descent, agents, indexing). Reusable player provides play/pause/replay/reset, previous/next, direct step selection, speed, fullscreen, textual walkthrough and reduced-motion support. Spatial view is an actual orthographic projection of 3D vectors, with yaw/pitch and a 2D fallback; it uses SVG rather than a heavyweight GPU library.
- Attention uses numerically stable softmax, explicit Q/K/V dimensions and calculated outputs. Gradient paths are calculated from the displayed quadratic and learning rate. Cosine rankings use original coordinates and do not change when the camera rotates. Each diagram documents its simplifications and primary references.
- Added three browser JavaScript practice exercises with test cases, expected results, hints, reference solutions and account-separated browser history. Strengthened the existing JavaScript runner too: opaque-origin sandbox frame, CSP-constrained worker, blocked network, bounded output and worker timeout. This is self-practice, not authoritative grading. Browser memory cannot be hard-capped. Existing non-JavaScript Judge0 execution remains a separately disclosed external runner; no learner code is executed by Django.
- Added research/source and per-claim verification models and staff APIs. New academy publication refuses missing/unverified/stale/unsourced claims. Reviews record the reviewer, saved lesson edit version, evidence, disagreements and source access dates. Claim review locks the concept during a verified write; later edits invalidate version matching. A URL alone cannot establish verification.
- Added a research desk at `/admin-panel/learning-research`: source forms, claim reviews, private PDF upload and page inspection. Django admin additionally manages course profiles and extracted-concept-to-lesson mapping. Staff permissions are checked independently for documents, sources, claims and publication.
- Private PDF registry: rights attestation, 10 MB/signature checks, SHA-256 deduplication, non-public storage, permission-protected downloads and no-store responses. Offline extraction records parser version, metadata, TOC and source page text. Low-text pages remain OCR REQUIRED unless OCR succeeds. Equations, diagrams and code formatting explicitly remain subject to visual review. No PDF was supplied by the user and no book content was generated or republished.
- Added dedicated document worker command with per-document subprocess timeouts and an optional Docker Compose `learning` profile with CPU/memory/process restrictions. Extraction is never invoked by the upload request.
- Extended the existing interview question bank with provenance, source URL, company-style tags and role. Public reports require an HTTPS source; existing questions default to provenance-needs-review rather than being mislabeled as actual company reports. Public filters expose company/role/provenance where those fields are populated.
- Added backend-rendered catalog/course/lesson routes, learning sitemap, client metadata, prerendered visual lab, navigation links and nginx rules. Draft roadmap pages are noindex; published lesson snapshots are eligible for the learning sitemap. Source synchronization/checks now normalize Windows line endings and produce portable source hashes.

## Content and research status

The existing authored local source library contains three substantial draft lessons (~11,850 prose words and 108 assessment items). They were restored/imported into the isolated QA database, not newly reviewed or published. The remaining roadmap concepts have no fabricated lesson text. New course sources inform topic discovery; the complete curricula have not undergone job-market research and independent educational review.

Public AlgoMaster catalog/roadmap structure and the resource repository were inspected. No paid course material, proprietary source, illustrations or question banks were scraped or imported. All new UI and diagram definitions are original. The resource repository is GPL-3.0; external sources have separate reuse conditions.

Sources accessed on 11 November 2026:

- https://algomaster.io/courses
- https://algomaster.io/learn/ai-engineering/course-roadmap
- https://github.com/ashishps1/learn-ai-engineering
- https://github.com/ashishps1/learn-ai-engineering/blob/main/LICENSE
- https://docs.python.org/3/tutorial/
- https://developers.google.com/machine-learning/crash-course
- https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent
- https://docs.pytorch.org/tutorials/beginner/basics/intro.html
- https://developer.mozilla.org/en-US/docs/Learn_web_development
- https://www.postgresql.org/docs/current/tutorial.html
- https://www.postgresql.org/docs/current/indexes-intro.html
- https://docs.docker.com/get-started/
- https://owasp.org/www-project-top-ten/
- https://modelcontextprotocol.io/docs/getting-started/intro
- https://arxiv.org/abs/1706.03762
- https://arxiv.org/abs/2005.11401
- https://arxiv.org/abs/2210.03629
- https://scikit-learn.org/stable/modules/metrics.html#cosine-similarity
- https://pypdf.readthedocs.io/en/stable/user/extract-text.html

Access is evidence of research, not a claim that every proposed lesson or outgoing link is independently verified.

## Run locally

Current preview uses an isolated SQLite database at `.local-learning/academy-v3-20261111.sqlite3`. The existing `backend/db.sqlite3` and production database were not modified. Preview frontend: `http://127.0.0.1:5175/learn/`; visual lab: `http://127.0.0.1:5175/visual-lab/`. API: port 8011. Preview processes were started for this session; these are local addresses, not a deployment.

For a chosen development database, from `backend/`:

```powershell
$env:DEBUG='True'
# Set DATABASE_URL to the intended development database before migrations.
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py seed_academy
.venv/Scripts/python.exe manage.py seed_genai_lessons
.venv/Scripts/python.exe manage.py seed_genai_pilot
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8011 --noreload
```

All seed commands preserve editor changes and never publish. `seed_academy` links only known original AI module slugs to its course. Module numbers remain globally stable internally; public course navigation displays local ordering.

From `frontend/`, in another shell:

```powershell
$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8011'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Start admin with its existing development setup. Grant staff the relevant learning permissions; being staff alone does not grant document/source/review permissions. Public and custom-admin tokens are separate: viewing a saved unpublished lesson in the public workspace requires signing into that workspace as staff. Editor-side preview needs only the admin session.

Dedicated PDF processing, from `backend/` using the intended database:

```powershell
.venv/Scripts/python.exe manage.py process_learning_documents --once
# Explicit retry / optional OCR on a selected document:
.venv/Scripts/python.exe manage.py extract_learning_documents --id 1 --ocr
```

OCR requires `pdftoppm` and `tesseract` on the worker PATH; the default image does not install them. Missing tools do not silently produce a successful scan extraction. For production, apply/rehearse migrations before enabling `docker compose --profile learning up -d learning-worker`. The worker uses private-media read-only access and stores extracted text in the database. Run it in its constrained container, not inside the production web process.

## Validation

- Full merged backend suite: **422 tests passed**, including ten new academy/research/private-reference tests. Following small worker/review refinements, all **59 learning tests** were rerun successfully.
- Independent numerical checks: vector dimensions/zero vectors, stable softmax, known attention outputs and gradient paths against the closed-form solution passed (`node --experimental-strip-types scripts/test-visual-math.mjs`).
- Frontend/admin production builds passed. Admin research/editor chunks are split; main admin chunk is below 500 kB.
- Frontend validation passed: preparation/source synchronization, 400 existing GenAI questions with 40 executable examples, 42 existing subject roadmaps, SEO and 19 locality pages. Source validators are structural/execution checks, not independent educational endorsement.
- Django reports no migration drift. Local API/catalog and preview HTTP endpoints returned 200, with eight courses, 346 concepts and zero published new-academy lessons.
- Browser QA was attempted through both browser and Windows computer-use runtimes. Both failed at initialization with `failed to write kernel assets: The system cannot find the path specified`. No desktop/mobile visual, interactive runner/CSP, fullscreen or accessibility-browser verification is claimed. Automated browser checks remain required before release.
- PostgreSQL migration/rollback, Docker worker runtime, real supplied PDF/OCR accuracy and production deployment have not been exercised. Existing SSR build warnings about pre-existing static/dynamic imports remain.

## Remaining work before claiming the full master prompt complete

Research and independently review each course and every authored lesson; develop the remaining content, detailed projects and graded assessments. Map legacy lessons/day progress to concept IDs with a reviewed migration rather than guessing equivalence. Expand the initial taxonomy to all requested disciplines based on research. Add broader diagram types and concept-specific media only after technical review. Validate actual uploaded PDFs, equations/figures/OCR and rights. Add a configured production-grade Python/AI execution service if required beyond the existing public runner. Test all interactions in real desktop/mobile browsers and perform accessibility/performance/security checks, PostgreSQL migration rehearsal and staging deployment. None of these is represented as complete by the current draft/publication labels.
