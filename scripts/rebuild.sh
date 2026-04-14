#!/usr/bin/env bash
# =============================================================================
# rebuild.sh — Rebuild one or more bePrepared prod container images
# =============================================================================
#
# PURPOSE
#   Rebuilds the Podman container image(s) for the specified service(s) from
#   the Containerfiles in deploy/ and then performs a `systemctl restart` so
#   the new image takes effect immediately. Used after source-code changes that
#   need to be baked into prod images. Does NOT touch the dev stack.
#
# PREREQUISITES
#   - Podman installed and available to the current user
#   - deploy/Containerfile.<service> present for each target
#   - Corresponding systemd unit already installed
#     (./scripts/install.sh on first use)
#
# PHASES
#   1. Args        — parse optional service names, handle -h/--help,
#                    default to all three services when none given
#   2. Build loop  — for each target: podman build → systemctl restart
#
# FLAGS / ENV VARS
#   api        Rebuild deploy/Containerfile.api  → beprepared-api:latest
#   worker     Rebuild deploy/Containerfile.worker → beprepared-worker:latest
#   frontend   Rebuild deploy/Containerfile.frontend → beprepared-frontend:latest
#   (none)     Rebuild all three
#   -h, --help Print this help and exit
#
#   (no env vars — image names and Containerfile paths are derived from service
#   names using a fixed convention)
#
# USAGE
#   ./scripts/rebuild.sh [api] [worker] [frontend]
#
# EXAMPLES
#   ./scripts/rebuild.sh              # rebuild all three images
#   ./scripts/rebuild.sh api          # rebuild API only (faster iteration)
#   ./scripts/rebuild.sh api worker   # rebuild API and worker, skip frontend
#
# Run from the project root.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"

VALID_SERVICES=(api worker frontend)

# ── Args ──────────────────────────────────────────────────────────────────────
# Accumulate service names into TARGETS. Any unrecognised value is a hard error
# so typos don't silently skip the intended service.

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

# Default to all services when no targets were provided on the command line.
if [[ "${#TARGETS[@]}" -eq 0 ]]; then
  TARGETS=("${VALID_SERVICES[@]}")
fi

echo "==> bePrepared rebuild.sh"
echo "    Targets: ${TARGETS[*]}"
echo ""

# ── Build loop ────────────────────────────────────────────────────────────────
# For each target: build the image from its Containerfile, then immediately
# restart the corresponding systemd unit so the new image is used. The loop
# runs sequentially so build logs from different services don't interleave.

for svc in "${TARGETS[@]}"; do
  echo "==> Building image: beprepared-${svc}:latest..."
  podman build \
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
