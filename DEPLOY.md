# Deployment

**Live now:** https://codinghubs.in — auto-deploys on every push to `main`.
Admin: https://codinghubs.in/admin/ (`admin` / check your password manager —
generated at setup time, not stored in this repo; reset via
`docker compose exec backend python manage.py changepassword admin` over SSM if lost).
Also reachable directly at http://13.236.145.34 (the Elastic IP, HTTP-only —
no TLS cert covers the raw IP, only `codinghubs.in`/`www.codinghubs.in`).

CI/CD is fully automated via GitHub Actions (`.github/workflows/ci.yml`). On every
push to `main`: backend tests run, frontend type-checks and builds, then (only on
`main`) both Docker images are built, pushed to ECR, and deployed to the EC2 host
via SSM — no SSH keys, no long-lived AWS credentials in GitHub (uses OIDC role
assumption, scoped to just this repo + branch).

## Current infrastructure (ap-southeast-2 / Sydney)

| Resource | ID / value |
|---|---|
| EC2 instance | `i-0e1969128b9e39f8a` (t3.micro, Ubuntu 24.04, 20GB gp3 + 2GB swap) |
| Elastic IP | `13.236.145.34` |
| Security group | `sg-0da90e28ae343d40d` — inbound 80/443 only, **no SSH port open** |
| ECR repos | `codinghubs-backend`, `codinghubs-frontend` |
| EC2 IAM role | `codinghubs-ec2-role` — SSM Session Manager, ECR pull, read `/codinghubs/prod/*` SSM params |
| GitHub deploy role | `codinghubs-gha-deploy` — assumed via OIDC, scoped to `ecr:Push*` on the 2 repos above + `ssm:SendCommand` on just this one instance. No standing AWS access keys exist anywhere. |
| App config/secrets | SSM Parameter Store under `/codinghubs/prod/*` (SecureString for secrets) |

There is **no SSH access** to the box by design — everything (including ad-hoc
debugging) goes through `aws ssm send-command` / `aws ssm start-session`, e.g.:

```bash
aws ssm start-session --region ap-southeast-2 --target i-0e1969128b9e39f8a
```

## How a deploy works

1. `docker/build-push-action` builds `backend/Dockerfile` and `frontend/Dockerfile`,
   pushes both tagged `:<git-sha>` and `:latest` to ECR.
2. The workflow calls `aws ssm send-command` targeting the instance, which runs
   [`infra/deploy-remote.sh`](infra/deploy-remote.sh) (fetched fresh from
   `raw.githubusercontent.com` at that commit — the repo is public, so no auth
   needed for this fetch).
3. That script: pulls `docker-compose.prod.yml` + [`infra/fetch-env.sh`](infra/fetch-env.sh)
   for the same commit, runs `fetch-env.sh` (reads `/codinghubs/prod/*` from SSM
   Parameter Store using the **instance's own IAM role** — GitHub Actions never
   sees these secret values), logs into ECR, `docker compose pull && up -d`, then
   runs Django migrations inside the freshly-started backend container.

## Before accepting real payments / going live

1. **Razorpay keys are placeholders.** Replace them:
   ```bash
   aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/RAZORPAY_KEY_ID --type SecureString --value rzp_live_... --overwrite
   aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/RAZORPAY_KEY_SECRET --type SecureString --value ... --overwrite
   aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/RAZORPAY_WEBHOOK_SECRET --type SecureString --value ... --overwrite
   gh variable set VITE_RAZORPAY_KEY_ID --body rzp_live_...
   ```
   Then re-run the deploy (push a commit, or re-run the workflow) so the new
   values get picked up.
2. **Course prices are still placeholders** — see the main README.

## Domain & HTTPS (done)

`codinghubs.in` + `www.codinghubs.in` point at the Elastic IP (A records at the
registrar, Hostinger) and are served over HTTPS with a Let's Encrypt cert.
`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DOMAIN` and `SECURE_SSL_REDIRECT` are
all set in SSM Parameter Store accordingly.

**How HTTPS is set up** — `docker-compose.prod.yml` runs a `certbot` service
(webroot mode) alongside `frontend`/`backend`/`db`. `frontend/nginx.conf` has
two server blocks: port 80 serves `/.well-known/acme-challenge/` for
certificate validation/renewal and redirects everything else to HTTPS; port
443 terminates TLS using the cert at `/etc/letsencrypt/live/codinghubs.in/`
(a volume shared with the certbot container). The certbot service loops
`certbot renew` every 12h — Let's Encrypt certs are valid 90 days, so this
keeps it current automatically; nothing to do manually.

**If the instance is ever recreated from scratch**, the 443 server block in
`nginx.conf` references cert files that won't exist yet — nginx will fail to
start if deployed as-is. Bring it up in two stages like the first time:
1. Deploy with only the port-80 block + ACME location (no 443/ssl_certificate
   lines) so nginx starts cleanly and can serve the HTTP-01 challenge.
2. Run the cert issuance once:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env run --rm \
     --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
     -d codinghubs.in -d www.codinghubs.in \
     --email info@codingnowai.in --agree-tos --no-eff-email --non-interactive
   ```
   (`--entrypoint certbot` is required — the `certbot` service's default
   entrypoint is the renewal loop, which otherwise swallows this command and
   runs forever instead of issuing the cert and exiting.)
3. Only then deploy the full `nginx.conf` with the 443 block.

## Admin panel (`/admin-panel`)

Code layout: the React app lives in its own top-level folder `admin-panel/` (separate `package.json`, Vite `base: /admin-panel/`; `cd admin-panel && npm ci && npm run dev` on port 5174). The frontend Dockerfile builds it and copies it into the same nginx image under `/admin-panel/` (build context is the repo root). The API is the Django app `backend/apps/adminpanel/` (`/api/admin/*`), which has to stay inside the backend package.

A custom staff dashboard: overview chart, leads (search, filters, status, notes, CSV export,
call/WhatsApp links), enrollments, orders, users and a course on/off switch. It talks to
`/api/admin/*`, which only accepts logged-in **staff** users (login throttled to 5/min).

The login is created on every deploy by `manage.py ensure_admin` (called from
`infra/deploy-remote.sh`) from two SSM SecureString parameters — **never put the
password in the repo**:

```bash
aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/ADMIN_EMAIL --type SecureString --value <email> --overwrite
aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/ADMIN_PASSWORD --type SecureString --value '<password>' --overwrite
```

Then push/re-run the deploy. To change the password later, overwrite `ADMIN_PASSWORD` and
redeploy. With the parameters unset the command does nothing.

### Admin subdomain (`admin.codinghubs.in`)

nginx already answers for `admin.<DOMAIN>` (it opens straight on `/admin-panel`). One-time setup,
in this order:

1. **DNS (Hostinger):** add an `A` record `admin` → `13.236.145.34`.
2. **Django host:** add the name to `ALLOWED_HOSTS` in SSM (read the current value first, then append):
   ```bash
   aws ssm get-parameter --region ap-southeast-2 --name /codinghubs/prod/ALLOWED_HOSTS --with-decryption --query Parameter.Value --output text
   aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/ALLOWED_HOSTS --type SecureString --overwrite --value '<current>,admin.codinghubs.in'
   ```
3. **Certificate** (after DNS resolves; run on the instance via SSM): extend the existing cert so it also covers the subdomain, then reload nginx:
   ```bash
   cd /opt/codinghubs
   docker compose -f docker-compose.prod.yml --env-file .env run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
     -d codinghubs.in -d www.codinghubs.in -d admin.codinghubs.in --expand \
     --email info@codingnowai.in --agree-tos --no-eff-email --non-interactive
   docker compose -f docker-compose.prod.yml --env-file .env exec frontend nginx -s reload
   ```
4. Re-deploy once so the backend picks up the new `ALLOWED_HOSTS`, then open https://admin.codinghubs.in.

## SEO routing (nginx) — read before deploying `nginx.conf` changes

`frontend/nginx.conf` maps clean URLs to prerendered files (`/` → `home.html`, `/faq` → `faq.html`,
`/program/<slug>` → `program/<slug>.html`, `/locations/**` → directory `index.html`) and returns a real `404` for
anything else; login/register/dashboard/checkout get the `noindex` SPA shell; `/admin-panel/` is served by its own app with `noindex`. `www.<domain>` 301s to the
apex, which needs the existing certificate to include `www` (it does if it was issued with `-d www.codinghubs.in`).
After deploy verify with `curl -I` (see the checklist in [SEO.md](SEO.md)). `http2 on;` needs nginx ≥ 1.25.1 (image is 1.27).

## Cost

Roughly $8–15/month: t3.micro on-demand (~$7.50/mo in ap-southeast-2) + 20GB gp3
EBS (~$1.60/mo) + Elastic IP (free while attached to a running instance) + ECR
storage (a few cents). No RDS, no load balancer, no NAT gateway.


## Blog and case studies (CMS)

Content lives in the database and is managed in the admin panel (`/admin-panel/blogs`, `/admin-panel/case-studies`,
`/admin-panel/taxonomy`, overview at `/admin-panel/content`). Staff accounts need the Django model permissions
`content.add_*`, `change_*`, `delete_*` (superusers, such as the one `ensure_admin` creates, have all of them).

**How pages are served.** The site is a static single-page app, so it cannot know database content at build time. nginx
therefore hands `/blog`, `/blog/<slug>`, `/case-studies`, `/case-studies/<slug>` and `/sitemap-content.xml` to Django
(`apps/content/ssr.py`), which returns real HTML (title, description, canonical, Open Graph, JSON-LD, article text) inside the
app shell (`content-shell.html`, fetched from the frontend container on the internal port 8081, never published). React then
takes over in the browser. Unknown slugs return a real 404; drafts/previews are `noindex` and never cached.

**TinyMCE.** Get a key at <https://www.tiny.cloud/>, restrict it to `codinghubs.in` and `admin.codinghubs.in`, then set the
GitHub repository variable `VITE_TINYMCE_API_KEY` (it is a client-side key, not a secret) and redeploy. For local builds:
`admin-panel/.env.local` with `VITE_TINYMCE_API_KEY=...`. Without it the editor shows a plain HTML box. The free Cloud plan
keeps the "Powered by Tiny" notice; paid plugins (e.g. Premium) are not used.

**Images.** Uploaded through `POST /api/admin/media/` (JPEG/PNG/WebP/GIF, max 5 MB, decoded and re-encoded, random file names)
into `MEDIA_ROOT` (`/app/media`, the docker volume `media`, shared read-only with nginx which serves `/media/`). The volume
lives on the EC2 disk: back it up with the database (e.g. `docker run --rm -v codinghubs_media:/m -v $PWD:/b alpine tar czf /b/media.tgz -C /m .`),
or move to S3 later (a Django storage backend; nothing else depends on the path).

**Scheduling.** A post with status *scheduled* is public as soon as its publish time has passed: the check happens on every
request (no worker, nothing to keep running), so a restart cannot make it miss. The sitemap (`/sitemap-content.xml`, listed in
`robots.txt` next to `/sitemap.xml`) is generated per request from the same rule, so publish/unpublish is reflected at once.

**Backups.** The database (posts, revisions, redirects) and the `media` volume. Revisions keep the last 20 versions of each post;
renamed public slugs are kept as 301 redirects in `SlugRedirect`.

**Environment.** `SITE_URL`, `MEDIA_ROOT`, `FRONTEND_SHELL_URL` (set by `docker-compose.prod.yml`), `VITE_TINYMCE_API_KEY` (build).
First admin: see "Admin panel" above (`ensure_admin`, credentials from SSM, no default password).

**Local development.** Backend: `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`.
Frontend: `cd frontend && npm run dev` (React fetches the API; the server-rendered HTML needs the built shell, see below).
Admin: `cd admin-panel && npm run dev` (port 5174, `/admin-panel/`). To see the server-rendered pages locally, `npm run build` the
frontend and point `FRONTEND_SHELL_URL` at a server that returns `dist/content-shell.html`.
