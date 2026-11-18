# Coding Hubs home redesign

The homepage keeps Coding Hubs' course catalogue, descriptions, demo videos, program curricula, contact information and published project/review data. The Product Space reference informed the broad idea of an education/community landing page. Its copy, source code, branding and media were not imported. The split hero, layered code/classroom composition, navy/blue visual system and pathway navigation are a Coding Hubs implementation using existing local assets.

## Behaviour

- Responsive home, announcement dismissal, mobile navigation, existing course search/category filters, video carousel, live-demo calls to action, and links to courses, interview preparation, tutors and jobs.
- All 13 course cards preselect the matching course in the demo form, including Vibe Coding with AI.
- Reveal animations also observe projects and testimonials added after an API response. Motion preferences disable the decorative animations.
- Demo dialogs keep keyboard focus inside, support Escape, restore focus and allow native nested scrolling.
- Demo registration now saves the email, education and WhatsApp preference already collected by the form. These fields appear in staff APIs, Django admin, the custom lead list and CSV export. Existing lead producers can omit the new fields.
- Failed submissions retain the entered data for retry. Restricted/corrupt local storage does not block registration or turn a successful server response into an error.

## Verification

From `frontend/`:

```sh
npm run build
npm run validate
npm test
npx playwright test --config playwright.home.config.ts
```

The home browser suite uses Chrome and expects the frontend at `http://localhost:5173`; run Django at `127.0.0.1:8000` for the public directory requests. Form failure/success scenarios use intercepted responses without creating real enquiries. Backend tests prove persistence using an isolated test database.

From `backend/` (with the Python environment active):

```sh
DEBUG=1 python manage.py test apps.leads apps.adminpanel --noinput
DEBUG=1 python manage.py makemigrations --check --dry-run
```

From `admin-panel/`: `npm run build`.

## Release

Run the new additive migration `leads.0003` before serving the updated backend. No payment credentials, production content or live deployment settings are changed by this work. The implementation was prepared and checked locally; production deployment is a separate action. Existing lint and large-chunk/dynamic-import warnings are outside this redesign.

## Shared site navigation

All public page shells and the lesson workspace use `frontend/src/components/Header.tsx` and its independent `header.css`. The homepage, course/interview pages, blog/projects, location guides and account pages share the same logo, primary links, Resources, login and free-demo actions. Store category links and learning controls remain contextual navigation below that primary header.

Locations is a link inside Resources on both desktop and mobile. The disclosure supports keyboard navigation, Escape and outside-click dismissal; navigation closes the mobile menu. The demo popup loads its own stylesheet when opened from a page without the free-session stylesheet, such as login.

`frontend/e2e/header.spec.ts` checks matching header styling and links across 13 routes, mobile Resources → Locations navigation, and the demo dialog on an account page. It runs with the existing home browser command above.

## November 2026 refresh: learning block, popular courses, profile and footer banner

- **Start learning right now** (`#learn-free`, `frontend/src/pages/free-session/HomeLearn.tsx`) sits directly below the pathways band: the Generative AI 30-day roadmap (four levels linking to their lesson pages), a two-minute Python challenge with answer and explanation, and a beginner project with steps and outcome. All three work without sign-up and without JavaScript (the answer is a native `<details>`).
- **Editing path.** The content lives in `frontend/src/pages/free-session/learning-hub.ts` as a typed copy of existing sources, so the homepage bundle does not ship the roadmap or catalogue JSON. Change the source first (`learning/genai-generated/*.json`, `learning/catalog.ts`), then mirror it here; `learning-hub.test.ts` fails `npm test` if the copy drifts or a course link has no course page.
- **Popular courses** (`#courses`) reuse the 13 existing homepage courses (`COURSES` in `data.ts`) with the existing category tabs. Each card links to its course page and opens the demo form with that course preselected. The three 15-day programs follow from `programs.ts`. Only verified metadata is shown (live online, 30-day roadmap, 15 days); levels and prices are not shown because the catalogue does not record them.
- **About / profile** (`#about`) keeps its content and actions but no longer uses boxed panels or a section seam; the contact column is separated by a hairline only.
- **Banner above the footer** (`.ch-band` in `locations/FsShell.tsx`, styles in `locations/footer-cta.css`) is shared by every page using the site footer: one benefit line and one primary action, **Book a Free Demo**, which opens the existing registration popup. A quiet phone link remains for people who prefer to call.
- **Header** navigation is 16.5px/600 on desktop (16px between 1101–1250px) and 17px in the mobile menu; the homepage-only header overrides were removed so every route shares `components/header.css`.

Browser checks: `frontend/e2e/redesign.spec.ts` (run with `npx playwright test --config playwright.performance.config.ts` after `npm run build`).
