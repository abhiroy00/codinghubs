# Blog reader and writing flow

Blog articles use a centered title, summary and cover, followed by a sticky table of contents and a readable content column. The Django template and React page use the same layout; the server-rendered page retains its heading links and metadata without JavaScript. Blog article routes use native scrolling so heading anchors and the scrollable contents work together.

The admin blog form shows title, short description, optional cover and article. Post details, existing extra images, scheduling, featuring and version history are available in collapsed sections. Saving preserves existing SEO, FAQ, related-post and other stored metadata. Publishing and permissions still use the existing Django endpoints.

The blog visual editor uses the open-source Tiptap packages locally and needs no API key. It supports headings, basic formatting, lists, links, uploaded images, existing tables and HTML source editing. It loads only when the writing form needs it. Other content editors continue using their existing editor.

## Browser verification

Use a disposable local database. The tests create, publish, schedule and delete test posts. They reject non-local server addresses.

1. Install dependencies with `npm ci` in `frontend` and `admin-panel`.
2. Start Django on `127.0.0.1:8000` with a fresh database and media directory, for example `DATABASE_URL=sqlite:////tmp/codinghubs-blog-ui.sqlite3 MEDIA_ROOT=/tmp/codinghubs-blog-ui-media CACHE_LOCATION=/tmp/codinghubs-blog-ui-cache DEBUG=True`. Run `python manage.py migrate` with the same environment first; migration seeds the AI Engineer article used by the reader test.
3. Create a local staff/superuser with email `blog-ui@example.test` and password `Local-blog-test-only-2026!`, or set `BLOG_TEST_EMAIL` and `BLOG_TEST_PASSWORD` to a local test account.
4. Start the site with `VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5183` in `frontend`, and the admin with `npm run dev -- --host 127.0.0.1 --port 5184` in `admin-panel`.
5. Run `npx playwright test --config playwright.blog.config.ts` from `frontend`. The configuration uses installed Google Chrome. `BLOG_SITE_BASE_URL` and `BLOG_ADMIN_BASE_URL` can override the local URLs.

The checks cover responsive widths from 320 to 1440 pixels, heading navigation and active contents, draft recovery after reload, metadata preservation, publish/unpublish, visual text formatting, cover uploads and scheduling. Screenshots are saved under `artifacts/blog/`.
