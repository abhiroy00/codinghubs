# Notes library and demo dialog

Replace the demo registration dialog shown in the reference with a distinctive two-column career introduction and the existing working lead form. Keep required fields, validation, API submission, course selection, consent, keyboard focus, close controls and enrollment enquiries working. Open only in response to a visitor action.

Add `/notes/` to Resources and the footer. Import all published subjects, topic listings and article bodies from the institute's existing `https://codingnowai.in/notes/` library. Subject cards open an animated reading box at `/notes/:subject/`; its searchable topic list opens the full article with a shareable `?topic=` selection. Keep loading, retry, empty and unknown-subject states explicit. Readers can close with Escape or the close button and return to their selected card.

Use the existing React router, site shell, fonts and brand colors. No new runtime dependencies or database schema. The importer strips scripts, forms, event handlers, styles and promotional chrome from article bodies, preserves semantic content and rewrites notes links locally. Store article JSON separately so the initial page does not download the whole library. Record source URLs and import counts; do not invent missing notes or inflate topic counts.

Build order: import and validate content → demo dialog → subject cards and reader → navigation and prerender integration → responsive/browser verification → full build, lastmod refresh and CI validation.

Verification: `python3 scripts/import-notes.py`, `npm run validate:notes`, `npx tsc -b`, `npm run lint`, focused Playwright notes/demo/enrollment checks, `npm run build`, `npm run seo:lastmod`, regenerate prerender output, `npm run validate`. Browser checks at 320, 768, 1024 and 1440 px, including keyboard focus, Escape, reduced motion, loading failure/retry and form submission with a mocked API.

The one-time importer requires Python 3 and Beautiful Soup (`beautifulsoup4`); cached source HTML stays in the system temporary directory. Production and CI read the committed content without fetching the old website.

Imported 1,078 distinct published articles (507,856 words): Python 15, SQL 37, Machine Learning 239, Deep Learning 490, Agentic AI 20, HTML 124 and Generative AI 153. Repeated source URLs are deduplicated; unavailable “coming soon” categories are not presented as notebooks. Article code and tables remain readable; promotional forms and sharing scripts are excluded.

The eight library/subject pages are prerendered with self-canonical metadata, first-paint styles and verified sitemap dates. Topic selections use the subject page canonical and load their committed article JSON on demand.
