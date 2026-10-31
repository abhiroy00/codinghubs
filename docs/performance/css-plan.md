# CSS and image weight: measured numbers and the plan

Measured on 2026-10-31 with `frontend/scripts/css-coverage.mjs` (Chrome CSS coverage over 15 pages: home, program, locations, a location, tutor, courses, interview prep, certificates, policies, login, store, blog, projects, cart; details opened, page scrolled).

| Stylesheet | Size | Used on those pages |
|---|---|---|
| `free-session.css` (home, locations, blog, store, learning pages) | 123 KB minified | 53% |
| `index.css` (= `global.css`, loaded on every page) | 46 KB | 27% |
| `learning-extra.css` | 15 KB | 64% |
| `BookTutor.css`, `projects.css`, `guides.css`, `blog.css` | 12 / 17 / 7 / 4 KB | per page, already loaded only on their pages |

## Why `global.css` is still loaded everywhere
It styles the Layout pages (login, register, policies, dashboard), the cart drawer and a few shared helpers, and `main.tsx` imports it for every route.
Moving it into the lazy `Layout` chunk and the cart-drawer chunk would remove about 46 KB (about 9 KB gzip) from the home, store, blog and location pages.

Steps (each one is small and can be checked on its own):
1. Add `<link rel="stylesheet">` for the Layout stylesheet to the prerendered Layout pages (`policies.html`, `404.html`) so they are not unstyled before the chunk loads.
2. `import './styles/global.css'` in `components/Layout.tsx` and `components/CartDrawer.tsx`; delete it from `main.tsx`.
3. Compare screenshots of home, a location, blog, store, projects, program, courses, certificates, login and policies before and after (any page that relied on a global helper such as `.sr-only` or the reset will show up).
4. Move helpers that the fs pages really use (`.sr-only`, `.skip`) into `free-session.css`.

## `free-session.css`
About half is unused on any single page, because one file serves several designs. Splitting it into `fs-base` (tokens, header, footer, buttons, forms) plus `home`, `locations`, `learning` parts would let each page load only its part. Do it after step 4 above, with the same screenshot comparison, because hover, popup and menu states are easy to miss.

## Images uploaded before uploads were resized
New uploads are already capped at 1600 px and stored as WebP. Older ones (for example a 1.2 MB PNG project cover) are fixed by:

```
python manage.py optimize_media            # dry run: lists every big image and the saving
python manage.py optimize_media --apply    # writes WebP files and updates the database
```
On the server: `docker compose -f docker-compose.prod.yml exec backend python manage.py optimize_media --apply`.
Originals are kept (nothing is deleted); only `MEDIA_ROOT/uploads` is read. Take a database backup first.
