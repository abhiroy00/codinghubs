# Generative AI learning platform: audit and implementation phases

Audit date: 10 November 2026. This document describes the foundation, authoring tools and first content expansion, not completion of the full master prompt.

## Evidence and limits

The working tree was clean before implementation. The repository is a React 19 / TypeScript / Vite frontend, a Django / DRF backend, and a separate React admin panel. Production uses nginx, Docker and AWS deployment scripts. Existing authentication is JWT through the shared accounts app. Database configuration supports PostgreSQL via `DATABASE_URL`, with SQLite as the local default. No production database was accessed.

Searches across frontend routes, backend apps, models and deployment configuration found no existing `/interview-prep/generative-ai/` implementation, learning-day content, concept progress model, assessment system or certificate mechanism. Existing course enrollment records represent paid enrollment; they are not evidence of concept mastery. Existing CMS models manage blogs and case studies, and the shop app manages projects/guides and assets. None was repurposed or replaced.

The live URL could not be fetched: both the web tool and command-line HTTPS attempt failed. Therefore the live syllabus, day routes, duplicated questions, production interactions, mobile behavior and any external legacy progress store remain **unaudited**. The code audit must not be presented as a complete audit of the live platform. Obtain the legacy source/content export and route list before deployment, reconcile them with these findings and create explicit redirects/imports as needed. Do not assume that this checkout contains every feature deployed on the domain.

## Additive architecture

`backend/apps/learning/` contains a separate learning app. Existing account, enrollment, payment, blog, case-study, tutor and shop tables and routes remain in place. The new migration creates only learning tables and references the existing user model.

The syllabus data contains all 18 requested modules and 270 named concepts, grouped into 59 chapters (up to five concepts each). The third phase replaces generated chapter labels and generic per-topic objectives with specific chapter names and 54 measurable module objectives, preserving all concept slugs. An initial sequential prerequisite graph remains for unauthored concepts and still needs editorial refinement. Authored lessons declare explicit prerequisites. No requested topic was removed.

Each concept has exactly four keys in its content document: `concept`, `practice`, `industry`, and `assessment`. Each part contains typed text/code/diagram blocks. Assessment content additionally contains MCQs, conceptual/technical/scenario/design/interview questions, coding tasks, an assignment and self assessment. Course content is stored in the database; React components do not contain the syllabus or lesson prose.

## Implemented behavior

- Public curriculum navigation, concept search, chapter expansion, breadcrumbs, difficulty, reading-time estimate, recommended prerequisites, four-part navigation, section links, further reading and previous/next **published** concept navigation.
- Responsive CSS and a light/dark theme switch. Visual desktop/mobile verification is still pending because the browser access host was unavailable.
- Code examples with editable text, line numbers, copy, reset and reviewed expected output. There is no code runner or syntax highlighter in this phase. The interface explicitly explains local execution.
- Account-scoped notes and bookmarks, four-part completion state and server-graded quizzes through the existing JWT client. The server never accepts a client-provided quiz score. Public quiz payloads omit correct answers and explanations; feedback is returned after a valid submission.
- Concept completion requires all four parts and a best quiz score of at least 80% for the current published version. This is a concept tracking rule, **not** a certificate eligibility policy or a claim of assignment mastery.
- A new published version invalidates the current completion/quiz state on the next interaction while preserving notes and bookmarks. Old progress is identified by version. An untouched old-version record does not count as completed. Full historical quiz attempts are not stored yet.
- Django admin authoring with separate fields for each of the four parts, statuses, prerequisites, references and outcomes. Published URLs are locked against casual edits. The second phase adds a guided editor to the existing React admin panel, with draft history and concurrency protection shared with Django admin.
- Staff preview at `?preview=1`; sign into the frontend with a staff account that has learning view/change permission to obtain the JWT required by the draft API. A Django admin session alone is not a frontend JWT. Preview responses use noindex/no-store and cannot save learning progress or grade draft quizzes. The React admin editor also offers an inline preview using its own admin session, without requiring a separate student login.
- Publication requires approved status, an active staff reviewer, verified-code attestation, minimum prose depth, assessment structure, references, outcomes and description. It rejects normalized exact question duplicates within a concept or against another published concept. Changes to lesson content or educational metadata clear reviewer and code-verification attestations through the shared editing service. Publication saves a separate snapshot and immutable publication revision; subsequent draft edits do not change served content. Saved draft states are now archived on edits, approval, publication and restore.
- Crawler-readable Django HTML for the course index and published concepts, unique titles/descriptions/canonicals, structured data, and a learning sitemap linked from robots.txt. Draft concept detail URLs return 404 and never appear in the sitemap. nginx proxies these routes to Django using the existing frontend shell mechanism. The exact root URL retains its trailing slash.

## Pilot content

`pilot-cosine.md` and `pilot-assessment.json` provide the first complete four-part authoring example. Its prose covers geometry, derivation, normalization, stable arithmetic, metric comparisons, representation compatibility, evaluation and a clearly identified hypothetical industry case. It includes 5 MCQs, 5 beginner questions, 5 technical questions, 3 scenarios, 5 advanced questions, 3 design questions, 5 interview responses with follow-ups/trade-offs, 5 graded-difficulty practical tasks and a measurable mini assignment.

The Python example uses only the standard library. Automated tests execute it, compare the complete printed output, and check invalid/large/small inputs. Primary references are included in the lesson. Structural checks and code execution do not replace independent technical/editorial review: the seed command leaves this lesson **In Review**, with no published version. The third phase adds two more authored lessons, also In Review. The other 267 concepts remain **Not Started**, each with the four-part schema; they are not presented as finished lessons.

## Local setup and review

From `backend/`, with the existing virtual environment and dependencies installed:

```powershell
$env:DEBUG='True'
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py seed_genai_pilot
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8000
```

The explicit `DEBUG` value may be necessary because the execution environment supplies an unrelated `DEBUG=release` variable. No application settings workaround was added for that host issue. The local virtual environment lacked the existing requirements `nh3` and Pillow; these were installed without changing requirements.

From `frontend/`, run `npm run dev`. Open `/interview-prep/generative-ai/` on the printed local Vite port. From `admin-panel/`, install the locked dependencies with `npm ci` and run `npm run dev`. Open `/admin-panel/learning` on that server's printed local port. Run `createsuperuser` if a local staff account is needed. The guided editor provides four-part fields, inline preview, draft export, saved revision inspection and restore, structural feedback, and separate approve/publish controls. Django admin at `/admin/learning/concept/` remains supported. Do not publish solely because an automated check passes.

For non-superuser staff, assign `learning.view_concept` for reading, `learning.change_concept` for authoring, and additionally `learning.publish_concept` for approval/publication. The new permission is created by Django's post-migration permission setup. Staff status alone does not grant draft access. Superusers retain their existing full access. Apply migration `0002_alter_concept_options_concept_edit_version_and_more` before using these endpoints.

Both seeds add missing entries and leave existing content and user progress unchanged on subsequent runs. They are explicit commands, not automatic application-startup or production migrations. Review the migration plan against a production backup before deployment. For local QA during implementation, migrations and the seed were exercised against a separate ignored `.local-learning/qa.sqlite3`; the existing `backend/db.sqlite3` was not migrated or seeded.

## Verification and outstanding acceptance criteria

Run `python manage.py test apps.learning` from `backend/`, `python manage.py makemigrations --check --dry-run`, and `npm run build` from `frontend/`. The suite covers seed idempotence, the full concept route inventory, four-part payloads, publication gates, saved publication history, draft privacy, HTML escaping/SEO, account isolation, server quiz grading, validation, revision handling and executable pilot code. The complete existing backend suite should also pass before release.

Observed results for this phase: 13 learning tests passed; the full 180-test backend suite passed when run outside the filesystem sandbox; Django system checks and migration-drift checks passed; the final frontend production build passed. Frontend lint exited successfully with warnings, including existing code and React state-in-effect warnings. The initial sandboxed regression run failed because existing upload/download tests could not access their temporary directories; the successful unrestricted run resolved that verification limit. The browser access host was unavailable, so no successful visual or browser-interaction test is claimed.

## Second phase: guided authoring and safe draft editing

The React admin sidebar now includes **Generative AI curriculum**. It supports concept search, module/status filters and pagination, metadata/outcome/reference/prerequisite fields, four-part tabs, ordered text/code/diagram sections, MCQs, question banks, assignment fields and self assessment. Its preview displays the current unsaved text with escaped React content; it does not execute code. The editor can export its current draft to JSON and warns before link navigation or page unload with unsaved changes. This is not browser autosave or a guarantee of recovery after a browser crash.

Each saved concept has a separate monotonic `edit_version`, independent of its published lesson version. Mutations carry the expected draft revision. A stale edit/approval/publication/restore returns HTTP 409 instead of overwriting newer work. On conflict, the editor retains its local text for export and manual merge. PostgreSQL row locks and a conditional revision update protect the transaction. A restored state always becomes an unreviewed draft at a new revision; it never rolls back the monotonic counter or replaces a published snapshot. The displaced saved state remains in history. Earlier drafts predating this migration cannot be reconstructed retroactively.

Draft changes are archived in `DraftRevision`, separate from immutable publication `Revision` records. History is paginated and revision IDs are scoped to their concept. The same service is used by the React CMS and Django admin edits; Django forms carry the expected revision too. Prerequisite validation rejects missing IDs, duplicates, self-dependencies and cycles in the current graph. Structural validation additionally checks renderable question/assignment/block types and reference URLs.

The API separates read, change and publish permissions. Ordinary draft saving cannot set reviewer identities, code verification, published snapshots or approved status. Approval records the authenticated reviewer's attestation that code was executed; it does not itself execute code. Publication remains a separate action after approval. These checks do not substitute for independent technical review, human grading or a secure code runner.

Second-phase verification: 26 learning tests passed, including API authorization, forged review fields, stale edits, restore isolation, live-snapshot preservation, prerequisite validation, transactional rollback and an actual Django admin form save/stale resubmission. A broader 43-test run covering accounts, courses, enrollments, leads, the existing admin backend and learning also passed. The admin panel production build, Django system checks and migration-drift checks passed. Migration 0002 was applied successfully to the isolated local QA database. The first-phase 180-test full-suite result remains historical; a complete unrestricted regression rerun for this phase is not claimed.

Browser verification remains pending. Browser inventory again reported that its access host was unavailable. An attempt to start the new admin preview server was not executed because automatic approval review failed due to the review service's usage limit. This was not a determination that the action was unsafe. No alternate mechanism was used to bypass that approval failure, and no successful visual or browser-interaction test is claimed.

## Third phase: foundational content and source validation

The repository-owned lesson library in `backend/apps/learning/content/` adds two concepts at the beginning of the course. Each has four ordered learning parts, runnable standard-library Python, a clearly hypothetical industry implementation, 36 concept-specific questions/tasks, model answers, an assignment rubric, self assessment and primary references. Authored content remains subject to independent review.

| Concept | Concept prose | Practice prose | Industry prose | Assessment prose | Total prose |
| --- | ---: | ---: | ---: | ---: | ---: |
| Introduction to Artificial Intelligence | 2,061 | 776 | 735 | 349 | 3,921 |
| AI vs ML vs Deep Learning vs Generative AI | 2,180 | 730 | 722 | 344 | 3,976 |
| Cosine Similarity (earlier pilot) | 2,134 | 731 | 737 | 351 | 3,953 |

Counts exclude code, diagrams, headings, assessment items and assignment text. They are structural depth checks, not measures of educational quality. The source library currently contains 11,850 prose words across the three authored lessons, plus their assessments. Normalized exact question checks find 108 distinct items; semantic similarity review remains a human task.

The introduction implements a bounded breadth-first workflow planner and distinguishes valid plans, real-world task outcomes and execution authority. Tests compare the planner against an independent all-pairs distance calculation over every three-node directed graph without self-edges, as well as cycles, invalid structure, deterministic ties and resource limits. The family-comparison lesson implements a fitted numerical line and a learned bigram model, explicitly stating that neither example is a deep neural network. Tests verify complete printed outputs, independently derived coefficients/counts, validation, termination bounds and separation of fitting from inference.

Lesson prose, assessments, metadata and code have separate source files. A `!python filename.py` inclusion reads the trusted repository example into a lesson's practice part so the displayed code and tested example share one source. The loader restricts asset paths, enforces the four-part order and checks declared examples. It does not execute code. Only tests execute the trusted repository examples; no code from the course database or a learner request is executed.

From `backend/`:

```powershell
$env:DEBUG='True'
.venv/Scripts/python.exe manage.py validate_genai_content --json
.venv/Scripts/python.exe manage.py test apps.learning --noinput
.venv/Scripts/python.exe manage.py seed_genai --refresh-structure
.venv/Scripts/python.exe manage.py seed_genai_lessons
```

`seed_genai_lessons` validates the selected source batch before writes and imports only untouched Not Started concepts as In Review. It skips existing prose, questions, metadata, edited revisions, review state and publications. It never publishes or updates learner records. Repeated `--slug` options select a subset. A source change after import must go through the normal editor/revision process; rerunning the seed will not overwrite an editor's copy. The opt-in structure refresh replaces only recognized generated labels/objectives and preserves custom structure edits and all lesson content.

Third-phase verification: 52 tests passed across learning, accounts, courses, enrollments, leads and the existing admin backend, including nine new curated-content tests. Source validation passed for all three lessons. Django reported no migration drift; no new schema migration was needed. The refined structure and two new lessons were imported into the isolated local QA database, where the inventory is 18 modules, 59 chapters, 270 concepts, three In Review and zero published. The existing application database and production were not changed. Frontend code/layout was unchanged in this phase, so no new frontend build or browser verification is claimed. See `content/README.md` for source-authoring details.

Still required in subsequent verified phases:

1. Complete the live-platform audit and migrate any legacy learning days/progress with explicit route mapping. Verify PostgreSQL migration and rollback against a restored backup.
2. Independently review the pilot and verify desktop/mobile rendering, keyboard navigation, code-copy/reset and persistence through a real browser. The attempted browser inspection failed because the browser access host was unavailable; responsive CSS is not evidence of successful visual QA.
3. Refine the remaining prerequisite graph and author/review the remaining 267 concepts one at a time. Add semantic question-duplication review, mathematical rendering and rich diagrams. The curated source validation command now checks prose depth, schema, ordered parts, declared source assets and exact cross-lesson question uniqueness.
4. Extend authoring with module/chapter/concept creation, rich media upload and mathematical/interactive diagram rendering. The custom admin lesson editor, draft history, restore and stale-edit protection are implemented; concurrent PostgreSQL and real-browser staging verification remain pending.
5. Implement a secured code sandbox with resource/network limits and real challenge test cases, then add editor syntax highlighting and execution/error states. Do not enable unrestricted process execution from learner requests.
6. Implement a course-grounded AI tutor with provider configuration, contextual retrieval, limits, evaluation and appropriate error behavior. No simulated tutor or invented answers were added.
7. Add attempt history, practice submission/reviewer workflows, module/final assessments, capstone grading, learning time, revision scheduling, badges and verifiable certificates. Define certificate rules only once practical assessment and identity requirements exist.
8. Verify production nginx/shell behavior, SEO crawler output, deployability, accessibility and legacy regressions in staging before release. No commit, push, deployment or live publication was performed.
