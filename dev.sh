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

echo "→ Waiting for dev servers to start (checking host ports 9996 + 9997)..."
TIMEOUT=90
ELAPSED=0
until bash -c "echo >/dev/tcp/localhost/9996" 2>/dev/null && bash -c "echo >/dev/tcp/localhost/9997" 2>/dev/null; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  if [[ ${ELAPSED} -ge ${TIMEOUT} ]]; then
    echo "⚠ Servers did not respond within ${TIMEOUT}s — check logs:"
    echo "  podman logs -f ${PROJECT_NAME}-dev"
    break
  fi
  echo "  ... waiting (${ELAPSED}s)"
done

echo ""
echo "✓ Dev stack is up!"
echo ""
echo "  Frontend  → http://localhost:9997"
echo "  API       → http://localhost:9996"
echo "  Swagger   → http://localhost:9996/docs"
echo ""
echo "Useful commands:"
echo "  podman logs -f ${PROJECT_NAME}-dev"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run db:migrate"
echo "  podman exec -it ${PROJECT_NAME}-dev bun run db:seed"
echo "  podman exec -it ${PROJECT_NAME}-dev bun test"
