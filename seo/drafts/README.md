# Lesson drafts — not published

Files here are **DRAFT – needs review**. The build never reads this folder, so nothing here is rendered, indexed or
listed in a sitemap. Each file must keep `"_status": "DRAFT – needs review"` until a reviewer approves it; the lesson
exporter (`frontend/scripts/sync-course-roadmaps.mjs`) refuses any lesson that still carries `_status`.

Approve: review against [the template](../templates/lesson-template.md), remove `_status`, move the file to
`backend/apps/courses/prep_content/<curriculum>/`, then validate and build.

No drafts have been generated. Write lessons from the priority list in [content-audit-summary.md](../content-audit-summary.md).
