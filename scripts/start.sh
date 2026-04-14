#!/usr/bin/env bash
# =============================================================================
# start.sh — Start the bePrepared Podman pod (all prod services)
# =============================================================================
#
# PURPOSE
#   Convenience wrapper around `systemctl --user start beprepared-pod`.
#   Starting the pod brings up every service defined in the Quadlet pod unit:
#   beprepared-db, beprepared-api, beprepared-worker, and beprepared-frontend.
#   Use stop.sh / restart.sh for lifecycle management of individual services.
#
# PREREQUISITES
#   - Quadlet unit files installed to ~/.config/containers/systemd/
#     (run ./scripts/install.sh on first use)
#   - Container images built (./scripts/rebuild.sh if needed)
#   - .env present at repo root with correct values
#
# PHASES
#   1. Args    — handle -h/--help; reject unknown flags
#   2. Start   — systemctl --user start beprepared-pod
#
# FLAGS / ENV VARS
#   -h, --help   Print this help and exit
#
#   (no env vars — unit and pod names are fixed by the Quadlet files)
#
# USAGE
#   ./scripts/start.sh
#
# EXAMPLES
#   ./scripts/start.sh               # start everything
#   ./scripts/status.sh              # verify after starting
#
# Run from the project root.
# =============================================================================
set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# No positional arguments are accepted; only -h/--help is valid.

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./scripts/start.sh"
      echo ""
      echo "Starts the full bePrepared pod (all services) via systemctl --user."
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Start ─────────────────────────────────────────────────────────────────────
# Podman Quadlet's pod unit brings up all member containers in the order defined
# by their Requires= / After= directives (db → api + worker → frontend).

echo "==> Starting beprepared-pod..."
systemctl --user start beprepared-pod
echo "==> Pod started."
echo "    Run ./scripts/status.sh to verify."
