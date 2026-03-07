#!/usr/bin/env bash
# restart.sh — Restart the bePrepared pod or a specific service
# Usage: ./scripts/restart.sh [api|worker|frontend|db]
#        No argument restarts the full pod.
# Run from the project root.
set -euo pipefail

VALID_SERVICES=(api worker frontend db)

# ---- Parse args ----
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

if [[ -z "$TARGET" ]]; then
  UNIT="beprepared-pod"
else
  UNIT="beprepared-${TARGET}"
fi

echo "==> Restarting ${UNIT}..."
systemctl --user restart "$UNIT"
echo "==> Restarted: ${UNIT}"
echo "    Run ./scripts/status.sh to verify."
