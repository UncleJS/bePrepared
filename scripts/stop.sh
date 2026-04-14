#!/usr/bin/env bash
# =============================================================================
# stop.sh — Stop the bePrepared Podman pod (all prod services)
# =============================================================================
#
# PURPOSE
#   Convenience wrapper around `systemctl --user stop beprepared-pod`.
#   Stopping the pod gracefully shuts down every service in the pod in reverse
#   dependency order (frontend → worker + api → db). Container state and volumes
#   are preserved; no data is lost.
#
# PREREQUISITES
#   - beprepared-pod must currently be running
#     (check with: systemctl --user is-active beprepared-pod)
#
# PHASES
#   1. Args   — handle -h/--help; reject unknown flags
#   2. Stop   — systemctl --user stop beprepared-pod
#
# FLAGS / ENV VARS
#   -h, --help   Print this help and exit
#
#   (no env vars — pod name is fixed by the Quadlet files)
#
# USAGE
#   ./scripts/stop.sh
#
# EXAMPLES
#   ./scripts/stop.sh                # graceful shutdown of all services
#   ./scripts/start.sh               # bring everything back up again
#
# Run from the project root.
# =============================================================================
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# No positional arguments are accepted; only -h/--help is valid.

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/stop.sh"
      echo ""
      echo "Stops the full bePrepared pod (all services) via systemctl --user."
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Stop ──────────────────────────────────────────────────────────────────────
# systemd stops member containers in reverse dependency order before stopping
# the pod itself. All data volumes are left intact.

echo "==> Stopping beprepared-pod..."
systemctl --user stop beprepared-pod
echo "==> Pod stopped."
