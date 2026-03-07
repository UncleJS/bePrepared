#!/usr/bin/env bash
# update.sh — Pull latest code, rebuild all images, run migrations, restart, verify
# Usage: ./scripts/update.sh [--skip-pull] [--skip-migrate]
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_PULL=false
SKIP_MIGRATE=false

# ---- Parse args ----
for arg in "$@"; do
  case "$arg" in
    --skip-pull)    SKIP_PULL=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    -h|--help)
      echo "Usage: ./scripts/update.sh [--skip-pull] [--skip-migrate]"
      echo ""
      echo "Options:"
      echo "  --skip-pull      Skip 'git pull' (useful when already on desired commit)"
      echo "  --skip-migrate   Skip running DB migrations after rebuild"
      echo "  -h, --help       Show this help message"
      echo ""
      echo "Steps performed:"
      echo "  1. git pull (unless --skip-pull)"
      echo "  2. Rebuild all container images (api, worker, frontend)"
      echo "  3. Restart all services"
      echo "  4. Run DB migrations (unless --skip-migrate)"
      echo "  5. Run status checks"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "==> bePrepared update.sh"
echo "    Skip pull    : $SKIP_PULL"
echo "    Skip migrate : $SKIP_MIGRATE"
echo ""

# ---- 1. Git pull ----
if [[ "$SKIP_PULL" == "false" ]]; then
  echo "==> Pulling latest code..."
  git -C "$(dirname "$SCRIPT_DIR")" pull
  echo "==> Pull complete."
  echo ""
fi

# ---- 2. Rebuild all images ----
echo "==> Rebuilding all container images..."
"$SCRIPT_DIR/rebuild.sh"
echo ""

# ---- 3. Restart pod ----
echo "==> Restarting full pod..."
"$SCRIPT_DIR/restart.sh"
echo ""

# ---- 4. Run migrations ----
if [[ "$SKIP_MIGRATE" == "false" ]]; then
  echo "==> Running DB migrations..."
  "$SCRIPT_DIR/db.sh" migrate
  echo ""
fi

# ---- 5. Verify ----
echo "==> Running status checks..."
"$SCRIPT_DIR/status.sh"
