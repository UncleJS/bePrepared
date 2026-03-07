#!/usr/bin/env bash
# start.sh — Start the bePrepared Podman pod
# Usage: ./scripts/start.sh
# Run from the project root.
set -euo pipefail

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

echo "==> Starting beprepared-pod..."
systemctl --user start beprepared-pod
echo "==> Pod started."
echo "    Run ./scripts/status.sh to verify."
