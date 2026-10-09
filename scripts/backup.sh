#!/usr/bin/env bash
# Dump the prod MariaDB database to a gzipped SQL file.
# Reads DB_USER, DB_PASSWORD, and DB_NAME from the repo-root .env.
# Usage: ./scripts/backup.sh [output-dir]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
OUT_DIR="${1:-$PROJECT_ROOT/backups}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing $ENV_FILE"
  exit 1
fi

DB_USER="$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
DB_NAME="$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2-)"

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/backup-${STAMP}.sql.gz"

podman exec beprepared-db mariadb-dump \
  -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" | gzip > "$OUT_FILE"

echo "Wrote $OUT_FILE"
