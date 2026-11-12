# Interview Studio architecture

React lazy module → existing JWT interceptor → DRF /api/studio/v1/ → existing database. A new studio Django app owns versioned problems, interview sessions/messages/events, queued submissions, evaluations, roadmaps, notes, design documents and provider usage. Existing account identities remain authoritative.

The server selects approved problems and freezes their content, hints and test cases into a private session snapshot. Student serializers explicitly project public fields. Ownership is enforced on every session/resource query. Server timestamps enforce interview deadlines. A revision counter prevents stale draft writes.

AI uses a replaceable server-only provider with bounded requests, strict output validation, versioned instructions, persona policies and no database/admin/execution tools. OpenAI Responses structured outputs contract: https://developers.openai.com/api/docs/guides/structured-outputs. Conversations, code and approved content are untrusted context. Provider failure never becomes a fabricated interview or grade.

Executions are database-queued and processed by a separate management-command worker on a dedicated runner host. That host runs ephemeral nonprivileged Docker containers with no network, read-only root, tmpfs, CPU/memory/process/output/time limits. The web service never invokes Docker or evaluates source. Do not mount Docker into the web container. Only Python and JavaScript have runner adapters initially. Execution output from hidden tests is never exposed to candidates or the model. Worker claims use conditional updates for SQLite/Postgres compatibility.

Evaluation: six ratings from 1–4; overall = sum(weight × rating / 4). Weights sum to 100. Every rating needs an explanation. Raw automated test evidence remains separately labeled; AI cannot overwrite it. Reports freeze the weights and prompt version used.

Learning resources are independently authored. Company labels indicate practice categories, never verified interview provenance or endorsement. Design documents and learning progress persist using owner-scoped JSON records with validated structure and bounded size. Tutor retrieval initially uses approved problem editorials; semantic embedding ingestion is a separate, explicitly incomplete production milestone.

No Redis is necessary for this initial low-volume durable queue. Scaling, streaming AI, independent queue service, vector search and centralized observability require measured need and further deployment validation.
