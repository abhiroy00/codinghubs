# Deployment

**Live now:** http://13.236.145.34 — auto-deploys on every push to `main`.
Admin: http://13.236.145.34/admin/ (`admin` / check your password manager —
generated at setup time, not stored in this repo; reset via
`docker compose exec backend python manage.py changepassword admin` over SSM if lost).

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
3. **Point your domain at it** once you share which domain + DNS provider you're
   using:
   - Add an **A record** for your domain (or subdomain) → `13.236.145.34`.
   - Update these SSM params to the real domain, then redeploy:
     ```bash
     aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/ALLOWED_HOSTS --type String --value "your-domain.com,13.236.145.34" --overwrite
     aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/CORS_ALLOWED_ORIGINS --type String --value "https://your-domain.com" --overwrite
     aws ssm put-parameter --region ap-southeast-2 --name /codinghubs/prod/DOMAIN --type String --value "your-domain.com" --overwrite
     ```
   - Add HTTPS: easiest path is adding a `certbot` container (webroot or DNS
     challenge) to `docker-compose.prod.yml` and a port-443 server block to
     `frontend/nginx.conf`, or put an AWS ALB + ACM certificate in front of the
     instance instead. Not wired up yet — ask and this can be added.
   - Once HTTPS is live, flip `SECURE_SSL_REDIRECT` to `True` in SSM and redeploy.

## Cost

Roughly $8–15/month: t3.micro on-demand (~$7.50/mo in ap-southeast-2) + 20GB gp3
EBS (~$1.60/mo) + Elastic IP (free while attached to a running instance) + ECR
storage (a few cents). No RDS, no load balancer, no NAT gateway.
