#!/usr/bin/env bash
# =============================================================================
# status.sh — Quick health summary for all bePrepared prod services
# =============================================================================
#
# PURPOSE
#   Fast (~2 s) health check that covers: systemd unit active state for every
#   service, the API /health endpoint (which internally does a SELECT 1), and
#   the frontend HTTP response. Results are printed to stdout AND appended to
#   logs/healthcheck.log for audit purposes. Exits non-zero if any check fails
#   so it can be used as a post-deploy gate in scripts.
#
#   For deeper diagnostics (Podman HEALTHCHECK probe output, per-container error
#   hints, and detailed fix instructions) use healthcheck.sh instead.
#
# PREREQUISITES
#   - beprepared-pod and all member containers must be running
#   - logs/ directory writable at repo root (created automatically if missing)
#   - beprepared-api and beprepared-frontend containers must have wget available
#     (present in all official bePrepared images)
#
# PHASES
#   1. Args           — handle -h/--help; reject unknown flags
#   2. Env load       — source .env to read FRONTEND_PORT / PORT overrides
#   3. Log setup      — ensure logs/ directory exists; initialise helpers
#   4. Unit checks    — systemctl is-active for each unit in UNITS[]
#   5. Endpoint checks — /health (API) and / (frontend) probed from inside
#                        their respective containers via wget
#   6. Summary        — print pass/fail count and action hints
#   7. Log flush      — append the buffered run output to healthcheck.log
#
# FLAGS / ENV VARS
#   -h, --help     Print this help and exit
#
#   FRONTEND_PORT  Override the frontend port (default: 9999); read from .env
#   PORT           Override the API port (default: 9995); read from .env
#
# USAGE
#   ./scripts/status.sh
#
# EXAMPLES
#   ./scripts/status.sh              # run a health check
#   ./scripts/status.sh; echo $?     # check exit code in a pipeline
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
# No positional arguments. Only -h/--help is accepted; anything else is a typo.

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/status.sh"
      echo ""
      echo "Checks the health of all bePrepared systemd units, the API /health"
      echo "endpoint, and the frontend. Exits non-zero if any check fails."
      echo ""
      echo "Results are also appended to logs/healthcheck.log."
      echo ""
      echo "For deeper diagnostics (Podman health states, probe logs, descriptive"
      echo "errors) run: ./scripts/healthcheck.sh"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Env load ──────────────────────────────────────────────────────────────────
# Source .env so that custom FRONTEND_PORT or PORT values override the defaults.
# This mirrors the container's runtime environment and prevents false failures
# when ports are changed from the defaults.

FRONTEND_PORT="9999"
API_PORT="9995"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  FRONTEND_PORT="${FRONTEND_PORT:-9999}"
  API_PORT="${PORT:-9995}"
fi

# ── Log setup ─────────────────────────────────────────────────────────────────
# Create the log directory if it doesn't exist. All output is buffered in
# LOG_LINES[] and flushed atomically at the end so each run appears as a single
# contiguous block in the log file.

mkdir -p "$LOG_DIR"

UNITS=(beprepared-pod beprepared-db beprepared-api beprepared-worker beprepared-frontend)
failures=0
RUN_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
declare -a LOG_LINES=()

say() {
  echo "$1"
  LOG_LINES+=("$1")
}

fail_line() {
  failures=$((failures + 1))
  say "$1"
}

# ── Unit checks ───────────────────────────────────────────────────────────────
# systemctl is-active returns exit 0 for active units and non-zero otherwise.
# The --quiet flag suppresses output so we control the format.

check_unit() {
  local unit="$1"
  if systemctl --user is-active --quiet "$unit"; then
    say "  [ok]   unit active   : $unit"
  else
    fail_line "  [FAIL] unit inactive : $unit"
  fi
}

# ── Endpoint checks ───────────────────────────────────────────────────────────
# Probe endpoints from inside the containers (not from the host) so the check
# works even when ports are not published. wget is the only HTTP client
# guaranteed to be present in the minimal container images.

check_api_health() {
  # GET /health — the API does a SELECT 1 and returns {"status":"ok"} on 200
  # or {"status":"error"} on 503 if the DB is unreachable.
  local output
  output="$(podman exec beprepared-api \
    wget -qO- "http://127.0.0.1:${API_PORT}/health" 2>/dev/null || true)"
  local code
  code="$(echo "$output" | grep -oP '"status"\s*:\s*"\K[^"]+' || true)"
  if [[ "$code" == "ok" ]]; then
    say "  [ok]   api /health   : status=ok"
  else
    fail_line "  [FAIL] api /health   : status=${code:-no response}"
    say "         Hint: run ./scripts/healthcheck.sh for details"
  fi
}

check_frontend() {
  # GET / from inside the frontend container. Any 2xx/3xx/4xx is considered
  # healthy (5xx or no response indicates the server is down).
  local code
  code="$(podman exec beprepared-frontend \
    wget --server-response -q -O /dev/null "http://127.0.0.1:${FRONTEND_PORT}/" 2>&1 \
    | grep -oP 'HTTP/[0-9.]+ \K[0-9]+' | head -1 || true)"
  if [[ "$code" =~ ^[234] ]]; then
    say "  [ok]   frontend      : HTTP ${code} on :${FRONTEND_PORT}"
  else
    fail_line "  [FAIL] frontend      : HTTP ${code:-no response} on :${FRONTEND_PORT}"
    say "         Hint: run ./scripts/healthcheck.sh for details"
  fi
}

say ""
say "==> bePrepared status check  [$RUN_TS]"
say ""

say "--- systemd units ---"
for unit in "${UNITS[@]}"; do
  check_unit "$unit"
done

say ""
say "--- endpoint checks ---"
check_api_health
check_frontend

# ── Summary ───────────────────────────────────────────────────────────────────
# Print a one-line verdict with action hints. The exit code at the end of the
# script reflects the failure count for use in CI pipelines.

say ""
if [[ "$failures" -eq 0 ]]; then
  say "==> All checks passed."
  say "    Frontend : http://localhost:${FRONTEND_PORT}"
  say "    API docs : http://localhost:${API_PORT}/docs"
else
  say "==> ${failures} check(s) failed."
  say "    Deep diagnostics : ./scripts/healthcheck.sh"
  say "    Logs             : ./scripts/logs.sh"
  say "    Restart          : ./scripts/restart.sh"
fi

# ── Log flush ─────────────────────────────────────────────────────────────────
# Write all buffered lines to the log file in one atomic append. A trailing
# blank line separates individual runs so the file is easy to grep or tail.

{
  for line in "${LOG_LINES[@]}"; do
    echo "$line"
  done
  echo ""
} >> "$LOG_FILE"

[[ "$failures" -eq 0 ]]
