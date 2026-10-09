#!/usr/bin/env bash
# Restore a gzipped MariaDB dump produced by scripts/backup.sh.
# Usage: ./scripts/restore.sh <backup.sql.gz>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/restore.sh <backup.sql.gz>"
  exit 1
fi

DUMP="$1"
if [[ ! -f "$DUMP" ]]; then
  echo "ERROR: Dump not found: $DUMP"
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing $ENV_FILE"
  exit 1
fi

DB_USER="$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
DB_NAME="$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2-)"

echo "==> Stopping API and worker..."
systemctl --user stop beprepared-api beprepared-worker

echo "==> Restoring $DUMP into $DB_NAME..."
gunzip -c "$DUMP" | podman exec -i beprepared-db mariadb \
  -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

echo "==> Restarting API and worker..."
systemctl --user start beprepared-api beprepared-worker

echo "==> Verifying..."
"$SCRIPT_DIR/status.sh"
echo "==> Restore complete."
