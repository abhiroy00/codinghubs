#!/bin/bash
# Runs ON the EC2 host, invoked by the CD workflow via `aws ssm send-command`:
#   curl -fsSL https://raw.githubusercontent.com/abhiroy00/codinghubs/$SHA/infra/deploy-remote.sh | bash -s -- $SHA
set -euo pipefail

SHA="${1:?usage: deploy-remote.sh <git-sha>}"
REPO=abhiroy00/codinghubs
RAW="https://raw.githubusercontent.com/$REPO/$SHA"
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

curl -fsSL "$RAW/docker-compose.prod.yml" -o docker-compose.prod.yml
curl -fsSL "$RAW/infra/fetch-env.sh" -o fetch-env.sh
chmod +x fetch-env.sh
AWS_REGION="$REGION" ./fetch-env.sh

{
  echo "BACKEND_IMAGE=$REGISTRY/codinghubs-backend:$SHA"
  echo "FRONTEND_IMAGE=$REGISTRY/codinghubs-frontend:$SHA"
} >> .env

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

$COMPOSE pull
$COMPOSE up -d --remove-orphans
# the container applies migrations itself on start; wait until it is really up before running commands in it
for i in $(seq 1 60); do
  if $COMPOSE exec -T backend python manage.py check >/dev/null 2>&1; then break; fi
  echo "waiting for the backend container ($i)"; sleep 3
done
$COMPOSE exec -T backend python manage.py migrate --noinput
# Creates/updates the admin-panel login from ADMIN_EMAIL / ADMIN_PASSWORD (SSM params); no-op when they are unset.
$COMPOSE exec -T backend python manage.py ensure_admin


echo "deployed $SHA"
