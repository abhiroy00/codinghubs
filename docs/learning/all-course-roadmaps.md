# Course roadmap rollout

Local implementation, 2026-11-11. No deployment or indexing is claimed.

All 43 options in Choose a course now open pages with four connected, colored roadmap cards. The original course content, daily workspace, quiz and certificate flow remain below the roadmap. GenAI retains its existing detailed implementation; the other 42 options use a reusable subject-roadmap renderer.

## Working features

- Four level pages and a 30-day plan per course, with individual article and daily routes.
- Counts calculated from substantive lessons only. Known placeholder lesson bodies are excluded using the backend's existing placeholder policy.
- Readable original lessons, examples, implementations, interview answers and follow-ups wherever these exist in the checked-in curriculum.
- Search, topic, difficulty and available-category filtering, with ten questions per page.
- Existing runnable coding/practical task components, including solution disclosure, test execution and account-scoped browser drafts. External code execution is only initiated by the learner; no code was sent to the public runner during this rollout.
- Daily assignments, revision checks, course project briefs and truthful interview practice guidance.
- Browser persistence for guests and authenticated synchronization by user and course. Completion is additive and does not award the existing course certificate or complete legacy quiz days.
- Loading, retry and unavailable-page states, visible breadcrumbs, keyboard-accessible links, responsive shared card CSS and reduced-motion handling.
- Advanced Digital Marketing uses its marketing track instead of the previous design track.

## Content limits

Feature rollout does not mean every course has a complete content library. Of the 42 additional options, 24 have an existing curriculum mapping and 18 do not. Across these course options there are 84 substantive lesson/article instances and 423 original question instances. Aliases share existing curricula; these totals are not claims of globally unique content or 400 questions per course.

Unavailable detailed days have clearly labeled self-guided study briefs with objectives, tasks and revision steps. They have no claimed checked theory, reference solution, company provenance or answered-question count. No company tags are invented. GenAI remains the course with the 400-question researched bank. Authoring equivalent complete material for the remaining courses is outstanding content work.

## Progress migration

Migration courses.0007_roadmapprogress_course changes the existing roadmap record from one per user to one per user and course. Existing records receive course_slug=generative-ai and retain their data. A unique constraint enforces isolation. The API validates identifiers against generated course manifests and rejects cross-course IDs and unknown slugs.

Applied to the isolated local preview database at C:/Users/DELL/AppData/Local/Temp/codinghubs-roadmap-preview.sqlite3. The unrelated Django service on port 8000 was left running. This project's frontend uses port 5173 and proxies to its preview backend on port 8001 through VITE_API_PROXY_TARGET.

## SEO, AEO/GEO and sitemap

Each new route uses shared browser/server metadata and visible breadcrumbs. Detailed source-backed pages have matching LearningResource markup and prerendered answers. Course overviews link directly to available learning levels. Shared-curriculum aliases use primary canonical URLs; empty levels and study briefs are noindex and excluded from the sitemap.

The build currently writes 1,702 HTML pages, including 1,512 additional subject-roadmap routes, with 318 indexable canonical URLs in sitemap.xml. The master submission URL remains https://codinghubs.in/sitemap-index.xml after deployment. This is discovery support, not an indexing or AI-citation guarantee.

Per-course content is lazy-loaded. The course-roadmap manifest is kept outside the initial application bundle. No new dependencies were installed; the generator reuses the existing TypeScript build dependency to read the catalog.

## Verification

- npm run build and npm run validate passed, including all 43 course-card sets, 1,512 additional routes, truthful counts, scoped IDs, sitemap gates and existing GenAI/location checks.
- All 363 backend tests passed, including 25 courses tests, and Django reported no missing migrations.
- Preview HTTP checks returned 200 for representative level/day routes and 401 for unauthenticated private progress, as expected.
- Validation checks HTML structure and CSS presence; it does not substitute for browser/mobile visual QA or production nginx redirect checks.

To add or extend source lessons, edit backend/apps/courses/prep_content, run the existing prep sync, and build. The prebuild step automatically regenerates both GenAI and subject roadmaps. Run npm run validate before deployment.
