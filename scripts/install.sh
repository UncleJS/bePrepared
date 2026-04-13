#!/usr/bin/env bash
# install.sh — First-run setup for bePrepared
# Usage: ./scripts/install.sh [--skip-seed]
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
QUADLET_DIR="$HOME/.config/containers/systemd"
ENV_FILE="$DEPLOY_DIR/.env"
SKIP_SEED=false

# ---- Parse args ----
for arg in "$@"; do
  case "$arg" in
    --skip-seed) SKIP_SEED=true ;;
    -h|--help)
      echo "Usage: ./scripts/install.sh [--skip-seed]"
      echo ""
      echo "Options:"
      echo "  --skip-seed   Build and start the pod but do not run db:seed"
      echo "  -h, --help    Show this help message"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "==> bePrepared install.sh"
echo "    Project root : $PROJECT_ROOT"
echo "    Quadlet dir  : $QUADLET_DIR"
echo "    Skip seed    : $SKIP_SEED"
echo ""

# ---- 1. Verify .env exists ----
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "  cp deploy/.env.example deploy/.env"
  echo "  Then edit deploy/.env and set all required values."
  exit 1
fi

# ---- 2. Build container images ----
echo "==> Building container images..."
podman build -f "$DEPLOY_DIR/Containerfile.api"      -t beprepared-api:latest      "$PROJECT_ROOT"
podman build -f "$DEPLOY_DIR/Containerfile.worker"   -t beprepared-worker:latest   "$PROJECT_ROOT"
podman build -f "$DEPLOY_DIR/Containerfile.frontend" -t beprepared-frontend:latest "$PROJECT_ROOT"
echo "==> Images built."

# ---- 3. Install Quadlet unit files ----
echo "==> Installing Quadlet units to $QUADLET_DIR..."
mkdir -p "$QUADLET_DIR"
cp "$DEPLOY_DIR/quadlet/"*.container "$QUADLET_DIR/"
cp "$DEPLOY_DIR/quadlet/"*.volume    "$QUADLET_DIR/"
cp "$DEPLOY_DIR/quadlet/"*.pod       "$QUADLET_DIR/"
echo "==> Units installed."

# ---- 4. Reload systemd ----
echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ---- 5. Start pod + app units ----
echo "==> Starting beprepared units..."
systemctl --user start beprepared-pod beprepared-db beprepared-api beprepared-worker beprepared-frontend

# ---- 6. Wait for MariaDB ----
# We wait for the application user (bpuser) to be able to connect to the
# application database (beprepared).  A simple root ping is not enough —
# MariaDB accepts connections before it has finished running the
# initialization scripts that create the app DB and app user, which causes
# migrations to fail on a fresh first-start.
echo "==> Waiting for MariaDB to initialise (up to 120s)..."
DB_USER="$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
DB_NAME="$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2-)"
for i in $(seq 1 120); do
  if podman exec beprepared-db mariadb -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
       -e "SELECT 1;" 2>/dev/null | grep -q 1; then
    echo "==> MariaDB ready (app user + database verified)."
    break
  fi
  if [[ "$i" -eq 120 ]]; then
    echo "ERROR: MariaDB did not become ready in time."
    echo "  Check logs: journalctl --user -u beprepared-db -n 50"
    exit 1
  fi
  echo "    ...waiting ($i/120)"
  sleep 1
done

# ---- 7. Run migrations ----
echo "==> Running DB migrations..."
"$SCRIPT_DIR/db.sh" migrate

# ---- 8. Run seed (optional) ----
if [[ "$SKIP_SEED" == "false" ]]; then
  echo "==> Running DB seed..."
  "$SCRIPT_DIR/db.sh" seed
else
  echo "==> Skipping DB seed (--skip-seed)."
fi

# ---- 9. Verify ----
echo ""
echo "==> Verifying services..."
"$SCRIPT_DIR/status.sh"
