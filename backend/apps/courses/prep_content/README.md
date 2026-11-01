# Interview-prep lesson content

Each folder is one **curriculum**: 30 daily lessons shared by one or more courses (for example,
`aws-solutions-architect` serves both AWS Solutions Architect course pages). `manage.py seed_prep_content`
loads these files into the database on every deploy. Lessons edited in the admin panel are not overwritten.

Validate before committing (runs every coding solution against its tests):

```
python manage.py validate_prep_content <folder> [--partial] [--no-run]
```

## `_meta.json`

```json
{
  "curriculum": "generative-ai",
  "title": "Generative AI",
  "courses": ["generative-ai"],
  "source": "Coding_Hub_30_Days_Generative_AI_Interview_Guide.pdf",
  "summary": "One or two sentences on what the 30 days cover."
}
```

`source` is the PDF file name when the topics come from a provided syllabus, otherwise `"authored"`.

## `day-NN.json` (day-01.json … day-30.json)

| Field | Content |
|---|---|
| `day` | 1–30, matching the file name |
| `title` | The day's topic, unique within the curriculum |
| `module` | Module/chapter name (groups of days share one) |
| `level` | `Beginner`, `Intermediate` or `Advanced`; difficulty rises through the 30 days |
| `objectives` | 3–6 learning objectives ("Explain…", "Build…") |
| `definition` | A precise, beginner-friendly definition (2–4 sentences) |
| `theory` | 3–7 sections `{heading, body, points?}`: what it is, why it matters, how it works, components, related concepts, advantages/limitations |
| `example` | `{title, body, code?}`; `code` is `{language, source}` |
| `use_cases` | 3–6 `{title, description}` real-world uses |
| `demonstration` | `{description, code?, output?}`: a walk-through with the expected result |
| `takeaways` | 4–7 points to remember |
| `interview` | 4–6 `{question, answer, explanation}`, from basic to advanced |
| `practice` | One coding problem or one practical exercise (below) |
| `quiz` | Exactly 5 `{type, question, code?, options[4], answer (0–3), explanation}`; `type` is `concept`, `scenario`, `output` or `code` |

### Coding practice

Programs read **stdin** and print to **stdout**, so the site's runner can check them in any supported language.

```json
{
  "kind": "coding",
  "title": "…", "difficulty": "Basic | Intermediate | Advanced",
  "objective": "…", "statement": "…",
  "language": "python | javascript | java | csharp",
  "input_format": "…", "output_format": "…",
  "example": {"input": "…", "output": "…"},
  "constraints": ["…"],
  "starter": "…", "solution": "…",
  "explanation": ["step 1", "step 2"],
  "tests": [{"input": "…", "output": "…"}]
}
```

- Python: standard library only (no pandas/numpy; the runner has none). Code must run on Python 3.8+.
- JavaScript runs in the browser: the input is a global string named `stdin`; print with `console.log`. Do not use `require` or `process`.
- Java: `public class Main` reading `System.in`. C#: `class Program` reading `Console.In`.
- 3–6 tests, including edge cases. Output is compared line by line, ignoring trailing spaces.

### Practical exercise (for topics where code is not the right check)

```json
{
  "kind": "exercise",
  "title": "…", "difficulty": "…", "objective": "…", "statement": "…",
  "deliverable": "What the learner produces",
  "steps": ["…"], "checklist": ["Self-review criteria"],
  "sample_answer": "A model answer to compare against"
}
```
