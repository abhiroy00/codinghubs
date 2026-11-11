# GenAI roadmap search readiness

Implemented locally on 2026-11-11. This report does not claim deployment, indexing, rankings, rich results, or AI citations.

## Coverage

- Existing Generative AI landing page retains its content and gains a four-level ItemList matching its visible roadmap.
- Four level pages, 40 article pages and 30 daily lesson pages have canonical URLs, distinct descriptions, social metadata, visible breadcrumbs and prerendered HTML.
- LearningResource markup describes the actual free study material, with publisher identity, educational level and parent/child relationships. Article citations point to the same sources shown in the page.
- All 400 question-and-answer records are available in the rendered article HTML. Level banks remain paginated for readers; no login is required to read answers.
- Sources have recorded review dates and original questions retain their Research-based provenance. Company study lenses do not claim reported company interview questions.
- Learning and roadmap CSS loads in the document head on GenAI pages to style the first server-rendered paint. A nested main landmark was removed.
- Nested learning routes normalize to their trailing-slash canonical URLs in nginx. Production nginx execution remains to be verified in the deployment environment.

## Sitemap and ongoing workflow

The production build regenerates roadmap content and the existing sitemap generator discovers all prerendered indexable canonical pages. Following the all-course feature rollout, the current output contains 318 canonical URLs, including the 74 dedicated GenAI pages. No fabricated lastmod timestamps are added. See [all-course content and verification limits](../learning/all-course-roadmaps.md).

Search Console submission URL after deployment: https://codinghubs.in/sitemap-index.xml. Its existing child sitemap.xml includes the learning URLs; content and shop sitemaps continue to be served by the backend. There is no need to resubmit a separate URL for every lesson.

For every future public page or substantial content change, update visible useful answers, internal links, accurate source attribution, metadata, canonical/indexability and matching structured data together. Include the page in prerendering so sitemap inclusion follows the build. Do not expose private progress or user data in public markup.

Run from frontend:

```powershell
npm run build
npm run validate
```

The validation pipeline checks content synchronization, 400 unique question titles, executable Python examples, all sitemap URLs and metadata, and specific GenAI schema/citation/answer discoverability checks. Content/title uniqueness checks do not replace editorial review for semantic overlap or technical depth.

## Verified and remaining limits

Build and all validation checks passed. The GenAI-specific check verifies 74 sitemap entries, distinct descriptions, learning resources, article source citations, first-paint styles and 400 question anchors in prerendered articles. Lint exits successfully with warnings across the application. Browser/mobile visual QA, nginx runtime redirects, Search Console verification and live deployment are not claimed by these checks.

## Primary guidance

- [Google AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): foundational SEO practices apply to AI search, with no special AI schema requirement.
- [Google sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview): sitemap discovery does not guarantee crawling or indexing.

Clear definitions, direct answers, working examples, limitations and traceable sources support answer extraction and attribution. No search ranking or generative-engine citation is guaranteed. No extra FAQ/rating markup or AI text files were added as a purported shortcut.
