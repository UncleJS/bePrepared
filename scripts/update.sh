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
# Rebuild all three prod images and restart each service as it is built.
# rebuild.sh handles the podman build + systemctl restart loop.

echo "==> Rebuilding all container images..."
"$SCRIPT_DIR/rebuild.sh"
echo ""

# ── Restart ───────────────────────────────────────────────────────────────────
# Perform a full pod restart to ensure all services are running the freshly
# built images and that any inter-service connections are re-established.

echo "==> Restarting full pod..."
"$SCRIPT_DIR/restart.sh"
echo ""

# ── Migrate ───────────────────────────────────────────────────────────────────
# Apply any pending Drizzle migrations against the live database. Idempotent —
# already-applied migrations are detected by the migration table and skipped.

if [[ "$SKIP_MIGRATE" == "false" ]]; then
  echo "==> Running DB migrations..."
  "$SCRIPT_DIR/db.sh" migrate
  echo ""
fi

# ── Verify ────────────────────────────────────────────────────────────────────
# Run a quick health check to confirm all services are up and responding after
# the update. Exits non-zero if any check fails.

echo "==> Running status checks..."
"$SCRIPT_DIR/status.sh"
