#!/usr/bin/env bash
# dev.sh — rebuild and restart the bePrepared dev stack.
# Run from the repo root: ./dev.sh
set -euo pipefail

PROJECT_NAME="beprepared"
STALE_ENV="${HOME}/.config/containers/systemd/${PROJECT_NAME}.env"

# Guard 1: repo-local .env must exist
if [[ ! -f .env ]]; then
  echo "ERROR: Missing repo-local .env"
  echo "  Run: cp .env.example .env  (then fill in real values)"
  exit 1
fi

# Guard 2: stale host-level env file must not exist
if [[ -f "${STALE_ENV}" ]]; then
  echo "ERROR: Stale host env file detected: ${STALE_ENV}"
  echo "  Remove it: rm \"${STALE_ENV}\""
  exit 1
fi

echo "→ Syncing quadlet files..."
cp .quadlet/*.container .quadlet/*.pod .quadlet/*.volume \
   ~/.config/containers/systemd/ 2>/dev/null || true
systemctl --user daemon-reload

echo "→ Building dev container image..."
podman build -f Containerfile.dev -t "${PROJECT_NAME}-dev:latest" .

echo "→ Restarting dev stack (pod → db → workspace)..."
systemctl --user stop "${PROJECT_NAME}-dev" "${PROJECT_NAME}-dev-db" "${PROJECT_NAME}-dev-pod-pod" 2>/dev/null || true
podman pod rm -f "${PROJECT_NAME}-dev" 2>/dev/null || true
systemctl --user reset-failed "${PROJECT_NAME}-dev-pod-pod.service" 2>/dev/null || true
systemctl --user start "${PROJECT_NAME}-dev-pod-pod"
sleep 2
systemctl --user start "${PROJECT_NAME}-dev-db"
sleep 5
systemctl --user start "${PROJECT_NAME}-dev"

echo "✓ Dev container rebuilt and restarted."
echo ""
echo "Exec commands:"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run dev:api"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run dev:frontend"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run dev:worker"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run db:migrate"
echo "  podman exec -it ${PROJECT_NAME}-dev bun test"
