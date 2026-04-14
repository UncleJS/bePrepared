#!/usr/bin/env bash
# =============================================================================
# logs.sh — Stream or query journalctl logs for bePrepared services
# =============================================================================
#
# PURPOSE
#   Convenience wrapper around `journalctl --user` that pre-selects the correct
#   unit name pattern so you don't have to remember container names. With no
#   service argument it tails all bePrepared units together; with a service name
#   it narrows to that unit. Any extra arguments are forwarded to journalctl
#   verbatim, enabling --since, -n, --output, and all other journal flags.
#
# PREREQUISITES
#   - systemd user session active
#   - At least one beprepared-* unit has been started (to have log entries)
#
# PHASES
#   1. Args            — parse optional service name and collect passthrough
#                        arguments; handle -h/--help
#   2. Unit selection  — resolve the journalctl -u pattern (wildcard or exact)
#   3. Exec            — exec journalctl (replaces the shell process)
#
# FLAGS / ENV VARS
#   api        Narrow to beprepared-api logs
#   worker     Narrow to beprepared-worker logs
#   frontend   Narrow to beprepared-frontend logs
#   db         Narrow to beprepared-db logs
#   (none)     Follow all beprepared-* units
#   -h, --help Print this help and exit
#
#   Any remaining arguments are forwarded to journalctl (e.g. -n 50,
#   --since today, --output json).
#
#   (no env vars — unit names are fixed by the Quadlet files)
#
# USAGE
#   ./scripts/logs.sh [api|worker|frontend|db] [journalctl options...]
#
# EXAMPLES
#   ./scripts/logs.sh                      # follow all units (live tail)
#   ./scripts/logs.sh api                  # follow API logs only
#   ./scripts/logs.sh worker -n 100        # last 100 worker log lines
#   ./scripts/logs.sh api --since today    # API logs since midnight
#   ./scripts/logs.sh db --output json     # DB logs in JSON format
#
# Run from the project root.
# =============================================================================
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# The first recognised service name is captured as SERVICE; everything else
# (including journalctl flags like -n or --since) is collected in EXTRA_ARGS.

SERVICE=""
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    api|worker|frontend|db)
      if [[ -z "$SERVICE" ]]; then
        SERVICE="$arg"
      else
        EXTRA_ARGS+=("$arg")
      fi
      ;;
    -h|--help)
      echo "Usage: ./scripts/logs.sh [api|worker|frontend|db] [journalctl options...]"
      echo ""
      echo "Arguments:"
      echo "  api       Follow logs for beprepared-api"
      echo "  worker    Follow logs for beprepared-worker"
      echo "  frontend  Follow logs for beprepared-frontend"
      echo "  db        Follow logs for beprepared-db"
      echo ""
      echo "  No service argument follows all bePrepared units."
      echo ""
      echo "  Any additional arguments are passed directly to journalctl."
      echo ""
      echo "Examples:"
      echo "  ./scripts/logs.sh                    # follow all units"
      echo "  ./scripts/logs.sh api                # follow API only"
      echo "  ./scripts/logs.sh worker -n 100      # last 100 worker lines"
      echo "  ./scripts/logs.sh api --since today  # API logs since midnight"
      exit 0
      ;;
    *) EXTRA_ARGS+=("$arg") ;;
  esac
done

# ── Unit selection ────────────────────────────────────────────────────────────
# Build the journalctl -u pattern. A wildcard matches all bePrepared units when
# no service was specified; an exact name targets only one unit.

if [[ -z "$SERVICE" ]]; then
  UNIT_PATTERN="beprepared*"
  echo "==> Following logs for all bePrepared units (Ctrl+C to exit)..."
else
  UNIT_PATTERN="beprepared-${SERVICE}"
  echo "==> Following logs for ${UNIT_PATTERN} (Ctrl+C to exit)..."
fi

# Default to -f (follow mode) when no passthrough args were given so the
# command behaves like `tail -f` out of the box.
if [[ "${#EXTRA_ARGS[@]}" -eq 0 ]]; then
  EXTRA_ARGS=(-f)
fi

# ── Exec ──────────────────────────────────────────────────────────────────────
# Replace the shell process with journalctl so that Ctrl+C propagates correctly
# and the exit code from journalctl is returned directly to the caller.

# shellcheck disable=SC2086
exec journalctl --user -u "$UNIT_PATTERN" "${EXTRA_ARGS[@]}"
