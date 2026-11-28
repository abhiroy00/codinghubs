#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  echo 'Run uv sync --frozen first. Model installation is a separate explicit step.' >&2
  exit 1
fi
exec .venv/bin/python scripts/services.py start
