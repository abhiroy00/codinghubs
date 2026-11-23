#!/bin/bash
# Runs ON the EC2 host, invoked by the CD workflow via `aws ssm send-command`:
#   curl -fsSL https://raw.githubusercontent.com/abhiroy00/codinghubs/$SHA/infra/deploy-remote.sh | bash -s -- $SHA
set -euo pipefail

SHA="${1:?usage: deploy-remote.sh <git-sha>}"
REPO=abhiroy00/codinghubs
RAW="https://raw.githubusercontent.com/$REPO/$SHA"
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
REGION="${AWS_REGION:-ap-southeast-2}"
ACCOUNT_ID=982408502277
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

mkdir -p /opt/codinghubs
cd /opt/codinghubs

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
on_error() {
  echo "!! deploy failed at line $1"
  df -h / | tail -1 || true
  $COMPOSE ps || true
  $COMPOSE logs --tail 60 backend frontend || true
}
trap 'on_error $LINENO' ERR

# A small server fills up with old images after many deploys, and a full disk makes `pull` fail or hang.
echo "== disk before"; df -h / | tail -1; docker system df || true
docker container prune -f || true
docker image prune -af || true   # unused images only: the running containers keep theirs
docker builder prune -af || true
journalctl --vacuum-size=100M >/dev/null 2>&1 || true
echo "== disk after"; df -h / | tail -1

if [ -f "$SOURCE_DIR/docker-compose.prod.yml" ] && [ -f "$SOURCE_DIR/infra/fetch-env.sh" ]; then
  cp "$SOURCE_DIR/docker-compose.prod.yml" docker-compose.prod.yml
  cp "$SOURCE_DIR/infra/fetch-env.sh" fetch-env.sh
else
  curl -fsSL "$RAW/docker-compose.prod.yml" -o docker-compose.prod.yml
  curl -fsSL "$RAW/infra/fetch-env.sh" -o fetch-env.sh
fi
chmod +x fetch-env.sh
AWS_REGION="$REGION" ./fetch-env.sh

{
  echo "BACKEND_IMAGE=$REGISTRY/codinghubs-backend:$SHA"
  echo "FRONTEND_IMAGE=$REGISTRY/codinghubs-frontend:$SHA"
  echo "RELEASE_SHA=$SHA"
} >> .env

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

$COMPOSE pull
# A verified, private database archive must exist before startup can run schema migrations.
# Keep it on the host independently of container replacement or image pruning.
DB_ID=$($COMPOSE ps -q db)
RETAINED_BASELINE=''
if [ -n "$DB_ID" ]; then
  umask 077
  BACKUP_DIR=/opt/codinghubs/backups
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/before-$SHA-$(date -u +%Y%m%dT%H%M%SZ).dump"
  $COMPOSE exec -T db sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$BACKUP_FILE.partial"
  test -s "$BACKUP_FILE.partial"
  $COMPOSE exec -T db pg_restore --list < "$BACKUP_FILE.partial" > /dev/null
  mv "$BACKUP_FILE.partial" "$BACKUP_FILE"
  echo "Verified pre-migration database backup: $BACKUP_FILE"
  sha256sum "$BACKUP_FILE"
  if [ -n "$($COMPOSE ps -q backend)" ]; then
    RETAINED_BASELINE=$($COMPOSE exec -T backend python manage.py shell -v 0 -c 'import json; from django.apps import apps; names = [("accounts", "User"), ("courses", "Course"), ("enrollments", "Enrollment"), ("payments", "Order"), ("shop", "Project"), ("shop", "ProjectGuide"), ("shop", "DigitalAsset")]; print(json.dumps({a + "." + m: apps.get_model(a, m).objects.count() for a, m in names}))')
    echo "Retained record baseline: $RETAINED_BASELINE"
  fi
else
  echo 'Initial database setup: no existing database container to back up.'
fi
$COMPOSE up -d --remove-orphans
# The entrypoint migrates before starting Gunicorn. A Django `check` can finish
# while those migrations are still running, so wait for the HTTP health check.
BACKEND_READY=false
for i in $(seq 1 60); do
  BACKEND_ID=$($COMPOSE ps -q backend)
  if [ -n "$BACKEND_ID" ] && [ "$(docker inspect --format '{{.State.Health.Status}}' "$BACKEND_ID" 2>/dev/null || true)" = healthy ]; then
    BACKEND_READY=true
    break
  fi
  echo "waiting for the backend container ($i)"; sleep 3
done
if [ "$BACKEND_READY" != true ]; then
  echo 'Backend did not become healthy after startup migrations.'
  exit 1
fi
if [ -n "$RETAINED_BASELINE" ]; then
  $COMPOSE exec -T backend python manage.py verify_store_retirement --baseline-json "$RETAINED_BASELINE"
else
  $COMPOSE exec -T backend python manage.py verify_store_retirement
fi
# Creates/updates the admin-panel login from ADMIN_EMAIL / ADMIN_PASSWORD (SSM params); no-op when they are unset.
$COMPOSE exec -T backend python manage.py ensure_admin
$COMPOSE exec -T backend python manage.py seed_interview_questions
$COMPOSE exec -T backend python manage.py seed_prep_content
$COMPOSE exec -T backend python manage.py seed_academy
$COMPOSE exec -T backend python manage.py seed_genai_lessons
$COMPOSE exec -T backend python manage.py seed_genai_pilot
$COMPOSE --profile learning up -d learning-worker
$COMPOSE --profile jobs up -d jobs-worker


echo "deployed $SHA"
