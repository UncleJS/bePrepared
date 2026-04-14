#!/usr/bin/env sh
# start-dev.sh — auto-start all bePrepared dev servers inside the container.
# Signals are trapped so all children are cleanly killed on container stop.
set -e

WORKDIR="/app"
cd "${WORKDIR}"

# ── trap: kill all child processes on SIGTERM / SIGINT ──────────────────────
cleanup() {
  echo "[start-dev] Shutting down..."
  kill 0
  wait
  echo "[start-dev] All servers stopped."
}
trap cleanup TERM INT

# ── migrate + seed (always, safe to re-run) ──────────────────────────────────
echo "[start-dev] Running DB migrations..."
bun run db:migrate

echo "[start-dev] Seeding database..."
bun run db:seed

# ── launch servers ───────────────────────────────────────────────────────────
echo "[start-dev] Starting API (port 9996)..."
bun run dev:api &
API_PID=$!

echo "[start-dev] Starting frontend via Vite (port 9997)..."
bun run dev:frontend &
FRONTEND_PID=$!

echo "[start-dev] Starting worker..."
bun run dev:worker &
WORKER_PID=$!

echo "[start-dev] All servers running."
echo "[start-dev]   API       → http://localhost:9996"
echo "[start-dev]   Swagger   → http://localhost:9996/docs"
echo "[start-dev]   Frontend  → http://localhost:9997"

# Wait for all children; exit if any crash
wait ${API_PID} ${FRONTEND_PID} ${WORKER_PID}

