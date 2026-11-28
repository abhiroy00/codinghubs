# Local SEO platform: main release authorization

Date: 29 November 2026, Asia/Kolkata.

The user explicitly authorized **“Branch main mein merge aur deploy karo”** after being told that main merge alone does not host the new SEO application. This authorizes merging `work/zero-cost-seo-platform` into `main` and running the existing CodingHubs website deployment pipeline.

## Release scope

The feature branch adds `seo-growth-ai/` and six root documents. Website baseline is `9bbf4ea`; production Django/frontend/admin source, Dockerfiles and production Compose/workflow files are unchanged. The root `.dockerignore` explicitly excludes the separate SEO workspace so its ignored local credentials/database/models cannot be sent in a website Docker build context. The platform's own Docker context remains separate. Existing `CI/CD` validates backend, frontend and admin before deploying the current website images. No new hosting, cloud resources, public Ollama/database ports, Google credentials or paid AI/SEO integration are introduced. The new SEO platform continues running locally at `http://127.0.0.1:8765/`.

The previous “no production merge/deployment” records describe the earlier feature-branch delivery. This explicit user authorization permits the subsequent release; it does not claim that the platform's optional Docker profile or Google OAuth connection has been verified.

## Verification and release gate

Before merge: refresh main/feature refs, confirm no conflicts or production-file diff, rerun local platform tests/build and require the existing backend/frontend/admin PR checks to pass. Merge using the expected feature head so an unreviewed head change cannot be released. After merge: follow the main CI/CD run through deployment, verify the expected full release SHA with `/api/learning/release/?expected=SHA`, and smoke-check public/admin/blog/robots/sitemap responses without form submissions or fabricated view events.

Detailed implementation evidence is in `FINAL_TEST_REPORT.md`: 55 backend tests, 5 frontend tests, desktop/mobile browser workflows, local PostgreSQL/Ollama/crawler/backup checks. Existing website CI is a separate release gate and is not substituted with those platform checks.

## Recovery

The existing deployment script creates a pre-migration database backup and checks retained records. Previous known production release: `9bbf4ea`. This branch adds no production database migrations or production-serving changes. If release checks fail, diagnose before retrying and keep the previous deployment active; use the existing previous-image deployment procedure only if recovery is required. No database reset, down-migration, force push or new infrastructure is part of this release.

Final deployment status and exact live SHA are to be verified in the GitHub Actions run and reported in the delivery response. This authorization record is not itself proof of a successful deployment.
