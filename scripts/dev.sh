#!/usr/bin/env bash
# =============================================================================
# dev.sh — Rebuild and restart the bePrepared dev stack
# =============================================================================
#
# PURPOSE
#   Single-command dev loop. Syncs Quadlet unit files, rebuilds the dev
#   container image from Containerfile.dev, tears down any running dev stack,
#   starts everything back up (pod → db → workspace), then blocks until both
#   the API (port 9996) and the frontend (port 9997) are accepting TCP
#   connections.
#
#   This is the only script needed during day-to-day development. Never run
#   this against prod containers — see deploy/ and scripts/rebuild.sh for prod.
#
# PREREQUISITES
#   - Podman installed and configured for rootless operation
#   - systemd user session active (loginctl enable-linger <user> if needed)
#   - .env present at repo root (cp .env.example .env, then fill in values)
#   - .quadlet/ unit files present in the repo root
#
# PHASES
#   1. Guards        — verify .env exists; abort if a stale host-level env file
#                      is detected at ~/.config/containers/systemd/<name>.env
#   2. Quadlet sync  — expand %%REPO_DIR%% in each unit file and copy to
#                      ~/.config/containers/systemd/; daemon-reload
#   3. Build         — podman build Containerfile.dev → beprepared-dev:latest
#   4. Restart       — stop existing units, remove stale pod, reset failed
#                      state, then start: pod → db (sleep 5 s) → workspace
#   5. Health wait   — poll TCP ports 9996 and 9997 until both answer or
#                      TIMEOUT (90 s) expires
#
# FLAGS / ENV VARS
#   (no CLI flags — this script always performs a full rebuild + restart)
#
#   PROJECT_NAME   Internal variable; set to "beprepared". Change only if the
#                  project is forked under a different name.
#   STALE_ENV      Path checked for existence:
#                  ~/.config/containers/systemd/<PROJECT_NAME>.env
#                  If found the script aborts — remove it and use repo .env.
#
# USAGE
#   ./scripts/dev.sh
#
# EXAMPLES
#   ./scripts/dev.sh                  # standard dev rebuild + restart
#
# Related files
#   Containerfile.dev           Image built in phase 3
#   scripts/start-dev.sh        Container entrypoint: migrate, seed, servers
#   .quadlet/                   Quadlet unit sources synced in phase 2
#   .env                        Runtime secrets and config (never committed)
#
# Run from the project root.
# =============================================================================

set -euo pipefail

PROJECT_NAME="beprepared"
STALE_ENV="${HOME}/.config/containers/systemd/${PROJECT_NAME}.env"

# ── Guards ────────────────────────────────────────────────────────────────────
# Fail immediately on any configuration that would cause a silent or hard-to-
# debug failure later in the script.
#
# 1. Repo-local .env — all runtime config must live here, never in a host-level
#    system env file.
# 2. Stale host env — a leftover ~/.config/containers/systemd/<name>.env from
#    an older setup would shadow the repo-local .env and cause silent
#    misconfiguration.

if [[ ! -f .env ]]; then
  echo "ERROR: Missing repo-local .env"
  echo "  Run: cp .env.example .env  (then fill in real values)"
  exit 1
fi

if [[ -f "${STALE_ENV}" ]]; then
  echo "ERROR: Stale host env file detected: ${STALE_ENV}"
  echo "  This file shadows the repo-local .env and must be removed."
  echo "  Remove it: rm \"${STALE_ENV}\""
  exit 1
fi

# ── Quadlet sync ──────────────────────────────────────────────────────────────
# Copy each .quadlet/ source file to the systemd user-unit directory, replacing
# the %%REPO_DIR%% placeholder with the real absolute path. This makes the
# EnvironmentFile= directive portable across different clone locations.
# A daemon-reload is required for systemd to pick up additions or changes.

echo "→ Syncing quadlet files..."
REPO_DIR="$(pwd)"
for f in .quadlet/*.container .quadlet/*.pod .quadlet/*.volume; do
  dest="${HOME}/.config/containers/systemd/$(basename "${f}")"
  sed "s|%%REPO_DIR%%|${REPO_DIR}|g" "${f}" > "${dest}"
done
systemctl --user daemon-reload

# ── Build ─────────────────────────────────────────────────────────────────────
# Rebuild the dev image from scratch. The tag matches the image name expected
# by the Quadlet unit in .quadlet/beprepared-dev.container. The image contains
# all project sources, runtime dependencies, and dev tooling (Bun, hot-reload).

echo "→ Building dev container image..."
podman build -f Containerfile.dev -t "${PROJECT_NAME}-dev:latest" .

# ── Restart ───────────────────────────────────────────────────────────────────
# Bring everything down cleanly before starting up again to avoid port or
# container-name conflicts.
#
#   stop:          gracefully stop all three units (ignore if not running)
#   pod rm -f:     remove any leftover pod that systemd didn't clean up
#   reset-failed:  clear failed state so the next start can succeed
#   start pod-pod: Quadlet manages the pod via the *-pod-pod service name
#   sleep 2:       give the pod a moment to register its network namespace
#   start db:      start MariaDB; sleep 5 s gives it time to accept connections
#   start dev:     start the workspace (API + frontend + worker via start-dev.sh)

echo "→ Restarting dev stack (pod → db → workspace)..."
systemctl --user stop "${PROJECT_NAME}-dev" "${PROJECT_NAME}-dev-db" "${PROJECT_NAME}-dev-pod-pod" 2>/dev/null || true
podman pod rm -f "${PROJECT_NAME}-dev" 2>/dev/null || true
systemctl --user reset-failed "${PROJECT_NAME}-dev-pod-pod.service" 2>/dev/null || true
systemctl --user start "${PROJECT_NAME}-dev-pod-pod"
sleep 2
systemctl --user start "${PROJECT_NAME}-dev-db"
sleep 5   # allow MariaDB to initialise before the workspace container connects
systemctl --user start "${PROJECT_NAME}-dev"

# ── Health wait ───────────────────────────────────────────────────────────────
# Poll both host-facing ports (9996 = API, 9997 = frontend) until they accept
# TCP connections. Gives up after TIMEOUT seconds and prints troubleshooting
# hints rather than hanging forever.

echo "→ Waiting for dev servers to start (checking host ports 9996 + 9997)..."
TIMEOUT=90
ELAPSED=0
until bash -c "echo >/dev/tcp/localhost/9996" 2>/dev/null && bash -c "echo >/dev/tcp/localhost/9997" 2>/dev/null; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  if [[ ${ELAPSED} -ge ${TIMEOUT} ]]; then
    echo "Servers did not respond within ${TIMEOUT}s — check logs:"
    echo "  podman logs -f ${PROJECT_NAME}-dev"
    break
  fi
  echo "  ... waiting (${ELAPSED}s)"
done

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "Dev stack is up!"
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
