# Curated lesson source library

Each folder is named after an existing curriculum concept slug. It contains:

- `metadata.json`: outcomes, prerequisites, references, SEO description, difficulty, declared examples and diagrams.
- `lesson.md`: exactly `# concept`, `# practice`, `# industry`, `# assessment`, in that order. Each section uses a `## Heading`.
- `assessment.json`: the concept-specific questions, MCQs, model answers, tasks, assignment and self assessment. Prose remains in `lesson.md`.
- Repository-owned `.py` example files. Include an example once under a practice heading using `!python filename.py`. Expected output is recorded in metadata and tested against actual execution.

From `backend/`:

```powershell
$env:DEBUG='True'
.venv/Scripts/python.exe manage.py validate_genai_content --json
.venv/Scripts/python.exe manage.py test apps.learning.test_content_library --noinput
.venv/Scripts/python.exe manage.py seed_genai_lessons
```

`validate_genai_content` checks the curated library and the earlier cosine pilot for depth, structural validity and normalized exact question duplicates. It does **not** run code or establish technical/editorial approval. Example execution occurs only in tests against the trusted repository files selected by those tests. No database-authored code is executed and no public code runner is provided.

`seed_genai_lessons` imports into existing curriculum rows as **In Review**. Use repeatable `--slug` flags to select a subset. The command validates the selected batch before writing and refuses to overwrite existing content, assessments, metadata, review state, draft revisions or published versions. It never publishes. Source edits after an initial import do not silently update the database: use the editor and normal revision/review workflow for those changes.

The initial cosine lesson remains in `pilot-cosine.md` and `pilot-assessment.json` with its existing seed command for compatibility. No content was moved or implicitly replaced during introduction of this library.

The complete syllabus file is `../curriculum.json`. `seed_genai --refresh-structure` upgrades recognized generated module/chapter names and boilerplate objectives to the refined architecture. It preserves custom labels, concept slugs, lesson text and user progress. Without this explicit flag, the seed continues to add missing structure only.
