# Generative AI roadmap implementation — 11 November 2026

## Authorized scope

Add a four-level white-background roadmap at the top of the existing Generative AI prep page. Preserve its current content, navigation, daily learning, quizzes, editor, certificate and progress behavior below. Use original CSS/SVG depth effects, four colored cards, real content counts and arrow links. No side panel, play buttons or extra track cards.

## Baseline

Existing React/Vite/TypeScript and Django architecture; no repository AGENTS.md found. Current GenAI source has 30 substantive lessons and 151 interview questions. The existing router has no dedicated level/article/day URLs. Existing learning progress is stored per user/course and guest browser; new roadmap progress must extend it without awarding existing day/certificate completion automatically.

## Design and implementation

- Four levels covering days 1–7, 8–14, 15–22 and 23–30.
- Forty original topic articles, ten per level, supplementing existing daily material without deleting it.
- Exactly 100 semantically distinct questions per level across the ten requested categories; structured answers, examples, explanations, applications, follow-ups, difficulty, tags and provenance.
- All new questions are original Research-based practice. Company labels are study lenses backed by public guidance, role expectations or technical research. No question is presented as officially asked or reported; no confidential question-bank claim.
- Registry of primary technical and company sources reviewed on 2026-11-11. Sources support underlying concepts and role relevance; invented practice scenarios are clearly educational examples.
- Dedicated level/article/day routes under the existing Generative AI URL; static prerendered content and matching browser metadata. Lazy level datasets keep the 400-question bank out of the initial main-page bundle.
- Add separate article/question/coding/assignment progress to existing authenticated progress API, with guest browser storage, ownership, validation and conflict-safe merges. No new authentication provider or framework.

## QA gates

Verify four cards, 100 questions in each level, ten categories per level, unique question intents/titles, complete provenance, measured article counts, valid links, all 30 day plans, local Python examples, access isolation, unknown-ID validation, source synchronization, builds, SEO validation and regression suite. Browser automation has previously failed before initialization; retry once and report any remaining visual/device limitations accurately. Nothing is published without explicit authorization.
