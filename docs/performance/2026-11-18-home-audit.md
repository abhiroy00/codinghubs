# Homepage performance and accessibility — 18 November 2026

The supplied PageSpeed screenshots identified image delivery, blocking CSS, reflow, cache lifetime, unused CSS/JavaScript, main-thread work, low-contrast code/review text, and an indistinguishable newsletter privacy link. The desktop screenshot scored 88. A fresh live mobile Lighthouse run before changes scored Performance 80, Accessibility 94, Best Practices 100 and SEO 100.

The production site and a local fixture server are different environments. The live score must not be compared directly with the local after score as if they were the same experiment.

## Controlled measurements

Lighthouse 13.6.0, installed Chrome, production/prerendered assets with gzip and the deployed nginx cache policy, three cold runs per form factor. Standard mobile simulation uses 4× CPU slowdown, 150 ms RTT and 1.6 Mbps throughput. Desktop uses Lighthouse's actual desktop configuration. No user-agent detection, audits disabled, features hidden from Lighthouse, or artificially inflated scores are used.

The local server binds only to 127.0.0.1, uses explicit empty public API fixtures and rejects submissions. Browser form tests intercept their own requests; no production lead or review was submitted.

| Metric (median of 3) | Mobile before | Mobile after | Desktop before | Desktop after |
| --- | ---: | ---: | ---: | ---: |
| Performance | 88 | 95 | 99 | 99 |
| First contentful paint | 1.21 s | 0.84 s | 0.29 s | 0.23 s |
| Largest contentful paint | 3.95 s | 2.78 s | 0.84 s | 0.82 s |
| Total blocking time | 52.00 ms | 129.00 ms | 0.00 ms | 0.00 ms |
| Main-thread work | 2.44 s | 2.66 s | 0.71 s | 0.51 s |
| Layout shift | 0.004 | 0.004 | 0.002 | 0.002 |

- Mobile before Performance runs: 93, 88, 86.
- Mobile after Performance runs: 84, 95, 95.
- Desktop before Performance runs: 97, 99, 99.
- Desktop after Performance runs: 100, 99, 99.

Accessibility, Best Practices and SEO are all **100** in every final local run. Image delivery, blocking-request and forced-reflow insights pass in the representative final mobile report.

**Consistent mobile Performance 100 has not been achieved.** Mobile main-thread work and blocking time are still material follow-ups: the median blocking time rose while first paint moved earlier. The overall mobile score improved because FCP and LCP improved, but this is not a clean win across every metric. The mobile LCP median is still above the 2.5-second good threshold. Remaining hints include approximately 41 KiB shared unused CSS, 40 KiB shared unused JavaScript, and 3 KiB cache savings on fixed-name icons. These checks have not been suppressed or thresholds weakened.

## Kept changes

- The homepage server and client share their provider/route tree. React hydrates its existing HTML instead of replacing the complete page. Other routes retain their existing rendering path. A browser test holds the app script, captures the original hero element, releases the script and proves the same element survives hydration without errors.
- First-viewport CSS is derived from the real prerendered markup during the build. It retains conservative pseudo/interactive rules and preserves stylesheet order. Full CSS downloads without blocking the first paint; noscript links retain the complete design when JavaScript is disabled. Browser tests hold every stylesheet and compare first-viewport geometry before and after the complete CSS loads at phone and desktop sizes.
- Scoped stylesheet loading recognizes the homepage's pending preload. It no longer duplicates that request and hides an already-painted root. The delayed-CSS test failed before this fix and passes after it. Direct homepage anchors are also tested with delayed styles.
- Hero photos have additional 480px/640px WebP variants. Existing larger variants and posters are retained exactly. Logos use responsive sources. Vite-generated content hashes allow the existing one-year immutable nginx cache policy to apply safely; original public assets remain available.
- The code-output text and review counter have stronger contrast. Newsletter consent links are underlined. Recorded-video accessible names include the visible video number and duration along with their title.
- The recorded-video carousel does not measure its offscreen layout or start its auto-scroll timer until it approaches the viewport.
- Hero autoplay waits for the initial visible images to decode before starting the first viewing interval. All five photographs, the subsequent three-second interval, swipe, side-card selection, hover/focus pause and reduced-motion behavior are retained. The original autoplay test still passes without changing its expectations.

No banner was replaced or removed. Hero text, photographs, video, announcement content, section content, project data and URLs remain intact. Existing course-card source/style edits and the existing home test edit were preserved separately.

## Experiments rejected

| Attempt | Observation | Decision |
| --- | --- | --- |
| Preload homepage Inter/Poppins fonts | Mobile median fell to 86; requests competed with the existing critical path | Reverted |
| Whole-section content visibility | Mixed scores, no robust gain beyond variance; introduced anchor/scroll-restoration risks | Reverted |
| Inline mobile poster | Mobile 86/desktop 99 in the experiment; larger HTML without measurable gain | Reverted |
| Activate all deferred stylesheets together | Mobile median remained 95/TBT about 130ms; desktop first-paint median worsened | Reverted |
| Additional 432px logo variant | Larger than the existing 720px file | Discarded |

The corresponding local experiment reports are retained in `artifacts/performance-20261118/` so these unsuccessful ideas do not need to be repeated without new evidence.

## Verification and reproduction

- Production build: TypeScript, client/SSR bundles, 1715 prerendered pages and precompression pass.
- Unit tests: 13/13 pass.
- Browser checks cover shared headers across 17 routes, mouse/keyboard/touch navigation, anchors, registration/review validation and retry, video playback, all five hero slides, touch swipe, stylesheet delays, retained hydration DOM, responsive hashed images and JavaScript-disabled rendering.
- `npm run test:performance` provides seven reproducible production-build regression checks. The test server starts automatically and uses the fixed public fixtures described above.
- Content/SEO/location validation and lint pass. Lint/build warnings remain; this is not a warning-free repository.
- Existing course/home-test diffs are byte-for-byte preserved from the start of this task.

From `frontend/`:

```sh
npm run build
npm run test:performance
npm test
npm run validate
npm run lint
```

For comparable score measurements, start the production-build fixture server:

```sh
node scripts/serve-audit-build.mjs
```

Then run each preset three times with separate output filenames and compare medians:

```sh
npx --yes lighthouse@13.6.0 http://127.0.0.1:4173/ --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=../artifacts/mobile-run-1
npx --yes lighthouse@13.6.0 http://127.0.0.1:4173/ --preset=desktop --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=../artifacts/desktop-run-1
```

Asset variants were generated with cwebp from the existing originals: photo widths 480/640, quality 78, method 6; 288px logo quality 82 and alpha quality 75. Larger original WebP files and both posters were copied unchanged into Vite's asset pipeline. This tooling is not needed at runtime or in CI because the assets are committed.

Local artifacts (ignored by git): `artifacts/performance-20261118/`, including complete before/final Lighthouse HTML/JSON reports and desktop/phone/accessibility screenshots. These are lab results, not production CrUX/field measurements.
