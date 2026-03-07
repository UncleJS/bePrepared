#!/usr/bin/env bash
# logs.sh — Tail journalctl logs for bePrepared services
# Usage: ./scripts/logs.sh [api|worker|frontend|db] [journalctl options...]
#        No service argument follows all bePrepared units.
# Run from the project root.
set -euo pipefail

# ---- Parse args ----
SERVICE=""
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    api|worker|frontend|db)
      if [[ -z "$SERVICE" ]]; then
        SERVICE="$arg"
      else
        EXTRA_ARGS+=("$arg")
      fi
      ;;
    -h|--help)
      echo "Usage: ./scripts/logs.sh [api|worker|frontend|db] [journalctl options...]"
      echo ""
      echo "Arguments:"
      echo "  api       Follow logs for beprepared-api"
      echo "  worker    Follow logs for beprepared-worker"
      echo "  frontend  Follow logs for beprepared-frontend"
      echo "  db        Follow logs for beprepared-db"
      echo ""
      echo "  No service argument follows all bePrepared units."
      echo ""
      echo "  Any additional arguments are passed directly to journalctl."
      echo ""
      echo "Examples:"
      echo "  ./scripts/logs.sh                    # follow all units"
      echo "  ./scripts/logs.sh api                # follow API only"
      echo "  ./scripts/logs.sh worker -n 100      # last 100 worker lines"
      echo "  ./scripts/logs.sh api --since today  # API logs since midnight"
      exit 0
      ;;
    *) EXTRA_ARGS+=("$arg") ;;
  esac
done

if [[ -z "$SERVICE" ]]; then
  UNIT_PATTERN="beprepared*"
  echo "==> Following logs for all bePrepared units (Ctrl+C to exit)..."
else
  UNIT_PATTERN="beprepared-${SERVICE}"
  echo "==> Following logs for ${UNIT_PATTERN} (Ctrl+C to exit)..."
fi

# Default to -f (follow) if no extra args supplied
if [[ "${#EXTRA_ARGS[@]}" -eq 0 ]]; then
  EXTRA_ARGS=(-f)
fi

# shellcheck disable=SC2086
exec journalctl --user -u "$UNIT_PATTERN" "${EXTRA_ARGS[@]}"
