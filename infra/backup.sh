#!/bin/bash
# Nightly backup of the production database and uploaded files to S3.
#
# Install on the EC2 host as root (the instance role needs s3:PutObject on the bucket):
#   install -m 755 backup.sh /opt/codinghubs/backup.sh
#   echo '15 2 * * * BACKUP_BUCKET=my-codinghubs-backups /opt/codinghubs/backup.sh >> /var/log/codinghubs-backup.log 2>&1' \
#     | crontab -
#
# Optional: APP_DIR, BACKUP_PREFIX, AWS_REGION, MEDIA_VOLUME, PRIVATE_VOLUME.
set -euo pipefail

: "${BACKUP_BUCKET:?set BACKUP_BUCKET to the destination S3 bucket}"

APP_DIR="${APP_DIR:-/opt/codinghubs}"
PREFIX="${BACKUP_PREFIX:-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE=(docker compose -f "$APP_DIR/docker-compose.prod.yml" --env-file "$APP_DIR/.env")

cd "$APP_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Compose names volumes after the project directory, which is easy to get wrong.
# Ask Docker for the volume that carries the logical name instead.
find_volume() {
  docker volume ls -q --filter "label=com.docker.compose.volume=$1" | head -n 1
}
MEDIA_VOLUME="${MEDIA_VOLUME:-$(find_volume media)}"
PRIVATE_VOLUME="${PRIVATE_VOLUME:-$(find_volume private_media)}"
[ -n "$MEDIA_VOLUME" ] || { echo "could not find the media volume" >&2; exit 1; }

echo "[$STAMP] dumping database"
"${COMPOSE[@]}" exec -T db sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$WORK/db.dump"

echo "[$STAMP] archiving media volume ($MEDIA_VOLUME)"
docker run --rm -v "$MEDIA_VOLUME":/src:ro -v "$WORK":/backup alpine:3.20 \
  tar czf /backup/media.tar.gz -C /src .

if [ -n "$PRIVATE_VOLUME" ]; then
  echo "[$STAMP] archiving private files volume ($PRIVATE_VOLUME)"
  docker run --rm -v "$PRIVATE_VOLUME":/src:ro -v "$WORK":/backup alpine:3.20 \
    tar czf /backup/private-media.tar.gz -C /src .
fi

DEST="s3://$BACKUP_BUCKET/$PREFIX/$STAMP"
echo "[$STAMP] uploading to $DEST"
aws s3 cp --no-progress "$WORK/db.dump" "$DEST/db.dump"
aws s3 cp --no-progress "$WORK/media.tar.gz" "$DEST/media.tar.gz"
if [ -f "$WORK/private-media.tar.gz" ]; then
  aws s3 cp --no-progress "$WORK/private-media.tar.gz" "$DEST/private-media.tar.gz"
fi

echo "[$STAMP] backup complete"
