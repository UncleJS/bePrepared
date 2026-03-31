#!/usr/bin/env bash
# e2e.sh — Run full Playwright E2E inside beprepared-dev
# Usage: ./scripts/e2e.sh [playwright args...]
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEV_CONTAINER="beprepared-dev"
E2E_DB_CONTAINER="beprepared-e2e-db"

DB_HOST="host.containers.internal"
DB_PORT="13306"
DB_USER="beprepared"
DB_PASSWORD="beprepared"
DB_NAME="beprepared_e2e"
DB_ROOT_PASSWORD="root"

AUTH_SECRET="e2e-auth-secret"
SEED_ADMIN_PASSWORD="e2e-admin-password"
API_PORT="3002"
FRONTEND_PORT="9998"

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/e2e.sh [playwright args...]"
      echo ""
      echo "Runs full E2E setup and Playwright inside beprepared-dev:"
      echo "  1. Start/create beprepared-e2e-db"
      echo "  2. Wait for MariaDB readiness"
      echo "  3. Run migrate + seed inside beprepared-dev"
      echo "  4. Run Playwright tests"
      echo ""
      echo "Examples:"
      echo "  ./scripts/e2e.sh"
      echo "  ./scripts/e2e.sh tests/auth.spec.ts"
      echo "  ./scripts/e2e.sh --grep \"signs in\""
      exit 0
      ;;
  esac
done

echo "==> bePrepared e2e.sh"
echo "    Project root : $PROJECT_ROOT"
echo "    Dev container: $DEV_CONTAINER"
echo "    E2E DB       : $E2E_DB_CONTAINER"
echo ""

if ! podman container exists "$DEV_CONTAINER"; then
  echo "ERROR: $DEV_CONTAINER does not exist."
  echo "  Run ./scripts/install-dev.sh first."
  exit 1
fi

if ! systemctl --user is-active --quiet "$DEV_CONTAINER"; then
  echo "ERROR: systemd unit $DEV_CONTAINER is not active."
  echo "  Run systemctl --user start $DEV_CONTAINER"
  exit 1
fi

if podman container exists "$E2E_DB_CONTAINER"; then
  echo "==> Starting existing E2E DB container..."
  podman start "$E2E_DB_CONTAINER" >/dev/null || true
else
  echo "==> Creating E2E DB container..."
  podman run -d \
    --name "$E2E_DB_CONTAINER" \
    -e MARIADB_DATABASE="$DB_NAME" \
    -e MARIADB_USER="$DB_USER" \
    -e MARIADB_PASSWORD="$DB_PASSWORD" \
    -e MARIADB_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
    -p "$DB_PORT":3306 \
    docker.io/library/mariadb:11 >/dev/null
fi

echo "==> Waiting for E2E MariaDB..."
for i in $(seq 1 60); do
  if podman exec "$E2E_DB_CONTAINER" mariadb-admin ping -h 127.0.0.1 -uroot -p"$DB_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
    echo "==> E2E MariaDB ready."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "ERROR: E2E MariaDB did not become ready in time."
    exit 1
  fi
  sleep 1
done

PLAYWRIGHT_ARGS=()
if [[ "$#" -gt 0 ]]; then
  PLAYWRIGHT_ARGS=("$@")
fi

printf -v PLAYWRIGHT_ARGS_Q '%q ' "${PLAYWRIGHT_ARGS[@]}"

echo "==> Running migrate + seed + Playwright inside $DEV_CONTAINER..."
podman exec "$DEV_CONTAINER" bash -lc "
set -e
cd /workspace
export DB_HOST=$DB_HOST
export DB_PORT=$DB_PORT
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASSWORD
export DB_NAME=$DB_NAME
export AUTH_SECRET=$AUTH_SECRET
export API_AUTH_SECRET=$AUTH_SECRET
export SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD
export API_PORT=$API_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export NEXTAUTH_URL=http://127.0.0.1:$FRONTEND_PORT
export NEXTAUTH_API_URL=http://127.0.0.1:$API_PORT
export NEXT_PUBLIC_API_URL=http://127.0.0.1:$API_PORT
export CORS_ORIGINS=http://127.0.0.1:$FRONTEND_PORT
export NODE_ENV=test
export AUTH_ENABLED=true
export PLAYWRIGHT_HTML_OPEN=never
bun run db:migrate
bun run db:seed
if [ -n \"$PLAYWRIGHT_ARGS_Q\" ]; then
  bun run --cwd e2e test $PLAYWRIGHT_ARGS_Q
else
  bun run test:e2e
fi
"

echo ""
echo "==> E2E run passed."
