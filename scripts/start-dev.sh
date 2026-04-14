#!/usr/bin/env sh
# =============================================================================
# start-dev.sh — Container entrypoint: migrate, seed, and start all dev servers
# =============================================================================
#
# PURPOSE
#   Runs inside the beprepared-dev container as the CMD/entrypoint. Performs
#   DB initialisation (migrate + seed) on every start — both operations are
#   idempotent so re-running them on an already-initialised database is safe.
#   Then launches the API, frontend (Vite), and worker processes concurrently
#   as background jobs and waits on all three. If any process crashes, `wait`
#   propagates the non-zero exit code so systemd sees a failed unit.
#
#   Signals (SIGTERM / SIGINT) are trapped to cleanly kill all child processes
#   before the container stops, preventing port-in-use errors on restart.
#
# PREREQUISITES
#   - Runs exclusively INSIDE the beprepared-dev container (not on the host)
#   - /app must contain the full monorepo with node_modules installed
#   - DATABASE_URL must be set in the container environment (from .env via
#     Quadlet's EnvironmentFile= directive)
#   - MariaDB (beprepared-dev-db) must be accepting connections before this
#     script is invoked — dev.sh waits 5 s after starting the db unit
#
# PHASES
#   1. Signal trap    — register cleanup() to kill all children on SIGTERM/INT
#   2. DB init        — run db:migrate then db:seed (idempotent, always run)
#   3. Launch servers — start api, frontend (Vite), and worker as background jobs
#   4. Wait           — block until all three processes exit; propagate exit code
#
# FLAGS / ENV VARS
#   (no CLI flags — this script is an entrypoint, not invoked directly)
#
#   DATABASE_URL   MariaDB connection string; injected from .env by Quadlet
#   WORKDIR        Set to /app; can be overridden for testing
#
# USAGE
#   (invoked automatically by systemd via the Quadlet container unit)
#   To run manually for debugging:
#     podman exec -it beprepared-dev /app/scripts/start-dev.sh
#
# =============================================================================
set -e

WORKDIR="/app"
cd "${WORKDIR}"

# ── Signal trap ───────────────────────────────────────────────────────────────
# When systemd stops the container it sends SIGTERM to PID 1 (this script).
# The trap kills the entire process group (kill 0), then waits for children to
# finish before exiting. Without this, child processes become zombies and the
# container hangs during shutdown.

cleanup() {
  echo "[start-dev] Shutting down..."
  kill 0
  wait
  echo "[start-dev] All servers stopped."
}
trap cleanup TERM INT

# ── DB init ───────────────────────────────────────────────────────────────────
# Run migrations and seed on every container start. Drizzle migrations are
# idempotent (already-applied migrations are skipped). The seed script must
# also be written to be safe to run multiple times (use INSERT IGNORE or
# ON DUPLICATE KEY UPDATE patterns).

echo "[start-dev] Running DB migrations..."
bun run db:migrate

echo "[start-dev] Seeding database..."
bun run db:seed

# ── Launch servers ────────────────────────────────────────────────────────────
# Each server is started as a background job. PIDs are captured so the `wait`
# below can detect an individual crash and exit the entrypoint with a non-zero
# code, which in turn marks the systemd unit as failed.
#
# Port mapping (container → host):
#   API      9995 → 9996
#   Frontend 9999 → 9997
#   Worker   (no port — processes background jobs from the DB queue)

echo "[start-dev] Starting API (container:9995 → host:9996)..."
bun run dev:api &
API_PID=$!

echo "[start-dev] Starting frontend via Vite (container:9999 → host:9997)..."
bun run dev:frontend &
FRONTEND_PID=$!

echo "[start-dev] Starting worker..."
bun run dev:worker &
WORKER_PID=$!

echo "[start-dev] All servers running."
echo "[start-dev]   API       → http://localhost:9996"
echo "[start-dev]   Swagger   → http://localhost:9996/docs"
echo "[start-dev]   Frontend  → http://localhost:9997"

# ── Wait ──────────────────────────────────────────────────────────────────────
# Block until all three child processes exit. `wait <pids>` returns the exit
# code of the last-exited process; if any crashes, systemd marks the unit
# failed and can apply its RestartPolicy.

wait ${API_PID} ${FRONTEND_PID} ${WORKER_PID}
