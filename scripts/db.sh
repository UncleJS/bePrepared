#!/usr/bin/env bash
# =============================================================================
# db.sh — Run database operations inside the running beprepared-api container
# =============================================================================
#
# PURPOSE
#   Thin wrapper around the Bun/Drizzle database scripts that live inside the
#   prod API container. Executes migrations and/or seed data without requiring
#   direct database access from the host. Called by install.sh and update.sh,
#   but safe to run independently at any time.
#
# PREREQUISITES
#   - beprepared-api container must be running
#     (start it first with: ./scripts/start.sh)
#   - Drizzle migration files must be up-to-date in the container image
#     (rebuild with ./scripts/rebuild.sh api if you changed schema files)
#
# PHASES
#   1. Args      — parse the positional subcommand; print usage on -h/--help
#   2. Helpers   — define run_migrate / run_seed wrapper functions
#   3. Dispatch  — route the subcommand to the appropriate helper(s)
#
# FLAGS / ENV VARS
#   migrate        Run Drizzle migrations via `bun run db:migrate` (idempotent)
#   seed             Run reference + demo seed via `bun run db:seed` (idempotent)
#   seed-reference   Run reference seed only (modules, categories, policies)
#   seed-demo        Run demo household and admin user only
#   migrate+seed     Run migrate then full seed in sequence
#   -h, --help     Print this help and exit
#
#   (no env vars — container name beprepared-api is hard-coded)
#
# USAGE
#   ./scripts/db.sh <migrate|seed|seed-reference|seed-demo|migrate+seed>
#
# EXAMPLES
#   ./scripts/db.sh migrate          # apply any pending schema changes
#   ./scripts/db.sh seed             # load reference/fixture data
#   ./scripts/db.sh migrate+seed     # full DB initialisation in one command
#
# Run from the project root.
# =============================================================================
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# Accept a single positional subcommand. Unknown values and missing values both
# exit with a helpful message rather than a cryptic error.

SUBCOMMAND=""
for arg in "$@"; do
  case "$arg" in
    migrate|seed|seed-reference|seed-demo|migrate+seed) SUBCOMMAND="$arg" ;;
    -h|--help)
      echo "Usage: ./scripts/db.sh <migrate|seed|seed-reference|seed-demo|migrate+seed>"
      echo ""
      echo "Subcommands:"
      echo "  migrate          Run Drizzle migrations (db:migrate)"
      echo "  seed             Run reference + demo seed (db:seed) — idempotent"
      echo "  seed-reference   Run reference data only (modules, categories, policies)"
      echo "  seed-demo        Run demo household and admin user only"
      echo "  migrate+seed     Run migrations then full seed in sequence"
      echo ""
      echo "  All commands execute inside the running beprepared-api container."
      echo ""
      echo "Examples:"
      echo "  ./scripts/db.sh migrate"
      echo "  ./scripts/db.sh seed"
      echo "  ./scripts/db.sh migrate+seed"
      exit 0
      ;;
    *) echo "Unknown subcommand: $arg (valid: migrate, seed, seed-reference, seed-demo, migrate+seed)"; exit 1 ;;
  esac
done

if [[ -z "$SUBCOMMAND" ]]; then
  echo "Usage: ./scripts/db.sh <migrate|seed|seed-reference|seed-demo|migrate+seed>"
  echo "  Run with --help for details."
  exit 1
fi

echo "==> bePrepared db.sh: $SUBCOMMAND"

# ── Helpers ───────────────────────────────────────────────────────────────────
# Each helper delegates to `bun run <script>` inside the API container so that
# Drizzle has access to the correct DATABASE_URL from the container's env.

run_in_api_container() {
  podman exec beprepared-api bun run "$1"
}

run_migrate() {
  echo "==> Running migrations..."
  run_in_api_container db:migrate
  echo "==> Migrations complete."
}

run_seed() {
  echo "==> Running seed..."
  run_in_api_container db:seed
  echo "==> Seed complete."
}

run_seed_reference() {
  echo "==> Running reference seed..."
  run_in_api_container db:seed:reference
  echo "==> Reference seed complete."
}

run_seed_demo() {
  echo "==> Running demo seed..."
  run_in_api_container db:seed:demo
  echo "==> Demo seed complete."
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
# Route the parsed subcommand to the corresponding helper(s).

case "$SUBCOMMAND" in
  migrate)         run_migrate ;;
  seed)            run_seed ;;
  seed-reference)  run_seed_reference ;;
  seed-demo)       run_seed_demo ;;
  migrate+seed)    run_migrate && run_seed ;;
esac
