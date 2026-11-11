# Local preview and deployment handoff

All changes are local. Nothing was committed, pushed, posted or deployed by this task. A push to main triggers the repository's existing production deployment, so review the diff and complete the missing visual checks before merging.

## Local setup in PowerShell

From the repository root, in a backend terminal:

```powershell
cd backend
python -m venv .venv # only if no environment exists
.venv/Scripts/python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Configure local settings/keys in .env. Do not commit secrets.
$env:DEBUG='True' # local development only; overrides an invalid host DEBUG value
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py seed_prep_content
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8000
```

Use an installed Python interpreter if python is not on PATH; the interpreter used during this task was C:/Users/DELL/AppData/Local/Programs/Python/Python312/python.exe. For enrollment/catalog data, the existing optional seed_courses command creates placeholder prices; do not treat those as approved production fees.

In a separate frontend terminal:

```powershell
cd frontend
npm ci
npm run prep:sync
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/interview-prep/generative-ai/ and compare a partial guide such as /interview-prep/python-full-stack/. Also check the noindex staged guide /interview-prep/aws-developer-associate/ and a generic-only route such as /interview-prep/cissp/. The dev server does not reproduce nginx routing or production prerendered response headers.

For built static output:

```powershell
cd frontend
npm run build
npm run validate
npm run preview -- --host 127.0.0.1
```

Open the printed preview URL and inspect the actual HTML source for metadata and guide content. Blog/store/gigs production SSR and nginx redirects must also be tested through the real Docker/nginx stack; Vite preview is not equivalent.

The custom staff panel retains its existing setup: cd admin-panel, npm ci, npm run dev; open http://127.0.0.1:5174/admin-panel/. Gig moderation deliberately uses Django admin at http://127.0.0.1:8000/admin/gigs/gig/ rather than pretending it is implemented in the custom panel.

## Optional local gigs pilot

Default GIGS_ENABLED=False keeps data routes disabled. To test locally, set GIGS_ENABLED=True in backend/.env and restart Django. The resources menu discovers availability from the backend; refresh the browser after changing the flag. Visit /gigs, register/sign in through the existing account flow, and open /gigs/workspace to create a draft. Submit it for review. A staff account with the relevant Django model permissions can approve it in /admin/gigs/gig/. Use two separate local accounts to verify private proposal visibility and a third to verify access denial. Use fictional QA text and an isolated database; do not copy production customer data.

All pilot public pages remain noindex even when enabled. API responses are no-store. No marketplace payments, escrow, messages, identity verification, proposal acceptance or work contracts are implemented. Keep the flag false in production until the launch decisions in ../marketplace-design.md are resolved.

## Verification commands

```powershell
cd backend
$env:DEBUG='True' # test environment only
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test apps --noinput
.venv/Scripts/python.exe manage.py validate_prep_content generative-ai
.venv/Scripts/python.exe manage.py validate_prep_content --no-run
cd ../frontend
npm run prep:check
npm run build
npm run validate
npm run lint
cd ../admin-panel
npm run build
```

The all-curriculum validator reports existing unfinished lessons. C#/Java practice execution also depends on toolchains not configured in this environment; do not describe those exercises as executed locally. The generator independently excludes the existing placeholder markers from public excerpts.

## Manual release after review

1. Review git diff, all new files, the migration and the content inventory. Complete desktop/mobile/keyboard QA and an nginx configuration check. Take database and media backups using the existing production runbook in DEPLOY.md. Keep GIGS_ENABLED absent or False.
2. Create a branch and push it for review, not directly to main:

```powershell
git switch -c seo-gigs-pilot
git add backend frontend docs
git diff --cached --check
git commit -m "Improve source-backed prep SEO and add gated gigs pilot"
git push -u origin seo-gigs-pilot
```

3. Open a pull request. Require backend-tests, frontend-build and admin-panel-build to pass. Merge only after the owner approves the local result. The existing CI/CD workflow then builds ECR images, deploys the exact commit through SSM and applies migrations. No separate hosting service or Sites deployment is needed.
4. After deployment, verify the following without making test purchases or posting marketplace data:

```powershell
curl.exe -I https://codinghubs.in/interview-prep/generative-ai/
curl.exe -I https://codinghubs.in/interview-prep/python-full-stack/
curl.exe -I https://codinghubs.in/interview-prep/cissp/
curl.exe -I https://codinghubs.in/checkout
curl.exe -I https://codinghubs.in/this-page-does-not-exist
curl.exe https://codinghubs.in/robots.txt
curl.exe https://codinghubs.in/sitemap-index.xml
curl.exe https://codinghubs.in/sitemap.xml
curl.exe https://codinghubs.in/sitemap-content.xml
curl.exe https://codinghubs.in/sitemap-shop.xml
curl.exe https://codinghubs.in/api/gigs/status/
```

Expect public existing pages to load, unknown routes to return 404, checkout to send noindex, and the disabled gig status to return enabled=false. Inspect HTML meta robots for the generic-only prep route; noindex there is an HTML directive. Check eligible alias canonical tags (for example ai-engineering points to ai-engineering-diploma) and confirm aliases/generic-only/thin guides are excluded from the static sitemap. Check http/www redirects reach one canonical URL without chains introduced by these changes.
5. Submit or re-fetch sitemap-index.xml in Search Console (it references all three child sitemaps), inspect representative primary/alias/noindex URLs and monitor errors and conversions. Keep the previous release image SHAs and backups for the existing rollback procedure; no data-destroying down-migration is part of this handoff.
