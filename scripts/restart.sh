#!/usr/bin/env bash
# =============================================================================
# restart.sh — Restart the bePrepared pod or a single named service
# =============================================================================
#
# PURPOSE
#   Thin wrapper around `systemctl --user restart`. Restarting the pod cycles
#   all services together; restarting a single service (api, worker, frontend,
#   db) leaves the others running. Useful for applying config changes or
#   recovering a crashed service without a full teardown.
#
# PREREQUISITES
#   - Target unit must already be installed and known to systemd
#     (install once with ./scripts/install.sh)
#   - No image rebuild is performed here; use ./scripts/rebuild.sh first if
#     you have changed source code or Containerfiles
#
# PHASES
#   1. Args     — parse optional service name; handle -h/--help
#   2. Restart  — resolve the systemd unit name and call systemctl restart
#
# FLAGS / ENV VARS
#   api        Target beprepared-api
#   worker     Target beprepared-worker
#   frontend   Target beprepared-frontend
#   db         Target beprepared-db
#   (none)     Defaults to the full pod: beprepared-pod
#   -h, --help Print this help and exit
#
#   (no env vars — unit names are fixed by the Quadlet files)
#
# USAGE
#   ./scripts/restart.sh [api|worker|frontend|db]
#
# EXAMPLES
#   ./scripts/restart.sh             # restart full pod (all services)
#   ./scripts/restart.sh api         # restart API container only
#   ./scripts/restart.sh db          # restart database without cycling app tier
#
# Run from the project root.
# =============================================================================
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# Accept an optional service name to narrow the restart target. Defaults to
# the pod when omitted, which restarts every member container.

TARGET=""
for arg in "$@"; do
  case "$arg" in
    api|worker|frontend|db) TARGET="$arg" ;;
    -h|--help)
      echo "Usage: ./scripts/restart.sh [api|worker|frontend|db]"
      echo ""
      echo "Arguments:"
      echo "  api       Restart only beprepared-api"
      echo "  worker    Restart only beprepared-worker"
      echo "  frontend  Restart only beprepared-frontend"
      echo "  db        Restart only beprepared-db"
      echo ""
      echo "  No argument restarts the full pod (beprepared-pod)."
      echo ""
      echo "Examples:"
      echo "  ./scripts/restart.sh           # restart full pod"
      echo "  ./scripts/restart.sh api       # restart API service only"
      exit 0
      ;;
    *) echo "Unknown argument: $arg (valid: api, worker, frontend, db)"; exit 1 ;;
  esac
done

# ── Restart ───────────────────────────────────────────────────────────────────
# Resolve the target to a systemd unit name and issue a restart. systemctl
# handles the stop→start cycle and respects the unit's RestartSec= setting.

if [[ -z "$TARGET" ]]; then
  UNIT="beprepared-pod"
else
  UNIT="beprepared-${TARGET}"
fi

echo "==> Restarting ${UNIT}..."
systemctl --user restart "$UNIT"
echo "==> Restarted: ${UNIT}"
echo "    Run ./scripts/status.sh to verify."
