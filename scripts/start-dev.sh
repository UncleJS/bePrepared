#!/usr/bin/env sh
# start-dev.sh — auto-start all bePrepared dev servers inside the container.
# - API + Worker: Bun (fast)
# - Frontend: Node.js (Bun segfaults with Next.js dev server)
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

# ── launch servers ───────────────────────────────────────────────────────────
echo "[start-dev] Starting API (port 9996)..."
bun run dev:api &
API_PID=$!

echo "[start-dev] Starting frontend via node (port 9997)..."
# Force NODE_ENV=development: the container .env sets NODE_ENV=production for
# the API/worker, but Next.js dev server requires development to load the CSS
# pipeline and PostCSS (otherwise @tailwind directives cause a parse failure).
# Also force node runtime — Bun segfaults with Next.js dev server.
(cd /app/frontend && NODE_ENV=development node /app/frontend/node_modules/.bin/next dev --port 9999) &
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
