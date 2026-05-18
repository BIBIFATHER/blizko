#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create .env.local or override ENV_FILE=/absolute/path/to/env" >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/with-env.sh <command> [args...]" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

exec "$@"
