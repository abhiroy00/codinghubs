# Coding Hubs website redesign

Implemented in the existing React/Vite project on 16 November 2026. The home page uses the existing logo, five original classroom/community photos, six original demo videos, existing tool destinations and all three complete 15-day curricula.

## Delivered

- White shared header with the logo directly on the header surface, navy navigation and a yellow Book Free Demo button. Secondary pages remain in Resources. Mobile navigation supports Escape, initial keyboard focus, account controls and returning focus after registration.
- Two-column hero; static photo gallery; four quick links; static industry-tool grid; recorded video carousel with real WebP poster frames and manual navigation. Video metadata and posters load near the viewport.
- Clear separation of the free two-hour online introduction and optional paid 15-day programs. Complete day-by-day curriculum routes remain intact.
- Responsive spacing and Inter/Noto Sans Devanagari typography, with navy headings, white/light-grey sections and yellow primary actions.
- Existing registration endpoint, collected fields, course options and confirmation flow retained. Persistent labels, 16px inputs, error focus, submitting state and server-confirmed success remain available. The honeypot rejection no longer displays a false success.
- Real review API and moderation flow retained. Loading, empty, failed-request, retry and 12-second timeout states are distinct. The empty state does not show a decorative five-star rating.
- One light shared footer across marketing, account and policy pages; preserved contact details, social links, location links and policy destinations. Location guidance explicitly avoids claiming additional campuses.
- Navy final CTA and separate call/WhatsApp controls. The mobile demo bar reserves bottom space, respects safe-area insets and hides near the footer. Contact controls hide while the registration dialog is open.

Existing routes, SEO metadata, canonical generation, structured data and the Google analytics snippet were retained. Existing uncommitted work was incorporated rather than discarded.

## Implementation files

- `frontend/src/pages/FreeSession.tsx`
- `frontend/src/pages/home/HomeSections.tsx`
- `frontend/src/pages/home/home-redesign.css`
- `frontend/src/components/Header.tsx` and `header.css`
- `frontend/src/components/Footer.tsx`, `SiteFooter.tsx` and `shared-footer.css`
- `frontend/src/locations/FsShell.tsx`
- `frontend/src/pages/free-session/HomeExplore.tsx`, `RegisterForm.tsx` and `VideoReels.tsx`
- `frontend/src/lib/fonts.ts`, `frontend/index.html` and `frontend/public/free-session.css`
- Six `frontend/public/fs-assets/img/videos/demo-*-poster.webp` assets, extracted from the corresponding original videos.
- Updated browser checks in `frontend/e2e/home.spec.ts`, `header.spec.ts`, `account-menu.spec.ts` and `google-login.spec.ts`.

Existing related changes to ResourcesMenu, JoinHero, HeroSlider, account-menu.css, home-theme.css and global.css are included in this refresh.

## Verification

- `npx playwright test --config playwright.home.config.ts`: 33 tests passed. Covered layout at 360, 390, 768, 1024 and 1440px; one H1; no horizontal page scrolling; images; routes; shared header/footer; dropdowns; account flows; recorded video playback; program navigation; registration validation, failed submission and successful retry; review submission/moderation; request timeout/retry; demo anchors; floating controls; reduced motion; primary-button contrast.
- Additional focused mobile-menu and signed-in-header checks passed after the final focus improvement.
- `npm test`: 10 tests passed across two files.
- `DEBUG=True DATABASE_URL=sqlite:///:memory: env/bin/python manage.py test apps.leads.tests apps.content.tests.TestimonialTests apps.content.tests.ReviewSubmissionTests --noinput`: 10 backend tests passed.
- Real browser-to-Django smoke check using a separate temporary SQLite database: registration and review submission both returned HTTP 201 without API mocks. Database assertions verified the saved registration fields, WhatsApp preference, review rating/consent and pending moderation. The unpublished review stayed absent from the public list. External browser requests were blocked during this check.
- `npm run build`: TypeScript, client build, server build and prerender passed; 1,707 pages rendered and a 323-URL sitemap generated.
- `npm run validate`: content sync, roadmap, SEO and location checks passed.
- `npm run lint`: completed successfully, with repository warnings. The build also reports existing dynamic-import/chunk warnings.
- `git diff --check`: passed.
- Visually inspected desktop/mobile hero, footer, recorded videos and registration dialog. Preview captures are under `artifacts/redesign/`.

The repeatable browser suite intercepts API requests to verify payloads, failure handling and confirmation. In addition, an isolated local browser-to-backend smoke check verified actual persistence without API mocks. Synthetic records were confined to a disposable database; no production leads or reviews were created. Production notification delivery and external services were not exercised.

## Business information still needed

- Confirmed demo dates/times: source data has no schedule, so the page says “Schedule to be announced”.
- Verified program fees: no new prices were invented; visitors are directed to request details.
- Verified trainer names and credentials: the existing informational placeholder is retained.
