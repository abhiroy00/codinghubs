# Organic growth and sharing plan — 11 November 2026

## Goal and measurement

Treat 1,000+ organic visits per day as a growth target, measured as a rolling 28-day average of at least 1,000 organic sessions per day. It is not a forecast, a guarantee, or a committed 90-day outcome. Search Console clicks and GA4 sessions are different metrics and must be reported separately. No verified traffic baseline is available.

The repository contains a GA4 tag and a Search Console verification file. This does not establish that collection works or that the current user has access. Obtain read-only access or exports for the last 90 days: Search Console query/page/country/device performance, indexing and sitemap reports; GA4 organic landing pages, engaged sessions and confirmed lead conversions. Do not collect private learner content or proposal text in analytics.

Verify SPA page-view collection in GA4 DebugView before adding events: history-based enhanced measurement may already be active, and an additional page-view integration could double-count. Verify one page view per navigation and conversion events against persisted successful submissions. Keep analytics/consent settings under the business owner's control.

## Prioritized 30/60/90-day work

The publishing cadence assumes one writer and one subject reviewer can contribute weekly; revise capacity with the owner. Output goals below are operational targets, not promised traffic results.

| Period | Priority actions | Measurable review criteria |
|---|---|---|
| Days 1–30 | Complete visual/mobile QA, deploy after review, verify all three sitemaps in Search Console, establish a 28-day organic baseline, review the 15 primary prep guides, replace 10 placeholder lessons in the strongest subject cluster, and publish two genuinely useful supporting tutorials. Audit the real head-office Business Profile if access exists. | Zero build/SEO validation failures; zero accidental private URLs in sitemaps; inspect at least 10 representative URLs; verify all claimed conversion events; record indexed/submitted counts and CWV availability. Track reviewed lessons and two tutorials as output goals. |
| Days 31–60 | Replace 20 more subject-specific lessons with reviewed examples, publish four supporting tutorials based on real query data, strengthen contextual links to the relevant prep guide, and revise pages with impressions but weak clicks. Distribute one useful lesson weekly through existing company profiles. | Compare rolling 28-day non-brand clicks, organic sessions, engagement and lead conversions with the baseline. Report query/page cohorts and absolute numbers; flag any conversion decline. Record 20 completed lesson reviews, four tutorials and four distribution packages. |
| Days 61–90 | Replace another 20 lessons, update the best-performing guides, publish four further tutorials where gaps remain, and interview five consenting learners about missing explanations. Evaluate whether any staged guide now passes the editorial gate. Pilot gigs only after moderation policies and staffing are approved. | Review growth rate, indexed canonical pages, organic conversion rate, engaged sessions and mobile CWV by page group. Record reviewed lesson/tutoring output and five interviews. Set the next-quarter traffic target from actual data; do not assume 1,000/day is achievable within this period. |

Weekly dashboard: GSC clicks/impressions/CTR and position by query cohort; GA4 organic sessions/engaged sessions and verified conversions; submitted versus indexed canonical URLs; critical crawl/404 issues; p75 mobile LCP/INP/CLS if field data exists. Use lab tests when field samples are insufficient, labeling them as lab measurements. Do not call average position a fixed ranking or merge branded and non-branded performance.

## Content priorities from real inventory and observed search intent

The exploratory results for Generative AI preparation emphasized RAG coding, grounded answers, retrieval evaluation and system-design trade-offs. This is qualitative intent evidence, not keyword-volume or difficulty data. For example, the [DataCamp result](https://www.datacamp.com/blog/rag-interview-questions) emphasizes RAG question coverage; the [AIIQLabs result](https://aiiqlabs.com/interview-preparation/rag-interview-questions/coding) emphasizes worked coding tasks. Do not copy their content or infer their traffic. Re-check actual results in target markets before committing to a calendar.

| Existing cluster | Useful next content | Evidence to add before publication |
|---|---|---|
| Generative AI and Agentic AI | A worked retrieval failure diagnosis; a small retrieval evaluation example; a bounded tool-permission scenario | Reproducible inputs/outputs, failure examples and real reviewer sign-off; no fictional client results |
| Python Full Stack, Python Training, MERN/MEAN/React/.NET | Authentication versus authorization; a concrete ownership test; a request-lifecycle debugging exercise | Tested subject-specific code and edge cases; do not republish the same generic track text |
| Data Analytics and Python Analytics | Join-grain mistakes, missing-value handling and metric reconciliation | A documented sample dataset, expected totals and limits |
| AWS and Azure | Carefully scoped IAM/network exercises before claiming full exam preparation | Current official provider documentation and a reviewer; verify exam alignment before repeating certification codes from old source summaries |
| Security, design, marketing and other missing curricula | Start with the per-course specification in content-specifications.md | Confirm real audience, scope, prerequisites and subject reviewer; keep generic-only prep pages noindex |

For local discovery, keep the one verified Delhi head-office address and contact details consistent. Existing location pages must not imply local branches. Do not add more locality pages merely for keywords. For international discovery, keep the English pages accessible and accurate; do not invent country-specific branches or add hreflang without real translated/regional equivalents.

## AEO/GEO editorial checklist

- Put a direct answer beside each real question, followed by an example and its limits.
- Use precise headings, code with expected behavior, and concrete checks; avoid generic introductions repeated across subjects.
- Link to the relevant course, primary prep guide and supporting tutorial. Maintain visible breadcrumbs.
- Show author, reviewer and update information only when it is verified. Do not add build dates as editorial update dates.
- Keep visible content and structured data aligned. No new FAQ/QAPage, review, salary or job schema was added to the prep guides.
- Treat snippet selection, AI citations and rankings as observations, never promised outcomes.

Google states that its [AI features use the same SEO foundations](https://developers.google.com/search/docs/appearance/ai-features). The implementation therefore prioritizes readable source-backed answers and crawlable HTML rather than special AI-only markup.

## Social-sharing checklist

For each course or resource: verify title, description, canonical and OG URL; confirm a real accessible image and descriptive alternative text; use dimensions only when measured; check Twitter card fields; check the preview on a narrow screen and in the platform's sharing inspector; verify the destination route; remove unsupported outcome claims; and use campaign UTMs without changing the canonical URL. The existing logo is a measured 1254 × 1254 fallback. No new photographs, identities or testimonials were fabricated.

The source configuration links Instagram, LinkedIn, YouTube and Facebook. Account ownership, reach and publishing access remain unverified. Proposed weekly distribution, subject to the team's capacity: one useful technical walkthrough on YouTube, one concise example/explanation on LinkedIn, one short excerpt/carousel on Instagram and one adaptation on the configured Facebook profile. Reuse the same reviewed lesson as the source, adapting format rather than posting duplicate blocks. Link to its canonical guide with source/medium/campaign UTMs. Measure referral visits, engaged sessions and actual inquiries rather than follower counts alone. No accounts, posts or messages were created.

## Technical references

- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): include preferred canonical URLs; do not fabricate modification dates.
- [Canonical consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): eligible shared-curriculum aliases retain their URLs and point to the primary guide; noindex is not used to consolidate those eligible duplicates.
- [Robots limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro): crawling rules are not authentication and are not a reliable removal mechanism.
