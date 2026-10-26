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

## Cost

Roughly $8–15/month: t3.micro on-demand (~$7.50/mo in ap-southeast-2) + 20GB gp3
EBS (~$1.60/mo) + Elastic IP (free while attached to a running instance) + ECR
storage (a few cents). No RDS, no load balancer, no NAT gateway.
