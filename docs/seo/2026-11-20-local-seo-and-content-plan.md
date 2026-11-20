# Local SEO, content plan and monitoring — 20 November 2026

Builds on the 11/13/20 November audits (crawl, canonicals, 404s, sitemaps, blog pagination are already fixed and live). No rankings are promised.

## Status of the brief's checks

| Area | Status | Evidence / file |
|---|---|---|
| robots, sitemap index, canonicals, 404s, www/http redirects | OK on live site | `frontend/public/robots.txt`, `sitemap-index.xml`, `backend/apps/content/ssr.py` |
| Home title/description targeted "free demo" only | Fixed: "AI Institute in Delhi \| Free AI Demo Class" | `frontend/src/seo/site.ts` (`HOME_META`) |
| Home H1 grammar ("Delhi most practical") | Fixed: "Delhi's" | `frontend/src/pages/free-session/JoinHero.tsx` |
| Organization address lacked `addressRegion` | Fixed | `frontend/src/seo/site.ts` |
| LocalBusiness schema | Not added: `EducationalOrganization` with the verified head-office address already covers the entity; `validate-seo.mjs` forbids LocalBusiness until opening hours/geo/GBP match are verified | — |
| Email domain `codingnowai.in` vs site `codinghubs.in` | **Owner decision** (NAP consistency) | `INSTITUTE.email` |
| About / contact / faculty pages | Do not exist; need verified faculty bios, photos, contact hours | owner input |
| Course facts (fees, duration, mode, batches) | Missing on course pages; site says "confirm with the school" | owner input |
| Core Web Vitals field data | Not available (no Search Console/CrUX access); lab LCP 3–7 s on 13 Nov | follow-up |

## Content plan — 20 new articles (no overlap with the 51 published posts)

| # | Slug | Intent | Link to |
|---|---|---|---|
| 1 | agentic-ai-vs-generative-ai | Comparison | /courses/agentic-ai/, /courses/generative-ai/ |
| 2 | how-to-learn-agentic-ai | Learning path | /courses/agentic-ai/, /blog/ai-agents-explained |
| 3 | generative-ai-vs-machine-learning | Concept | /courses/generative-ai/, /courses/data-science/ |
| 4 | machine-learning-roadmap | Roadmap | /courses/data-science/, /blog/how-to-become-an-ai-engineer |
| 5 | data-analyst-roadmap | Roadmap | /courses/data-analytics/, /blog/full-stack-vs-data-science-vs-ai |
| 6 | sql-interview-questions | Interview | /interview/, /blog/mongodb-vs-sql |
| 7 | pandas-tutorial-for-beginners | Tutorial | /courses/data-analytics-using-python/ |
| 8 | power-bi-vs-tableau | Comparison | /courses/data-analytics/ |
| 9 | vector-database-explained | Concept | /blog/what-is-rag, /courses/ai-engineering/ |
| 10 | fine-tuning-llms-for-beginners | Tutorial | /courses/ai-engineering/, /blog/what-is-rag |
| 11 | llm-frameworks-compared | Comparison | /courses/agentic-ai/ |
| 12 | ai-for-non-programmers | Beginner | /courses/prompt-engineering/ |
| 13 | ai-in-digital-marketing | Use cases | /courses/advanced-digital-marketing/ |
| 14 | responsible-ai-basics | Concept | /courses/generative-ai/ |
| 15 | git-and-github-for-beginners | Tutorial | /blog/github-profile-for-developers |
| 16 | system-design-basics-for-freshers | Interview | /interview/, /blog/microservices-spring-boot |
| 17 | cybersecurity-career-roadmap | Roadmap | /courses/cyber-security-gen-ai/ |
| 18 | cloud-computing-for-beginners | Concept | /courses/cloud-devops/, /courses/aws-solutions-architect/ |
| 19 | ai-jobs-for-freshers-in-india | Career | /latest-jobs, /blog/in-demand-tech-skills |
| 20 | how-to-choose-an-ai-course | Commercial investigation (no fees/claims unless verified) | /courses/, /blog/choose-coding-institute |

Outline for each: direct answer in the first paragraph; H2 sections (what, why, steps, examples, mistakes); a comparison table where useful; 3–4 FAQs; 2–4 internal links above. Write with `docs/blog-ai-prompt.md`, review facts, add a cover with `scripts/make_blog_covers.py`.

## Google Business Profile checklist (owner)

- Name exactly "Coding Hubs School of AI"; address exactly "904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034"; phone +91 74640 99059; website https://codinghubs.in/.
- Primary category: the closest available education/training category (for example "Computer training school"); add secondary categories only if accurate.
- Services: list real courses with links to their `/courses/<slug>/` pages; opening hours; real photos of the centre and classes.
- Ask real learners for reviews; reply to every review; never buy or script reviews.
- Keep the same NAP on Instagram, LinkedIn, YouTube, Facebook and directories; decide the email domain first.

## Monitoring checklist

- **Search Console:** submit `sitemap-index.xml`; weekly Pages report (indexed vs "Crawled – not indexed"); URL Inspection for new posts (never `?preview=` links); Core Web Vitals report; Queries for "ai institute in delhi", "generative ai course delhi", "agentic ai course".
- **GA4:** conversions for demo registration, WhatsApp/phone clicks and enrolment start; landing-page report for /blog and /courses.
- **Admin panel:** "Views" column (Blogs → sort "Most viewed") shows which articles to update and link from courses.

## 30 / 60 / 90 days

- **30:** owner fills course facts and GBP; submit sitemap; inspect top 10 URLs; fix any "Crawled – not indexed" pages by improving content.
- **60:** publish articles 1–10; add verified faculty/about page; collect genuine reviews; review CWV field data and profile the home LCP.
- **90:** publish articles 11–20; refresh the 10 most-viewed posts; compare Search Console queries/clicks with day 0; expand only content that earns impressions.
