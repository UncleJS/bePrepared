#!/usr/bin/env bash
# db.sh — Run database operations inside the beprepared-api container
# Usage: ./scripts/db.sh <migrate|seed|migrate+seed>
# Run from the project root.
set -euo pipefail

# ---- Parse args ----
SUBCOMMAND=""
for arg in "$@"; do
  case "$arg" in
    migrate|seed|migrate+seed) SUBCOMMAND="$arg" ;;
    -h|--help)
      echo "Usage: ./scripts/db.sh <migrate|seed|migrate+seed>"
      echo ""
      echo "Subcommands:"
      echo "  migrate        Run Drizzle migrations (db:migrate)"
      echo "  seed           Run seed data (db:seed) — idempotent"
      echo "  migrate+seed   Run migrations then seed in sequence"
      echo ""
      echo "  All commands execute inside the running beprepared-api container."
      echo ""
      echo "Examples:"
      echo "  ./scripts/db.sh migrate"
      echo "  ./scripts/db.sh seed"
      echo "  ./scripts/db.sh migrate+seed"
      exit 0
      ;;
    *) echo "Unknown subcommand: $arg (valid: migrate, seed, migrate+seed)"; exit 1 ;;
  esac
done

if [[ -z "$SUBCOMMAND" ]]; then
  echo "Usage: ./scripts/db.sh <migrate|seed|migrate+seed>"
  echo "  Run with --help for details."
  exit 1
fi

echo "==> bePrepared db.sh: $SUBCOMMAND"

run_in_api_container() {
  podman exec beprepared-api bun run "$1"
}

run_migrate() {
  echo "==> Running migrations..."
  run_in_api_container /app/api/src/db/migrate.ts
  echo "==> Migrations complete."
}

run_seed() {
  echo "==> Running seed..."
  run_in_api_container /app/api/src/db/seeds/index.ts
  echo "==> Seed complete."
}

case "$SUBCOMMAND" in
  migrate)       run_migrate ;;
  seed)          run_seed ;;
  migrate+seed)  run_migrate && run_seed ;;
esac
