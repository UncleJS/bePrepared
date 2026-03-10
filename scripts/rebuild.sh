#!/usr/bin/env bash
# rebuild.sh — Rebuild one or more bePrepared container images and restart services
# Usage: ./scripts/rebuild.sh [api] [worker] [frontend]
#        Defaults to rebuilding all three if no arguments are given.
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"

VALID_SERVICES=(api worker frontend)

# ---- Parse args ----
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    api|worker|frontend) TARGETS+=("$arg") ;;
    -h|--help)
      echo "Usage: ./scripts/rebuild.sh [api] [worker] [frontend]"
      echo ""
      echo "Arguments:"
      echo "  api        Rebuild the API image and restart beprepared-api"
      echo "  worker     Rebuild the worker image and restart beprepared-worker"
      echo "  frontend   Rebuild the frontend image and restart beprepared-frontend"
      echo ""
      echo "  No arguments rebuilds all three services."
      echo ""
      echo "Examples:"
      echo "  ./scripts/rebuild.sh              # rebuild all"
      echo "  ./scripts/rebuild.sh api          # rebuild API only"
      echo "  ./scripts/rebuild.sh api worker   # rebuild API and worker"
      exit 0
      ;;
    *) echo "Unknown argument: $arg (valid: api, worker, frontend)"; exit 1 ;;
  esac
done

# Default to all if no targets specified
if [[ "${#TARGETS[@]}" -eq 0 ]]; then
  TARGETS=("${VALID_SERVICES[@]}")
fi

echo "==> bePrepared rebuild.sh"
echo "    Targets: ${TARGETS[*]}"
echo ""

for svc in "${TARGETS[@]}"; do
  echo "==> Building image: beprepared-${svc}:latest..."
  podman build \
    --format docker \
    -f "$DEPLOY_DIR/Containerfile.${svc}" \
    -t "beprepared-${svc}:latest" \
    "$PROJECT_ROOT"
  echo "==> Image built: beprepared-${svc}:latest"

  echo "==> Restarting service: beprepared-${svc}..."
  systemctl --user restart "beprepared-${svc}"
  echo "==> Restarted: beprepared-${svc}"
  echo ""
done

echo "==> Rebuild complete for: ${TARGETS[*]}"
echo "    Run ./scripts/status.sh to verify."
