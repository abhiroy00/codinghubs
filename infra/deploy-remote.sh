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

curl -fsSL "$RAW/docker-compose.prod.yml" -o docker-compose.prod.yml
curl -fsSL "$RAW/infra/fetch-env.sh" -o fetch-env.sh
chmod +x fetch-env.sh
AWS_REGION="$REGION" ./fetch-env.sh

{
  echo "BACKEND_IMAGE=$REGISTRY/codinghubs-backend:$SHA"
  echo "FRONTEND_IMAGE=$REGISTRY/codinghubs-frontend:$SHA"
} >> .env

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans
docker compose -f docker-compose.prod.yml --env-file .env exec -T backend python manage.py migrate --noinput

docker image prune -af --filter "until=72h" || true

echo "deployed $SHA"
