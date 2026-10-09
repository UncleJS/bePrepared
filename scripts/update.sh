#!/usr/bin/env bash
# =============================================================================
# update.sh — Pull latest code, rebuild images, migrate, restart, verify
# =============================================================================
#
# PURPOSE
#   Standard deployment update workflow for the prod stack. Pulls the latest
#   commit from the current branch, rebuilds all three container images,
#   restarts the pod so the new images take effect, runs any pending DB
#   migrations, and finishes with a status check. Each phase can be skipped
#   independently for manual or partial rollouts.
#
# PREREQUISITES
#   - Stack already installed (./scripts/install.sh run at least once)
#   - Git remote configured and credentials/SSH key in place for git pull
#   - Podman available; systemd user session active
#   - .env present at repo root with correct values
#
# PHASES
#   1. Args      — parse --skip-pull / --skip-migrate flags; handle -h/--help
#   2. Git pull  — git pull in the repo root (skipped with --skip-pull)
#   3. Rebuild   — delegate to rebuild.sh (all three images + restart each)
#   4. Restart   — delegate to restart.sh (full pod restart)
#   5. Migrate   — delegate to db.sh migrate (skipped with --skip-migrate)
#   6. Verify    — delegate to status.sh
#
# FLAGS / ENV VARS
#   --skip-pull      Skip `git pull` — useful when deploying a manually
#                    checked-out commit or testing rebuild in isolation
#   --skip-migrate   Skip DB migrations — use when the update contains no
#                    schema changes and you want a faster rollout
#   -h, --help       Print this help and exit
#
#   (no additional env vars — all config is read by the delegated scripts)
#
# USAGE
#   ./scripts/update.sh [--skip-pull] [--skip-migrate]
#
# EXAMPLES
#   ./scripts/update.sh                          # standard update
#   ./scripts/update.sh --skip-pull              # rebuild without pulling
#   ./scripts/update.sh --skip-migrate           # update with no schema changes
#   ./scripts/update.sh --skip-pull --skip-migrate  # rebuild + restart only
#
# Run from the project root.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
SKIP_PULL=false
SKIP_MIGRATE=false

# ── Args ──────────────────────────────────────────────────────────────────────
# Parse flags before executing any work so --help exits cleanly and flags are
# visible in the summary banner printed before the first phase runs.

for arg in "$@"; do
  case "$arg" in
    --skip-pull)    SKIP_PULL=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    -h|--help)
      echo "Usage: ./scripts/update.sh [--skip-pull] [--skip-migrate]"
      echo ""
      echo "Options:"
      echo "  --skip-pull      Skip 'git pull' (useful when already on desired commit)"
      echo "  --skip-migrate   Skip stopping API/worker and running DB migrations"
      echo "  -h, --help       Show this help message"
      echo ""
      echo "Steps performed:"
      echo "  1. git pull (unless --skip-pull)"
      echo "  2. Split .env into per-service files and sync Quadlet units"
      echo "  3. Rebuild all container images (api, worker, frontend)"
      echo "  4. Stop API/worker, migrate, then restart the pod (unless --skip-migrate)"
      echo "  5. Run status checks (/live and /health)"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "==> bePrepared update.sh"
echo "    Skip pull    : $SKIP_PULL"
echo "    Skip migrate : $SKIP_MIGRATE"
echo ""

# ── Git pull ──────────────────────────────────────────────────────────────────
# Pull the latest commit from the configured remote. Uses `git -C` to ensure
# the pull targets the repo root even if the script is invoked from elsewhere.

if [[ "$SKIP_PULL" == "false" ]]; then
  echo "==> Pulling latest code..."
  git -C "$(dirname "$SCRIPT_DIR")" pull
  echo "==> Pull complete."
  echo ""
fi

# ── Rebuild ───────────────────────────────────────────────────────────────────
# Rebuild all three prod images without restarting. Migrations run before
# the new API and worker accept traffic.

echo "==> Splitting .env into per-service files..."
"$SCRIPT_DIR/split-env.sh"

WORKER_INTERVAL_MS="$(grep '^WORKER_INTERVAL_MS=' "$PROJECT_ROOT/.env" | cut -d= -f2- || true)"
WORKER_INTERVAL_MS="${WORKER_INTERVAL_MS:-900000}"
WORKER_HEALTH_MMIN=$(( (WORKER_INTERVAL_MS * 2 + 59999) / 60000 ))
if [[ "$WORKER_HEALTH_MMIN" -lt 30 ]]; then WORKER_HEALTH_MMIN=30; fi

echo "==> Syncing Quadlet units..."
mkdir -p "$QUADLET_DIR"
for f in "$DEPLOY_DIR/quadlet/"*.container "$DEPLOY_DIR/quadlet/"*.volume "$DEPLOY_DIR/quadlet/"*.pod; do
  dest="${QUADLET_DIR}/$(basename "${f}")"
  sed -e "s|%%REPO_DIR%%|${PROJECT_ROOT}|g" \
      -e "s|%%WORKER_HEALTH_MMIN%%|${WORKER_HEALTH_MMIN}|g" \
      "${f}" > "${dest}"
done
systemctl --user daemon-reload
echo ""

echo "==> Rebuilding all container images (no restart yet)..."
"$SCRIPT_DIR/rebuild.sh" --no-restart
echo ""

# ── Migrate before traffic ────────────────────────────────────────────────────
# Stop API and worker so the new images are not serving against the old schema.
# db.sh migrate uses a one-shot of the new API image when the API unit is down,
# then the pod restart brings API, worker, and frontend up together.

if [[ "$SKIP_MIGRATE" == "false" ]]; then
  echo "==> Stopping API and worker before migrations..."
  systemctl --user stop beprepared-api beprepared-worker
  echo "==> Running DB migrations..."
  "$SCRIPT_DIR/db.sh" migrate
  echo ""
fi

# ── Restart ───────────────────────────────────────────────────────────────────
# Perform a full pod restart to ensure all services are running the freshly
# built images and that any inter-service connections are re-established.

echo "==> Restarting full pod..."
"$SCRIPT_DIR/restart.sh"
echo ""

# ── Verify ────────────────────────────────────────────────────────────────────
# Run a quick health check to confirm all services are up and responding after
# the update. Exits non-zero if any check fails.

echo "==> Running status checks..."
"$SCRIPT_DIR/status.sh"
