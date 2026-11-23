# Complete-lesson template

A lesson is **COMPLETE**, and is indexed, when the build's rule in `frontend/src/seo/robots.ts` passes:

| Requirement | Threshold | Where it is checked |
|---|---|---|
| Unique teaching words (definition, theory, example, use cases, demonstration, takeaways, interview answers, practice) | **≥ 600** | `scripts/sync-course-roadmaps.mjs` at build |
| Subject-specific interview questions with written answers | **≥ 5** | same |
| No scaffolding text (`is a core concept in`, `reference solution pending`, `coming soon`, …) | none | same, plus `prep_schema.PLACEHOLDER_MARKERS` |
| Not a copy of another page | < 80% shared 8-word phrases | `seo/content-audit.mjs` |

Lessons that fail stay published as non-indexed study briefs. Nothing is indexed because it exists; it is indexed because it teaches.

## Where a lesson lives

`backend/apps/courses/prep_content/<curriculum>/day-NN.json`. The curriculum folder for a course is in
`frontend/src/learning/prep-generated/manifest.json`. A course with no folder (CISSP, CEH, AZ-305, Google Cloud …)
needs a new folder with `_meta.json` first (see `backend/apps/courses/prep_content/README.md`).

Validate, regenerate and check before committing:

```bash
cd backend && python manage.py validate_prep_content <curriculum> --partial
cd ../frontend && npm run prebuild && npm run build && npm run seo:lastmod && npm run validate && npm run seo:audit
```

## Sections (in this order; the field names are the JSON keys)

1. **objectives** — 3–6 outcomes a learner can demonstrate ("Explain…", "Configure…", "Compare…").
2. **definition** — 2–4 precise sentences a beginner can follow.
3. **theory** — 3–7 sections `{heading, body, points?}`: what it is, why it matters, how it works, components,
   trade-offs and limitations. Explain mechanisms; do not pad with generic benefits.
4. **example** — one worked example `{title, body, code?}` with real commands/code for the subject
   (an IAM policy, a pandas transformation, an Azure CLI command, a Wireshark filter …).
5. **use_cases** — 3–6 concrete situations where a practitioner uses this.
6. **demonstration** — a walk-through with the expected output.
7. **interview** — **5–6** `{question, answer, explanation}` pairs, basic → advanced. Each answer must be specific to
   this topic: someone who only knows a different topic could not have written it. The `explanation` says what a
   strong answer includes and the common weak answer.
8. **practice** — one coding problem (with tests) or one practical exercise (with a checklist and sample answer).
9. **takeaways** — 4–7 points that summarise the lesson.
10. **quiz** — exactly 5 questions.

A skeleton with every field is in [`day-NN.template.json`](day-NN.template.json).

## Writing rules

- Write for the stated level; facts must be checkable against official documentation or the exam outline.
- Exam/certification topics (CISSP, AWS, Azure, CEH) follow the current official domain list; name the domain.
- No invented statistics, salaries, placement claims or "asked at <company>" labels.
- Do not reuse another lesson's answers. Shared questions across related courses are fine; answers must be
  written for this course's context.
- AI-assisted drafts are allowed only through `seo/drafts/` (below) and need human review before publication.

## Drafts

Drafts go in `seo/drafts/<curriculum>/day-NN.json` and carry `"_status": "DRAFT – needs review"`. The build never
reads that folder, and the exporter refuses any lesson that still has `_status`, so a draft cannot be indexed by
accident. To approve: review, remove `_status`, move the file into `prep_content/<curriculum>/`, validate and build.
