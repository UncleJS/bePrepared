#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

FRONTEND_PORT="${FRONTEND_PORT:-9999}"
UNITS=(beprepared-pod beprepared-db beprepared-api beprepared-worker beprepared-frontend)

failures=0

check_unit_active() {
  local unit="$1"
  if systemctl --user is-active --quiet "$unit"; then
    echo "[ok] unit active: $unit"
  else
    echo "[fail] unit inactive: $unit"
    failures=$((failures + 1))
  fi
}

check_frontend() {
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${FRONTEND_PORT}/" || true)"
  if [[ "$code" =~ ^2|3|4 ]]; then
    echo "[ok] frontend reachable on :${FRONTEND_PORT} (HTTP ${code})"
  else
    echo "[fail] frontend check failed on :${FRONTEND_PORT} (HTTP ${code:-none})"
    failures=$((failures + 1))
  fi
}

check_api_health() {
  local output
  output="$(podman exec beprepared-api bun -e 'const r=await fetch("http://127.0.0.1:3001/health");process.stdout.write(`${r.status}`)' 2>/dev/null || true)"
  if [[ "$output" == "200" ]]; then
    echo "[ok] api health endpoint reachable inside container"
  else
    echo "[fail] api health endpoint check failed (status: ${output:-none})"
    failures=$((failures + 1))
  fi
}

echo "==> bePrepared post-restart checks"
for unit in "${UNITS[@]}"; do
  check_unit_active "$unit"
done

check_frontend
check_api_health

if [[ "$failures" -gt 0 ]]; then
  echo "==> checks completed with ${failures} failure(s)"
  exit 1
fi

echo "==> all checks passed"
