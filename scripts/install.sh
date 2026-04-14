#!/usr/bin/env bash
# =============================================================================
# install.sh — First-run setup: build images, install units, start, migrate
# =============================================================================
#
# PURPOSE
#   Full first-time installation of the bePrepared prod stack. Builds all three
#   container images from the Containerfiles in deploy/, installs the Quadlet
#   unit files to the systemd user directory, starts the pod, waits for MariaDB
#   to be ready at the application level (not just the root ping), runs Drizzle
#   migrations, optionally seeds reference data, and finally runs status.sh to
#   confirm everything is healthy.
#
#   Run this once on a fresh machine. For subsequent code updates use
#   update.sh; for teardown use uninstall.sh.
#
# PREREQUISITES
#   - Podman installed and configured for rootless operation
#   - systemd user session active (loginctl enable-linger <user> if needed)
#   - .env present at repo root (cp .env.example .env, then set all values)
#   - deploy/Containerfile.{api,worker,frontend} present
#   - deploy/quadlet/*.{container,volume,pod} present
#
# PHASES
#   1. Args          — parse --skip-seed flag; handle -h/--help
#   2. Guards        — verify .env exists; abort early with clear instructions
#   3. Build images  — podman build for api, worker, and frontend
#   4. Quadlet sync  — cp Quadlet unit files to ~/.config/containers/systemd/
#   5. systemd reload — daemon-reload so systemd sees the new units
#   6. Start         — start beprepared-pod and all member services
#   7. DB wait       — poll MariaDB with the app credentials (not just a root
#                      ping) until the app DB and app user are ready
#   8. Migrate       — delegate to db.sh migrate
#   9. Seed          — delegate to db.sh seed (skipped if --skip-seed)
#  10. Verify        — delegate to status.sh
#
# FLAGS / ENV VARS
#   --skip-seed    Build, start, and migrate but skip db:seed
#   -h, --help     Print this help and exit
#
#   DB_USER        Read from .env — used to verify app-level DB connectivity
#   DB_PASSWORD    Read from .env — used to verify app-level DB connectivity
#   DB_NAME        Read from .env — used to verify app-level DB connectivity
#
# USAGE
#   ./scripts/install.sh [--skip-seed]
#
# EXAMPLES
#   ./scripts/install.sh              # full install including seed data
#   ./scripts/install.sh --skip-seed  # install without loading fixtures
#
# Run from the project root.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
QUADLET_DIR="$HOME/.config/containers/systemd"
ENV_FILE="$PROJECT_ROOT/.env"
SKIP_SEED=false

# ── Args ──────────────────────────────────────────────────────────────────────
# Parse flags before doing any work so --help exits cleanly without side effects.

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

# ── Guards ────────────────────────────────────────────────────────────────────
# Verify that the repo-local .env file exists before touching anything else.
# All DB credentials are read from it during the MariaDB-wait phase.

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "  cp .env.example .env"
  echo "  Then edit .env and set all required values."
  exit 1
fi

# ── Build images ──────────────────────────────────────────────────────────────
# Build all three prod container images. The build context is always the repo
# root so COPY directives in the Containerfiles resolve correctly.
#
# VITE_API_URL must be passed as a build-arg so Vite bakes the correct API
# origin into the JS bundle at image build time.  We read it from .env (with a
# safe default of http://localhost:9995) so the value always matches whatever
# the operator has configured.

VITE_API_URL="$(grep '^VITE_API_URL=' "$ENV_FILE" | cut -d= -f2- || true)"
VITE_API_URL="${VITE_API_URL:-http://localhost:9995}"
echo "==> VITE_API_URL=$VITE_API_URL (baked into frontend bundle)"

echo "==> Building container images..."
podman build -f "$DEPLOY_DIR/Containerfile.api"      -t beprepared-api:latest      "$PROJECT_ROOT"
podman build -f "$DEPLOY_DIR/Containerfile.worker"   -t beprepared-worker:latest   "$PROJECT_ROOT"
podman build \
  --build-arg "VITE_API_URL=$VITE_API_URL" \
  -f "$DEPLOY_DIR/Containerfile.frontend" \
  -t beprepared-frontend:latest \
  "$PROJECT_ROOT"
echo "==> Images built."

# ── Quadlet sync ──────────────────────────────────────────────────────────────
# Copy Quadlet unit files from deploy/quadlet/ to the systemd user-unit dir.
# No %%REPO_DIR%% substitution is needed here; prod units reference named
# volumes and the image registry, not bind-mounted source paths.

echo "==> Installing Quadlet units to $QUADLET_DIR..."
mkdir -p "$QUADLET_DIR"
cp "$DEPLOY_DIR/quadlet/"*.container "$QUADLET_DIR/"
cp "$DEPLOY_DIR/quadlet/"*.volume    "$QUADLET_DIR/"
cp "$DEPLOY_DIR/quadlet/"*.pod       "$QUADLET_DIR/"
echo "==> Units installed."

# ── systemd reload ────────────────────────────────────────────────────────────
# Required after adding or modifying unit files so systemd discovers them.

echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ── Start ─────────────────────────────────────────────────────────────────────
# Start the pod and all member services. systemd respects unit dependencies so
# the DB starts before the API and worker.

echo "==> Starting beprepared units..."
systemctl --user start beprepared-pod beprepared-db beprepared-api beprepared-worker beprepared-frontend

# ── DB wait ───────────────────────────────────────────────────────────────────
# Poll using the application DB user (not root) against the application
# database. A simple root ping is not sufficient — MariaDB accepts the root
# connection before it has finished running the init scripts that create the
# app DB and app user, so migrations would fail immediately on a fresh start.

echo "==> Waiting for MariaDB to initialise (up to 120s)..."
DB_USER="$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2- || true)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- || true)"
DB_NAME="$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2- || true)"
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

# ── Migrate ───────────────────────────────────────────────────────────────────
# Apply any pending Drizzle schema migrations. Safe to re-run; already-applied
# migrations are no-ops.

echo "==> Running DB migrations..."
"$SCRIPT_DIR/db.sh" migrate

# ── Seed ──────────────────────────────────────────────────────────────────────
# Load reference / fixture data. Skipped when --skip-seed is passed.
# The seed script itself must be idempotent (INSERT IGNORE / upserts).

if [[ "$SKIP_SEED" == "false" ]]; then
  echo "==> Running DB seed..."
  "$SCRIPT_DIR/db.sh" seed
else
  echo "==> Skipping DB seed (--skip-seed)."
fi

# ── Verify ────────────────────────────────────────────────────────────────────
# Run a quick health check to confirm all services are up and responding.

echo ""
echo "==> Verifying services..."
"$SCRIPT_DIR/status.sh"
