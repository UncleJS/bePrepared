#!/usr/bin/env bash
# status.sh — Quick health summary for all bePrepared services.
#
# For a deep probe (Podman health states + descriptive errors + log file),
# use ./scripts/healthcheck.sh instead.
#
# Usage: ./scripts/status.sh
# Exits 0 if all checks pass, non-zero if any fail.
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
ENV_FILE="$DEPLOY_DIR/.env"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/healthcheck.log"

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

# Load .env for port config if present
FRONTEND_PORT="9999"
API_PORT="3001"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  FRONTEND_PORT="${FRONTEND_PORT:-9999}"
  API_PORT="${PORT:-3001}"
fi

# Ensure log directory exists
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

check_unit() {
  local unit="$1"
  if systemctl --user is-active --quiet "$unit"; then
    say "  [ok]   unit active   : $unit"
  else
    fail_line "  [FAIL] unit inactive : $unit"
  fi
}

check_api_health() {
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

# Flush buffered output to the log file
{
  for line in "${LOG_LINES[@]}"; do
    echo "$line"
  done
  echo ""
} >> "$LOG_FILE"

[[ "$failures" -eq 0 ]]
