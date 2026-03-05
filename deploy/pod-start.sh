#!/usr/bin/env bash
# pod-start.sh — First-run helper for bePrepared Podman pod
# Run from the project root: ./deploy/pod-start.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
DATA_DIR="$HOME/bePrepared/data/mariadb"
ENV_FILE="$SCRIPT_DIR/.env"

echo "==> bePrepared pod-start.sh"
echo "    Project root : $PROJECT_ROOT"
echo "    Quadlet dir  : $QUADLET_DIR"

# ---- 1. Verify .env exists ----
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "  Copy deploy/.env.example to deploy/.env and fill in values."
  exit 1
fi

# ---- 2. Create data directory ----
mkdir -p "$DATA_DIR"
echo "==> Data directory: $DATA_DIR"

# ---- 3. Build images (if not already built) ----
echo "==> Building container images..."
podman build -f "$SCRIPT_DIR/Containerfile.api"      -t beprepared-api:latest      "$PROJECT_ROOT"
podman build -f "$SCRIPT_DIR/Containerfile.worker"   -t beprepared-worker:latest   "$PROJECT_ROOT"
podman build -f "$SCRIPT_DIR/Containerfile.frontend" -t beprepared-frontend:latest "$PROJECT_ROOT"
echo "==> Images built."

# ---- 4. Install Quadlet unit files ----
echo "==> Installing Quadlet units..."
mkdir -p "$QUADLET_DIR"
cp "$SCRIPT_DIR/quadlet/"*.container "$QUADLET_DIR/"
cp "$SCRIPT_DIR/quadlet/"*.pod       "$QUADLET_DIR/"
echo "==> Units installed to $QUADLET_DIR"

# ---- 5. Reload systemd ----
echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ---- 6. Start pod ----
echo "==> Starting beprepared-pod..."
systemctl --user start beprepared-pod

# ---- 7. Wait for MariaDB to become ready ----
echo "==> Waiting for MariaDB to initialise (up to 30s)..."
for i in $(seq 1 30); do
  if podman exec beprepared-db mariadb-admin ping -u root -p"$(grep DB_ROOT_PASSWORD "$ENV_FILE" | cut -d= -f2)" --silent 2>/dev/null; then
    echo "==> MariaDB ready."
    break
  fi
  echo "    ...waiting ($i/30)"
  sleep 1
done

# ---- 8. Run migrations + seed ----
echo "==> Running DB migrations..."
podman exec beprepared-api bun run db:migrate

echo "==> Running seed data..."
podman exec beprepared-api bun run db:seed

# ---- 9. Verify ----
echo ""
echo "==> Verifying services..."
systemctl --user is-active beprepared-api        && echo "  API:        OK" || echo "  API:        FAILED"
systemctl --user is-active beprepared-worker     && echo "  Worker:     OK" || echo "  Worker:     FAILED"
systemctl --user is-active beprepared-frontend   && echo "  Frontend:   OK" || echo "  Frontend:   FAILED"

echo ""
echo "==> bePrepared is running!"
echo "    Frontend:   http://localhost:9999"
echo "    API:        http://localhost:3001  (internal)"
echo "    Swagger:    http://localhost:3001/docs (internal)"
echo ""
echo "    Logs:  journalctl --user -u 'beprepared*' -f"
echo "    Stop:  systemctl --user stop beprepared-pod"
