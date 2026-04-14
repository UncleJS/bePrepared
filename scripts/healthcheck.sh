#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — Deep three-level health probe for all bePrepared containers
# =============================================================================
#
# PURPOSE
#   Performs a comprehensive health check across every bePrepared prod service
#   at three independent levels:
#     1. systemd unit active state  — is the process even managed and running?
#     2. Podman HEALTHCHECK state   — did the in-container probe script pass?
#     3. HTTP endpoint reachability — is the service accepting real requests?
#
#   Each failing check prints a human-readable explanation of the likely cause
#   and the exact command needed to fix it. Results are printed to stdout AND
#   appended atomically to logs/healthcheck.log for persistent audit history.
#
#   For a faster surface-level check see status.sh (no Podman probe output,
#   ~2 s vs ~5 s). Use this script for post-deploy verification and incident
#   triage.
#
# PREREQUISITES
#   - beprepared-pod and all member containers must be started
#   - logs/ directory writable at repo root (created automatically if missing)
#   - beprepared-api and beprepared-frontend must have wget available
#     (present in all official bePrepared images)
#
# PHASES
#   1. Args           — parse --quiet / -q flag; handle -h/--help
#   2. Env load       — source .env to read port overrides; set defaults
#   3. Log setup      — ensure logs/ exists; initialise say/fail helpers and
#                       buffer for atomic log flush
#   4. Unit checks    — check_unit() for each systemd service
#   5. Podman health  — check_podman_health() per container: healthy /
#                       unhealthy / starting / missing; print probe log on fail
#   6. Endpoint checks — check_api_db() via /health body + check_http_container()
#                        for api/health and frontend / probed inside containers
#   7. Summary        — pass/fail verdict with actionable fix hints
#   8. Log flush      — append buffered LOG_LINES[] to healthcheck.log
#
# FLAGS / ENV VARS
#   --quiet, -q    Suppress stdout output; log file is always written
#   -h, --help     Print this help and exit
#
#   FRONTEND_PORT  Override frontend port (default: 9999); read from .env
#   PORT           Override API port (default: 9995); read from .env
#
# USAGE
#   ./scripts/healthcheck.sh           # full check, log results
#   ./scripts/healthcheck.sh --quiet   # silent check (log only), useful in cron
#
# EXAMPLES
#   ./scripts/healthcheck.sh                  # interactive health check
#   ./scripts/healthcheck.sh --quiet; echo $? # scripted exit-code check
#   tail -f logs/healthcheck.log              # follow the log across runs
#
# EXIT CODES
#   0   All checks passed
#   1   One or more checks failed
#
# Run from the project root.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/healthcheck.log"

# ── Args ──────────────────────────────────────────────────────────────────────
# --quiet suppresses stdout without affecting the log file. This allows cron
# jobs to run the script silently while still recording results.

FRONTEND_PORT="9999"
API_PORT="9995"
QUIET=false

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/healthcheck.sh [--quiet]"
      echo ""
      echo "Probes every bePrepared container at three levels:"
      echo "  1. systemd unit active state"
      echo "  2. Podman container health state (HEALTHCHECK result)"
      echo "  3. HTTP endpoint reachability"
      echo ""
      echo "Appends a timestamped log entry to logs/healthcheck.log."
      echo ""
      echo "Options:"
      echo "  --quiet   Suppress stdout output (log file is always written)"
      echo "  --help    Show this help"
      exit 0
      ;;
    --quiet|-q) QUIET=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Env load ──────────────────────────────────────────────────────────────────
# Source .env to pick up any custom port values. set -a exports all variables
# so they override the defaults set above; set +a stops the auto-export.

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
FRONTEND_PORT="${FRONTEND_PORT:-9999}"
API_PORT="${PORT:-9995}"

# ── Log setup ─────────────────────────────────────────────────────────────────
# All output is buffered in LOG_LINES[] and written atomically at the end so
# each run appears as a contiguous block in the log file. The say/fail helpers
# handle both stdout printing (respecting --quiet) and buffering.

mkdir -p "$LOG_DIR"

failures=0
RUN_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
declare -a LOG_LINES=()

say() {
  local msg="$1"
  $QUIET || echo "$msg"
  LOG_LINES+=("$msg")
}

fail() {
  failures=$((failures + 1))
  say "$1"
}

# ── Unit checks ───────────────────────────────────────────────────────────────
# Level 1: verify the systemd unit is in the "active" state. A non-active
# state (failed, inactive, activating) means the container process is not
# running at the OS level.

check_unit() {
  local unit="$1"
  local state
  state="$(systemctl --user is-active "$unit" 2>/dev/null || true)"
  if [[ "$state" == "active" ]]; then
    say "  [ok]   systemd          : $unit  (active)"
  else
    fail "  [FAIL] systemd          : $unit  (state=$state)"
    fail "         → The systemd unit is not active. This usually means the"
    fail "           container process exited or was never started."
    fail "           Fix: systemctl --user start $unit"
    fail "           Logs: ./scripts/logs.sh ${unit#beprepared-}"
  fi
}

# ── Podman health ─────────────────────────────────────────────────────────────
# Level 2: query the result of the in-container HEALTHCHECK directive. Podman
# returns "healthy", "unhealthy", "starting", or "" (no HEALTHCHECK defined).
# On "unhealthy", the last few probe log entries are pulled and printed so the
# engineer can see exactly what the probe script output.

check_podman_health() {
  local container="$1"
  local description="$2"
  local health

  health="$(podman inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || true)"

  case "$health" in
    healthy)
      say "  [ok]   podman health    : $container  (healthy)"
      ;;
    starting)
      # Not a failure — probe is still in start-period; count as warning only.
      say "  [warn] podman health    : $container  (starting — still within start-period)"
      ;;
    unhealthy)
      fail "  [FAIL] podman health    : $container  (unhealthy)"
      local probe_log
      probe_log="$(podman inspect --format \
        '{{range .State.Health.Log}}{{.End}} exit={{.ExitCode}} {{.Output}}{{end}}' \
        "$container" 2>/dev/null | tail -3 || true)"
      fail "         → $description"
      if [[ -n "$probe_log" ]]; then
        fail "         → Recent probe output:"
        while IFS= read -r line; do
          fail "             $line"
        done <<< "$probe_log"
      fi
      fail "           Fix: ./scripts/restart.sh ${container#beprepared-}"
      fail "           Logs: ./scripts/logs.sh ${container#beprepared-}"
      ;;
    "")
      if podman container exists "$container" 2>/dev/null; then
        say "  [skip] podman health    : $container  (no HEALTHCHECK defined in image)"
      else
        fail "  [FAIL] podman health    : $container  (container not found)"
        fail "         → The container does not exist. The image may need rebuilding."
        fail "           Fix: ./scripts/rebuild.sh ${container#beprepared-}"
      fi
      ;;
    *)
      fail "  [FAIL] podman health    : $container  (unknown state: $health)"
      ;;
  esac
}

# ── Endpoint checks ───────────────────────────────────────────────────────────
# Level 3a: HTTP probe via wget from inside a container. Avoids host-runtime
# dependencies and works even when the port is not published to the host.
# The expect_pattern is a regex matched against the HTTP status code string.

check_http_container() {
  local label="$1"
  local container="$2"
  local url="$3"
  local expect_pattern="$4"   # regex matched against HTTP status code
  local description="$5"
  local code

  code="$(podman exec "$container" \
    wget --server-response -q -O /dev/null "$url" 2>&1 \
    | grep -oP 'HTTP/[0-9.]+ \K[0-9]+' | head -1 || true)"

  if [[ "$code" =~ $expect_pattern ]]; then
    say "  [ok]   http (container) : $label  (HTTP $code)"
  else
    fail "  [FAIL] http (container) : $label  (HTTP ${code:-no response})"
    fail "         → $description"
    fail "           URL checked : $url (probed from inside $container)"
    [[ -n "$code" ]] && fail "           Received HTTP $code — expected pattern: $expect_pattern"
    [[ -z "$code" ]] && fail "           No response — the service may be down or not yet ready"
    fail "           Fix: ./scripts/restart.sh ${label%%/*}"
    fail "           Logs: ./scripts/logs.sh ${label%%/*}"
  fi
}

# Level 3b: parse the /health JSON body for the DB connectivity field.
# Returns {"status":"ok"} on 200 when SELECT 1 succeeds; {"status":"error"}
# on 503 when MariaDB is unreachable or returns an error.

check_api_db() {
  local output
  output="$(podman exec beprepared-api \
    wget -qO- "http://127.0.0.1:${API_PORT}/health" 2>/dev/null || true)"

  local db_status
  db_status="$(echo "$output" | grep -oP '"status"\s*:\s*"\K[^"]+' || true)"

  if [[ "$db_status" == "ok" ]]; then
    say "  [ok]   api db check     : SELECT 1 succeeded  (status=ok)"
  elif [[ "$db_status" == "error" ]]; then
    fail "  [FAIL] api db check     : /health returned status=error"
    fail "         → The API reached its /health endpoint but the database"
    fail "           query (SELECT 1) failed.  MariaDB may be down, refusing"
    fail "           connections, or the credentials in .env are wrong."
    fail "           Fix: ./scripts/restart.sh db"
    fail "           Logs: ./scripts/logs.sh db"
  else
    fail "  [FAIL] api db check     : unexpected /health response"
    fail "         → Could not reach http://127.0.0.1:${API_PORT}/health from"
    fail "           inside the beprepared-api container.  The API process may"
    fail "           have crashed or is still starting up."
    fail "           Raw response: ${output:-<empty>}"
    fail "           Fix: ./scripts/restart.sh api"
    fail "           Logs: ./scripts/logs.sh api"
  fi
}

# ── Run all checks ────────────────────────────────────────────────────────────
say ""
say "==> bePrepared healthcheck  [$RUN_TS]"
say ""

say "--- systemd units ---"
check_unit "beprepared-pod"
check_unit "beprepared-db"
check_unit "beprepared-api"
check_unit "beprepared-worker"
check_unit "beprepared-frontend"

say ""
say "--- podman container health (HEALTHCHECK probes) ---"
check_podman_health "beprepared-db" \
  "MariaDB healthcheck.sh failed: server may not be accepting connections or InnoDB is not yet initialised."

check_podman_health "beprepared-api" \
  "API /health probe failed: the Bun/Elysia process may have crashed or the DB connection was lost."

check_podman_health "beprepared-worker" \
  "/tmp/worker.ready is missing: the worker has not completed a successful scheduler tick since startup."

check_podman_health "beprepared-frontend" \
  "Next.js root-page probe failed: the Node.js server may have crashed or is OOM-killed."

say ""
say "--- endpoint reachability ---"
check_api_db
# API port is not published to the host — probe from inside the container.
check_http_container "api/health" "beprepared-api" \
  "http://127.0.0.1:${API_PORT}/health" "^2" \
  "The API /health endpoint did not return a 2xx status code."

# Frontend is probed from inside its own container to avoid host dependencies.
check_http_container "frontend" "beprepared-frontend" \
  "http://127.0.0.1:${FRONTEND_PORT}/" "^[234]" \
  "The Next.js frontend did not return a 2xx/3xx/4xx status code."

# ── Summary ───────────────────────────────────────────────────────────────────
# Print a verdict and actionable hints. Exit code matches failure count (0 = all
# good, 1 = at least one failure).

say ""
if [[ "$failures" -eq 0 ]]; then
  say "==> All checks passed."
  say "    Frontend : http://localhost:${FRONTEND_PORT}"
  say "    API docs : http://localhost:${API_PORT}/docs"
else
  say "==> ${failures} check(s) FAILED — see details above."
  say "    Useful commands:"
  say "      View logs  : ./scripts/logs.sh"
  say "      Restart all: ./scripts/restart.sh"
  say "      Rebuild    : ./scripts/rebuild.sh"
fi

# ── Log flush ─────────────────────────────────────────────────────────────────
# Write all buffered lines atomically to the log file. A trailing blank line
# separates individual runs so the file is easy to grep or tail.

{
  for line in "${LOG_LINES[@]}"; do
    echo "$line"
  done
  echo ""
} >> "$LOG_FILE"

[[ "$failures" -eq 0 ]]
