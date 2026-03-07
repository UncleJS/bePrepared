#!/usr/bin/env bash
# stop.sh — Stop the bePrepared Podman pod
# Usage: ./scripts/stop.sh
# Run from the project root.
set -euo pipefail

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

echo "==> Stopping beprepared-pod..."
systemctl --user stop beprepared-pod
echo "==> Pod stopped."
