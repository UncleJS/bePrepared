#!/usr/bin/env bash
# status.sh — Check health of all bePrepared services
# Usage: ./scripts/status.sh
# Exits 0 if all checks pass, non-zero if any fail.
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
ENV_FILE="$DEPLOY_DIR/.env"

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/status.sh"
      echo ""
      echo "Checks the health of all bePrepared systemd units, the API /health"
      echo "endpoint, and the frontend. Exits non-zero if any check fails."
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Load .env for port config if present
FRONTEND_PORT="9999"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  FRONTEND_PORT="${FRONTEND_PORT:-9999}"
fi

UNITS=(beprepared-pod beprepared-db beprepared-api beprepared-worker beprepared-frontend)
failures=0

check_unit() {
  local unit="$1"
  if systemctl --user is-active --quiet "$unit"; then
    echo "  [ok]   unit active   : $unit"
  else
    echo "  [fail] unit inactive : $unit"
    failures=$((failures + 1))
  fi
}

check_api_health() {
  local output
  output="$(podman exec beprepared-api bun -e \
    'const r=await fetch("http://127.0.0.1:3001/health");process.stdout.write(`${r.status}`)' \
    2>/dev/null || true)"
  if [[ "$output" == "200" ]]; then
    echo "  [ok]   api /health   : HTTP 200"
  else
    echo "  [fail] api /health   : HTTP ${output:-no response}"
    failures=$((failures + 1))
  fi
}

check_frontend() {
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${FRONTEND_PORT}/" || true)"
  if [[ "$code" =~ ^[234] ]]; then
    echo "  [ok]   frontend      : HTTP ${code} on :${FRONTEND_PORT}"
  else
    echo "  [fail] frontend      : HTTP ${code:-no response} on :${FRONTEND_PORT}"
    failures=$((failures + 1))
  fi
}

echo "==> bePrepared status check"
echo ""

echo "--- systemd units ---"
for unit in "${UNITS[@]}"; do
  check_unit "$unit"
done

echo ""
echo "--- endpoint checks ---"
check_api_health
check_frontend

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "==> All checks passed."
  echo "    Frontend : http://localhost:${FRONTEND_PORT}"
  echo "    API docs : http://localhost:3001/docs"
else
  echo "==> ${failures} check(s) failed."
  echo "    Logs  : ./scripts/logs.sh"
  echo "    Restart: ./scripts/restart.sh"
  exit 1
fi
