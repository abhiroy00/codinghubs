# Interview-preparation content specifications ? 11 November 2026

Repository inventory has 43 course entries, 20 source curricula and 600 day files. File presence is not content completeness. The existing backend placeholder detector identifies template filler in 19 curricula. Public excerpts now exclude that material.

## Publication gate

Only substantive lessons are exported. A prep guide needs at least three substantive lessons before inclusion in search promotion; this is an editorial minimum, not a search-engine ranking rule. Partial guides disclose coverage and do not claim a completed 30-day curriculum. Five curricula with only one or two real lessons remain noindex, alongside the 18 entries without a dedicated source. Eligible shared-curriculum aliases use canonical consolidation without noindex; only primary URLs enter the sitemap.

## Missing lessons by curriculum

| Curriculum | Real lessons | Lessons needing replacement |
|---|---:|---|
| Agentic AI | 8 | 9?30 |
| AI Engineering | 4 | 5?30 |
| AI-Integrated Full Stack | 3 | 4?30 |
| AWS Developer Associate | 2 | 3?30 |
| AWS Solutions Architect | 2 | 3?30 |
| Azure Administrator (AZ-104) | 4 | 5?30 |
| Data Analytics | 3 | 4?30 |
| Data Analytics Using Python | 4 | 5?30 |
| Data Science | 2 | 3?30 |
| .NET Full Stack | 3 | 4?30 |
| Generative AI | 30 | None |
| Java Full Stack Developer + Gen AI | 1 | 2?30 |
| MEAN Stack | 4 | 5?30 |
| MERN Stack + Gen AI | 3 | 4?30 |
| MERN Stack | 1 | 2?30 |
| Prompt Engineering | 3 | 4?30 |
| Python Full Stack | 4 | 5?30 |
| Python Training Course | 9 | 10?30 |
| React Full Stack | 4 | 5?30 |
| Vibe Coding with AI | 4 | 5?30 |

## Courses with no dedicated curriculum

| Course | Existing route retained, noindex |
|---|---|
| Azure Solutions Architect Expert (AZ-305) | /interview-prep/azure-solutions-architect-expert-az-305/ |
| AI/ML Cloud Engineering | /interview-prep/ai-ml-cloud-engineering/ |
| Cloud DevOps & Automation | /interview-prep/cloud-devops-automation/ |
| Cloud Security & Compliance | /interview-prep/cloud-security-compliance/ |
| Google Cloud | /interview-prep/google-cloud/ |
| Azure AZ-305 | /interview-prep/azure-az-305/ |
| Cloud DevOps | /interview-prep/cloud-devops/ |
| Internship | /interview-prep/internship/ |
| Projects | /interview-prep/projects/ |
| Ethical Hacker (CEH) v13 | /interview-prep/ethical-hacker-ceh-v13/ |
| AI/GenAI for Cybersecurity | /interview-prep/ai-genai-for-cybersecurity/ |
| Cloud Security | /interview-prep/cloud-security/ |
| Cyber Law & GRC | /interview-prep/cyber-law-grc/ |
| CISSP | /interview-prep/cissp/ |
| Ethical Hacker (C|EH) | /interview-prep/ethical-hacker-ceh/ |
| Cyber Security + Gen AI | /interview-prep/cyber-security-gen-ai/ |
| UI/UX Designing | /interview-prep/ui-ux-designing/ |
| Advanced Digital Marketing | /interview-prep/advanced-digital-marketing/ |

## Specification for each unfinished subject

Use the existing subject name, catalog topics and intended audience as starting points, not evidence of official prerequisites or qualifications. Ask the course owner to confirm audience, prerequisites, scope and reviewer identity. Assign a real subject reviewer before making author/reviewer claims.

For every missing day, replace the template with a precise definition, at least three useful theory sections, a worked subject-specific example, use cases, a demonstration, takeaways, distinct interview questions with defensible answers and follow-ups, a concrete practical problem and a five-question knowledge check. Follow prep_content/README.md and validate_prep_content; coding outputs must be reproducible. Test edge cases and mistakes as well as the main path.

Do not simply relabel one track's copy for another course. Do not add job outcomes, salary data, certification recognition, reviews or instructor biographies without verified evidence. Advanced topics should not be advertised as available until their actual lesson bodies have been authored and reviewed.

After editing source JSON: validate the curriculum, run npm run prep:sync, rebuild and run npm run validate. The generated files deliberately fail the check if source content changes without regeneration. Database edits marked edited_in_admin are preserved by the existing seed command and do not automatically become public source excerpts: reconcile approved CMS edits back to source JSON before rebuilding.

## Reference exercise corrections

Generative AI days 16, 18, 23, 28 and 29 had inconsistent fixtures or implementations. Corrected whitespace-token retrieval expectations, overlap chunk output, ignored Thought lines, exact-match arithmetic, actual long-input fixtures and whitespace-preserving redaction. The calculator now uses an arithmetic-only AST evaluator rather than eval. Existing exercise validation is the regression check.
