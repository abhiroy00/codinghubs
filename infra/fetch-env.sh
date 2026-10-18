#!/bin/bash
# Pulls /codinghubs/prod/* from SSM Parameter Store and writes /opt/codinghubs/.env.
# Runs ON the EC2 host (via the instance's own IAM role), never in CI — the
# deploy workflow has no read access to these parameter values, only
# permission to tell the instance to run this script.
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
OUT=/opt/codinghubs/.env

aws ssm get-parameters-by-path \
  --region "$REGION" \
  --path /codinghubs/prod \
  --with-decryption \
  --query 'Parameters[].[Name,Value]' \
  --output text \
| awk -F'\t' '{split($1,a,"/"); print a[4]"="$2}' > "$OUT"

chmod 600 "$OUT"
echo "wrote $(wc -l < "$OUT") vars to $OUT"
