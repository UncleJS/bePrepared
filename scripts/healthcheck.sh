#!/usr/bin/env bash
# healthcheck.sh — Deep health probe for all bePrepared containers
#
# Checks (in order):
#   1. systemd unit active state   — is the process even running?
#   2. Podman health state         — did the in-container HEALTHCHECK pass?
#   3. HTTP endpoint reachability  — is the service actually responding?
#
# Results are printed to stdout AND appended to logs/healthcheck.log.
#
# Exit codes:
#   0  — all checks passed
#   1  — one or more checks failed
#
# Usage:
#   ./scripts/healthcheck.sh          # full check, log results
#   ./scripts/healthcheck.sh --quiet  # suppress stdout, still logs
#   ./scripts/healthcheck.sh --help
#
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
ENV_FILE="$PROJECT_ROOT/.env"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/healthcheck.log"

# ── Defaults ────────────────────────────────────────────────────────────────
FRONTEND_PORT="9999"
API_PORT="9995"
QUIET=false

# ── Args ─────────────────────────────────────────────────────────────────────
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

# ── Load .env for port overrides ─────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
FRONTEND_PORT="${FRONTEND_PORT:-9999}"
API_PORT="${PORT:-9995}"

# ── Ensure log directory exists ───────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────
failures=0
RUN_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Buffer all log lines for this run; written atomically at the end.
declare -a LOG_LINES=()

say() {
  # Print to stdout (unless --quiet) and buffer for log file.
  local msg="$1"
  $QUIET || echo "$msg"
  LOG_LINES+=("$msg")
}

fail() {
  failures=$((failures + 1))
  say "$1"
}

# ── Check 1: systemd unit state ───────────────────────────────────────────────
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

# ── Check 2: Podman container health state ────────────────────────────────────
check_podman_health() {
  local container="$1"
  local description="$2"
  local health

  # `podman inspect` returns "healthy", "unhealthy", "starting", or "" (no healthcheck).
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
      # Pull the last few healthcheck log lines from Podman for context.
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
      # Container doesn't exist or has no healthcheck defined.
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

# ── Check 3: HTTP endpoint reachability ───────────────────────────────────────
# check_http_container: probe a URL from inside a container
check_http_container() {
  local label="$1"
  local container="$2"
  local url="$3"
  local expect_pattern="$4"   # regex matched against HTTP status code
  local description="$5"
  local code

  # Use wget's spider mode to get the HTTP status without downloading the body.
  # wget -S writes headers to stderr; we parse the status line from there.
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

# ── Check 4: DB connectivity via API health endpoint ─────────────────────────
check_api_db() {
  # The API /health endpoint does a SELECT 1 and returns 200 on success,
  # 503 on DB failure.  We check from inside the container to avoid needing
  # the API port published on the host.
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
# API port 3001 is not published to the host — probe from inside the container.
check_http_container "api/health" "beprepared-api" \
  "http://127.0.0.1:${API_PORT}/health" "^2" \
  "The API /health endpoint did not return a 2xx status code."

# Frontend is probed from inside its own container to avoid host-runtime dependencies.
check_http_container "frontend" "beprepared-frontend" \
  "http://127.0.0.1:${FRONTEND_PORT}/" "^[234]" \
  "The Next.js frontend did not return a 2xx/3xx/4xx status code."
# ── Summary & log flush ───────────────────────────────────────────────────────
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

# Write the buffered output to the log file (one block per run, blank-line
# separated so individual runs are easy to grep/tail).
{
  for line in "${LOG_LINES[@]}"; do
    echo "$line"
  done
  echo ""
} >> "$LOG_FILE"

[[ "$failures" -eq 0 ]]
