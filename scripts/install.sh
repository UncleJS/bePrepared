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

# ---- 2. Create named volume for MariaDB data ----
echo "==> Creating named volume: beprepared-db..."
podman volume create beprepared-db 2>/dev/null || true
echo "    Mount: $(podman volume inspect beprepared-db --format '{{.Mountpoint}}')"

# ---- 3. Build container images ----
echo "==> Building container images..."
podman build --format docker -f "$DEPLOY_DIR/Containerfile.api"      -t beprepared-api:latest      "$PROJECT_ROOT"
podman build --format docker -f "$DEPLOY_DIR/Containerfile.worker"   -t beprepared-worker:latest   "$PROJECT_ROOT"
podman build --format docker -f "$DEPLOY_DIR/Containerfile.frontend" -t beprepared-frontend:latest "$PROJECT_ROOT"
echo "==> Images built."

# ---- 4. Install Quadlet unit files ----
echo "==> Installing Quadlet units to $QUADLET_DIR..."
mkdir -p "$QUADLET_DIR"
cp "$DEPLOY_DIR/quadlet/"*.container "$QUADLET_DIR/"
cp "$DEPLOY_DIR/quadlet/"*.pod       "$QUADLET_DIR/"
echo "==> Units installed."

# ---- 5. Reload systemd ----
echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ---- 6. Start pod ----
echo "==> Starting beprepared-pod..."
systemctl --user start beprepared-pod

# ---- 7. Wait for MariaDB ----
echo "==> Waiting for MariaDB to initialise (up to 60s)..."
DB_ROOT_PASSWORD="$(grep '^DB_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
for i in $(seq 1 60); do
  if podman exec beprepared-db mariadb-admin ping -u root -p"$DB_ROOT_PASSWORD" --silent 2>/dev/null; then
    echo "==> MariaDB ready."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "ERROR: MariaDB did not become ready in time."
    echo "  Check logs: journalctl --user -u beprepared-db -n 50"
    exit 1
  fi
  echo "    ...waiting ($i/60)"
  sleep 1
done

# ---- 8. Run migrations ----
echo "==> Running DB migrations..."
podman exec beprepared-api bun run db:migrate

# ---- 9. Run seed (optional) ----
if [[ "$SKIP_SEED" == "false" ]]; then
  echo "==> Running DB seed..."
  podman exec beprepared-api bun run db:seed
else
  echo "==> Skipping DB seed (--skip-seed)."
fi

# ---- 10. Verify ----
echo ""
echo "==> Verifying services..."
"$SCRIPT_DIR/status.sh"
