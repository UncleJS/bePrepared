#!/usr/bin/env bash
# dev-validate.sh — Run containerized validation inside beprepared-dev
# Usage: ./scripts/dev-validate.sh
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="beprepared-dev"

echo "==> bePrepared dev-validate.sh"
echo "    Project root : $PROJECT_ROOT"
echo "    Container    : $CONTAINER_NAME"
echo ""

if ! podman container exists "$CONTAINER_NAME"; then
  echo "ERROR: $CONTAINER_NAME does not exist."
  echo "  Run ./scripts/install-dev.sh first."
  exit 1
fi

if ! systemctl --user is-active --quiet "$CONTAINER_NAME"; then
  echo "ERROR: systemd unit $CONTAINER_NAME is not active."
  echo "  Run systemctl --user start $CONTAINER_NAME"
  exit 1
fi

run_in_dev() {
  local label="$1"
  local cmd="$2"
  echo "==> $label"
  podman exec "$CONTAINER_NAME" bash -lc "cd /workspace && $cmd"
  echo ""
}

run_in_dev "Typecheck" "bun run typecheck"
run_in_dev "Lint" "bun run lint"
run_in_dev "Workspace tests" "bun run test"

if podman exec "$CONTAINER_NAME" bash -lc "cd /workspace/worker && rg -q '\\.(test|spec)\\.(ts|tsx|js|jsx)$|_test_|_spec_' ."; then
  run_in_dev "Worker tests" "bun run --cwd worker test"
else
  echo "==> Worker tests"
  echo "Skipping worker tests: no matching test files found."
  echo ""
fi

run_in_dev "API build" "bun run build:api"
run_in_dev "Frontend build" "bun run build:frontend"

echo "==> Dev validation passed."
