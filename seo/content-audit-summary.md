# Content-completeness audit

Generated 2026-11-23 from `frontend/dist` (the /learn/ pages are served by Django; rerun with --learn-base to include them). 1682 pages scored. Full rows: [content-audit.csv](content-audit.csv).

## Rule (from `frontend/src/seo/robots.ts`)

- **Lesson (article/day/learn concept) COMPLETE**: at least 600 unique words, at least 5 subject-specific answered questions, no placeholder phrases, and not a ≥80% copy of a preferred URL.
- **Guide COMPLETE**: at least 400 unique words and no placeholder phrases.
- **Hub / level COMPLETE**: at least 1 COMPLETE lesson beneath it. Alias URLs are never COMPLETE (their canonical is the primary course).
- **PLACEHOLDER**: placeholder phrases ("reference solution pending", "are pending", "lessons pending", "in preparation", "not yet available", "not yet published", "coming soon", "curriculum development in progress", "self-guided study brief", "is a core concept in", "it improves reliability, maintainability and clarity", "an unrelated concept") or no complete lessons. **THIN**: the rest.
- Unique words exclude navigation, forms, buttons and any text block that appears in 3+ courses or on 6+ pages of one course (template text). "Generic answers" are question answers whose text appears in 3+ courses.

## Pages by type

| Type | Pages | COMPLETE | THIN | PLACEHOLDER | Currently indexed |
|---|---|---|---|---|---|
| hub | 2 | 2 | 0 | 0 | 2 |
| course-page | 43 | 43 | 0 | 0 | 43 |
| course-hub | 43 | 20 | 5 | 18 | 25 |
| level | 172 | 25 | 5 | 142 | 25 |
| day | 1290 | 10 | 104 | 1176 | 98 |
| article | 124 | 124 | 0 | 0 | 108 |
| guide | 8 | 8 | 0 | 0 | 8 |

Pages where the current robots tag disagrees with the rule: **109** (first 15 below).
- `/interview/agentic-ai/levels/1/days/1/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-1/
- `/interview/agentic-ai/levels/1/days/2/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-2/
- `/interview/agentic-ai/levels/1/days/3/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-3/
- `/interview/agentic-ai/levels/1/days/4/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-4/
- `/interview/agentic-ai/levels/1/days/5/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-5/
- `/interview/agentic-ai/levels/1/days/6/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-6/
- `/interview/agentic-ai/levels/1/days/7/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/1/articles/day-7/
- `/interview/agentic-ai/levels/2/days/8/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/agentic-ai/levels/2/articles/day-8/
- `/interview/ai-engineering-diploma/levels/1/days/1/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/ai-engineering/levels/1/days/1/
- `/interview/ai-engineering-diploma/levels/1/days/2/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/ai-engineering/levels/1/days/2/
- `/interview/ai-engineering-diploma/levels/1/days/3/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/ai-engineering/levels/1/days/3/
- `/interview/ai-engineering-diploma/levels/1/days/4/` — THIN, robots "index, follow, max-image-preview:large"; 100% contained in /interview/ai-engineering/levels/1/days/4/
- `/interview/ai-engineering/` — THIN, robots "index, follow, max-image-preview:large"; alias of /interview/ai-engineering-diploma/; markers: lessons pending; 4 complete lessons
- `/interview/ai-engineering/levels/1/articles/day-1/` — COMPLETE, robots "noindex, follow"; alias of /interview/ai-engineering-diploma/; 100% contained in /interview/ai-engineering/levels/1/days/1/
- `/interview/ai-engineering/levels/1/articles/day-2/` — COMPLETE, robots "noindex, follow"; alias of /interview/ai-engineering-diploma/; 100% contained in /interview/ai-engineering/levels/1/days/2/

## Course completion (complete lesson days out of 30)

| Course | Complete days | % | Indexed pages / built pages |
|---|---|---|---|
| Generative AI (`generative-ai`) | 30 | 100% | 76 / 76 |
| Python Training Course (`python-training-course`) | 9 | 30% | 22 / 45 |
| Agentic AI (`agentic-ai`) | 8 | 27% | 20 / 44 |
| AI Engineering Diploma (`ai-engineering-diploma`) | 4 | 13% | 11 / 40 |
| Azure Administrator (AZ-104) (`azure-administrator-az-104`) | 4 | 13% | 11 / 40 |
| Data Analytics Using Python (`data-analytics-using-python`) | 4 | 13% | 11 / 40 |
| MEAN Stack (`mean-stack`) | 4 | 13% | 11 / 40 |
| Python Full Stack (`python-full-stack`) | 4 | 13% | 11 / 40 |
| React Full Stack (`react-full-stack`) | 4 | 13% | 11 / 40 |
| Vibe Coding with AI (`vibe-coding-with-ai`) | 4 | 13% | 11 / 40 |
| AI-Integrated Full Stack (`ai-integrated-full-stack`) | 3 | 10% | 9 / 39 |
| Data Analytics (`data-analytics`) | 3 | 10% | 9 / 39 |
| MERN Stack + Gen AI (`mern-stack-gen-ai`) | 3 | 10% | 9 / 39 |
| .NET Full Stack (`net-full-stack`) | 3 | 10% | 9 / 39 |
| Prompt Engineering (`prompt-engineering`) | 3 | 10% | 9 / 39 |
| AWS Certified Solutions Architect (`aws-certified-solutions-architect`) | 2 | 7% | 7 / 38 |
| AWS Developer Associate (`aws-developer-associate`) | 2 | 7% | 7 / 38 |
| Data Science (`data-science`) | 2 | 7% | 7 / 38 |
| Java Full Stack Developer + Gen AI (`java-full-stack-developer-gen-ai`) | 1 | 3% | 5 / 37 |
| MERN Stack (`mern-stack`) | 1 | 3% | 5 / 37 |
| Advanced Digital Marketing (`advanced-digital-marketing`) | 0 | 0% | 1 / 36 |
| AI/GenAI for Cybersecurity (`ai-genai-for-cybersecurity`) | 0 | 0% | 1 / 36 |
| AI/ML Cloud Engineering (`ai-ml-cloud-engineering`) | 0 | 0% | 1 / 36 |
| Azure AZ-305 (`azure-az-305`) | 0 | 0% | 1 / 36 |
| Azure Solutions Architect Expert (AZ-305) (`azure-solutions-architect-expert-az-305`) | 0 | 0% | 1 / 36 |
| CISSP (`cissp`) | 0 | 0% | 1 / 36 |
| Cloud DevOps (`cloud-devops`) | 0 | 0% | 1 / 36 |
| Cloud DevOps & Automation (`cloud-devops-automation`) | 0 | 0% | 1 / 36 |
| Cloud Security (`cloud-security`) | 0 | 0% | 1 / 36 |
| Cloud Security & Compliance (`cloud-security-compliance`) | 0 | 0% | 1 / 36 |
| Cyber Law & GRC (`cyber-law-grc`) | 0 | 0% | 1 / 36 |
| Cyber Security + Gen AI (`cyber-security-gen-ai`) | 0 | 0% | 1 / 36 |
| Ethical Hacker (C|EH) (`ethical-hacker-ceh`) | 0 | 0% | 1 / 36 |
| Ethical Hacker (CEH) v13 (`ethical-hacker-ceh-v13`) | 0 | 0% | 1 / 36 |
| Google Cloud (`google-cloud`) | 0 | 0% | 1 / 36 |
| Internship (`internship`) | 0 | 0% | 1 / 36 |
| Projects (`projects`) | 0 | 0% | 1 / 36 |
| UI/UX Designing (`ui-ux-designing`) | 0 | 0% | 1 / 36 |

## Top 20 pages to complete first

High-demand courses first (CISSP, AWS, Azure AZ-104/AZ-305, Python, Data Science, AI Engineering, Ethical Hacking, MERN), taking each course's earliest missing day in turn so Level 1 of every priority course fills before Level 2. Each lesson is written in `backend/apps/courses/prep_content/<curriculum>/day-NN.json` (see `seo/templates/lesson-template.md`); a course without a curriculum folder needs one created and mapped in `prep-generated/manifest.json` first.

| # | Course | Lesson | URL once published |
|---|---|---|---|
| 1 | CISSP | Day 1: Security goals and assets for CISSP security domains | `/interview/cissp/levels/1/articles/day-1/` |
| 2 | AWS Solutions Architect | Day 3: Identity boundaries for AWS solutions architecture | `/interview/aws-certified-solutions-architect/levels/1/articles/day-3/` |
| 3 | AWS Developer Associate | Day 3: Identity boundaries for AWS application development | `/interview/aws-developer-associate/levels/1/articles/day-3/` |
| 4 | Azure AZ-104 | Day 5: Network segmentation for Azure administration and AZ-104 objectives | `/interview/azure-administrator-az-104/levels/1/articles/day-5/` |
| 5 | Azure AZ-305 | Day 1: Shared responsibility for Azure architecture and AZ-305 objectives | `/interview/azure-solutions-architect-expert-az-305/levels/1/articles/day-1/` |
| 6 | Python | Day 10: API contract design for Python programming | `/interview/python-training-course/levels/2/articles/day-10/` |
| 7 | Data Science | Day 3: Missing-value analysis for data science | `/interview/data-science/levels/1/articles/day-3/` |
| 8 | AI Engineering | Day 5: Few-shot examples for AI engineering | `/interview/ai-engineering-diploma/levels/1/articles/day-5/` |
| 9 | Ethical Hacking (CEH v13) | Day 1: Security goals and assets for ethical hacking and CEH v13 objectives | `/interview/ethical-hacker-ceh-v13/levels/1/articles/day-1/` |
| 10 | MERN | Day 2: Data types and validation for MongoDB, Express, React and Node.js | `/interview/mern-stack/levels/1/articles/day-2/` |
| 11 | CISSP | Day 2: Threat modeling for CISSP security domains | `/interview/cissp/levels/1/articles/day-2/` |
| 12 | AWS Solutions Architect | Day 4: Least-privilege policies for AWS solutions architecture | `/interview/aws-certified-solutions-architect/levels/1/articles/day-4/` |
| 13 | AWS Developer Associate | Day 4: Least-privilege policies for AWS application development | `/interview/aws-developer-associate/levels/1/articles/day-4/` |
| 14 | Azure AZ-104 | Day 6: Subnets and routes for Azure administration and AZ-104 objectives | `/interview/azure-administrator-az-104/levels/1/articles/day-6/` |
| 15 | Azure AZ-305 | Day 2: Regions and availability zones for Azure architecture and AZ-305 objectives | `/interview/azure-solutions-architect-expert-az-305/levels/1/articles/day-2/` |
| 16 | Python | Day 11: Database modeling for Python programming | `/interview/python-training-course/levels/2/articles/day-11/` |
| 17 | Data Science | Day 4: Duplicate detection for data science | `/interview/data-science/levels/1/articles/day-4/` |
| 18 | AI Engineering | Day 6: Structured outputs for AI engineering | `/interview/ai-engineering-diploma/levels/1/articles/day-6/` |
| 19 | Ethical Hacking (CEH v13) | Day 2: Threat modeling for ethical hacking and CEH v13 objectives | `/interview/ethical-hacker-ceh-v13/levels/1/articles/day-2/` |
| 20 | MERN | Day 3: Functions and composition for MongoDB, Express, React and Node.js | `/interview/mern-stack/levels/1/articles/day-3/` |
