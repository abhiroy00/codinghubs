# Coding Hubs blog post: AI writing brief

Upload this file to ChatGPT or Claude, then send one line: **Topic: <your topic>** (optionally add `Keyword: ...`, `Audience: ...`, `Length: ...`).
The AI must reply in the exact format below so each part can be pasted into the matching field of the Coding Hubs admin panel.

---

## Instructions for the AI

You are writing a blog post for **Coding Hubs** (codinghubs.in), a coding and AI training institute in Delhi NCR, India.
Readers are students, freshers and working professionals in India who want to learn programming, Full Stack, Python, Java, Data and Generative AI, and get jobs.

### Writing rules

- Write in clear, simple English. Short paragraphs (2 to 4 sentences). Explain jargon the first time it appears.
- Be practical: steps, examples, code snippets, real tools, salary or job context for India where relevant.
- Default length: 1,200 to 1,800 words. Never above 10,000 words.
- Do not invent statistics, quotes, placement numbers, student names or reviews. If a number is uncertain, leave it out or say it is an estimate.
- Do not claim Coding Hubs offers something unless the user said so. A soft closing line inviting readers to explore courses is fine.
- Use the focus keyword in the title, the short description, the first paragraph and at least one H2, naturally.

### HTML rules for the article body (strict)

The body is pasted into the admin "Edit HTML" box. The site strips anything else, so use **only** these tags:

`h2, h3, h4, p, br, hr, strong, em, u, s, mark, ul, ol, li, a, img, figure, figcaption, blockquote, pre, code, table, thead, tbody, tr, th, td, caption`

- Do **not** use `h1` (the title is the H1), `style`, `class` (except `class="language-xxx"` on `code`), `script`, `iframe`, `div` wrappers or Markdown.
- Use `h2` for main sections and `h3` for sub-sections. The table of contents is built from them automatically.
- Code goes in `<pre><code class="language-python">...</code></pre>` with `<`, `>` and `&` escaped as `&lt;`, `&gt;`, `&amp;`.
- Links: full `https://` URLs for outside sites; for Coding Hubs pages use only these paths: `/courses`, `/interview-prep`, `/projects`, `/ai-tools`, `/latest-jobs`, `/book-a-tutor`, `/faq`, `/blog`. Add 2 to 4 internal links where they genuinely help.
- No images inside the body unless the user supplies image URLs.
- End with an `<h2>Frequently asked questions</h2>` section of 3 to 5 questions, each as `<h3>` question + `<p>` answer, then a short conclusion.

### Output format (reply with exactly this, nothing before or after)

```
=== TITLE ===
(max 70 characters; must contain the focus keyword)

=== SHORT DESCRIPTION ===
(140 to 160 characters, plain text; shown under the title and on blog cards)

=== POST URL (slug) ===
(lowercase-words-with-hyphens, 3 to 6 words, no dates)

=== CATEGORY ===
(one short category name, e.g. Careers, Python, Web Development, Generative AI, Interview Prep)

=== TAGS ===
(4 to 6 tags, comma separated)

=== COVER IMAGE IDEA ===
(one sentence describing a suitable cover image)

=== COVER IMAGE ALT TEXT ===
(max 120 characters, describes the image)

=== ARTICLE HTML ===
<p>...</p>
<h2>...</h2>
...
```

After the article, do not add notes, explanations or a word count.

---

## How to publish (for the Coding Hubs team)

1. Open the admin panel, go to **Blogs → Write a post**.
2. **Title** and **Short description**: paste from the matching sections.
3. **Cover**: upload an image (1200 × 630 px or larger, JPG/PNG/WebP under 5 MB) and paste the alt text.
4. **Article**: click **Edit HTML**, paste the whole `ARTICLE HTML` section, then click **Visual editor** to check it looks right.
5. Open **Post details & extra images**: pick the category, set author, paste the slug into **Post URL**, add the tags.
6. Keep today's publish date (or choose a future date to schedule) and publish.
7. Open the live post once and check headings, links and code blocks.
