# Course brochures and media refresh — 17 November 2026

The 43 catalogue courses now have a Coding Hubs programme hero with facts taken from their existing catalogue entry: 30-day self-guided roadmap, module count, project count and tool count. The roadmap duration is explicitly distinguished from a live batch schedule. Each course and each of the three 15-day programmes has a dedicated brochure panel.

The panel requests only PDF metadata. It does not prefetch or embed a PDF. Published brochures offer separate browser-view and attachment-download links, including the optional admin-managed cover. Loading, missing publication and temporary failure have distinct states. Missing PDFs keep unavailable controls and offer a course-specific enquiry; temporary failures can be retried. Route changes remount the panel and abort the previous metadata request. The enquiry form retains programme names that differ from the catalogue course names. No replacement brochures are generated and no publication settings are changed.

The public API currently lists brochures for Generative AI, Agentic AI, Prompt Engineering, AI Engineering Diploma, Data Science and Data Analytics. A real Generative AI PDF was downloaded from the new panel and its 1,498,178-byte size matched the public metadata. The public attachment and inline endpoints both returned HTTP 200 and the expected PDF response headers. Other courses need a PDF uploaded and published in the existing admin before their file actions become available.

## Media measurements

`scripts/optimize_public_media.py` scans images and videos, decodes candidates, backs up originals and keeps a candidate only if it is at least 10% smaller. PNG transparency and image dimensions are preserved. Decorative clips use H.264, at most 960 pixels wide and 20 fps, with fast-start metadata. Spoken demo clips retain audio and were left unchanged when recompression did not improve size.

| Asset group | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| All 222 scanned media files | 50,398,960 bytes | 32,646,898 bytes | 35.2% |
| All 26 video files | 37,254,766 bytes | 20,175,701 bytes | 45.8% |

37 files changed: 19 background videos and 18 images. All 19 video candidates decoded successfully; durations matched the originals within 0.1 seconds. Resized-reference SSIM checks were 0.976 for the courses clip, 0.973 for the blog clip and 0.985 for the homepage clip. These are sample checks, supplemented by browser playback and visual inspection, rather than a guarantee of lossless encoding.

Course detail heroes now use a static CSS background, avoiding their former video and poster requests. Existing video heroes have an accessible visible play/pause control. Mobile and reduced-motion video restrictions remain in place.

Local Chrome measurements used three cold contexts per route/viewport and a four-second observation window. Total resource body bytes on desktop changed as follows:

| Route | Before | After |
| --- | ---: | ---: |
| Home | 1,254,981 | 834,694 |
| Generative AI course | 1,634,874 | 405,409 |
| Course directory | 1,930,081 | 857,662 |

These measurements use a Vite production preview and fixed empty API fixtures, not the production nginx/API stack. They demonstrate reduced transfer in this local setup; they do not establish a production load-time or PageSpeed score improvement. Paint timings varied and are not used to claim a timing improvement.

## Verification and repeatable checks

- `npm run build`: TypeScript, client/SSR builds, 1,715 prerendered content pages and precompression passed.
- `npm test`: 13 existing unit tests passed.
- Brochure and enrollment Playwright checks: eight passed, covering publication, no PDF prefetch, missing-file enquiries, retry, the three programme selections, keyboard/focus and enrollment submission.
- Existing homepage checks: nine passed in the broader run; its remaining pathway assertion used the old Interview Prep label/URL. Updating it to the existing Interview destination passed in the focused run, alongside all four shared-header checks. Header assertions now verify the Courses dropdown grouping.
- Backend brochure suite: eight tests passed using an isolated test database.
- Static HTML check: every one of the 1,715 generated content pages had one H1 and no missing referenced local image/script assets. The app shell, CMS shell and Google verification file are intentionally excluded from the H1 check.
- Additional browser checks covered 320/768/1024-pixel course layouts, long course names, a real published PDF download and background-video play/pause.
- Lint completed successfully with existing repository warnings. Changed brochure/program components passed focused linting.

`frontend/scripts/audit-public-ui.mjs` checked all catalogue, interview-roadmap and location routes plus the major public templates: 137 routes at 390 and 1440 pixels, or 274 checks, with no failures, horizontal overflow, loaded broken images or browser runtime errors. It uses explicit empty CMS fixtures and real repository-authored learning content. `frontend/scripts/measure-course-refresh.mjs` records the local resource and paint samples. Detailed results and screenshots are written under the ignored `artifacts/course-refresh/` directory.

The local development SQLite database was backed up to `/tmp/codinghubs-before-brochure-migrations.sqlite3` before applying the existing additive `courses.0009` and `courses.0010` migrations. The local brochure-list endpoint now returns HTTP 200 with an empty list; production PDF records were not copied into it. Backend tests used an isolated database. CMS records, authenticated account flows and production field performance need their own live/staging checks. Files with fixed asset URLs retain the existing one-week cache policy, so returning visitors may continue using a cached older media file until it expires.
