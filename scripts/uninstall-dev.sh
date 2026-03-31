#!/usr/bin/env bash
# uninstall-dev.sh — Remove the bePrepared development container
# Usage: ./scripts/uninstall-dev.sh [--yes] [--remove-image]
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
UNIT_NAME="beprepared-dev"
AUTO_YES=false
REMOVE_IMAGE=false

for arg in "$@"; do
  case "$arg" in
    --yes) AUTO_YES=true ;;
    --remove-image) REMOVE_IMAGE=true ;;
    -h|--help)
      echo "Usage: ./scripts/uninstall-dev.sh [--yes] [--remove-image]"
      echo ""
      echo "Options:"
      echo "  --yes           Skip confirmation prompts"
      echo "  --remove-image  Remove localhost/beprepared-dev:latest"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

confirm() {
  local prompt="$1"
  if [[ "$AUTO_YES" == "true" ]]; then
    echo "$prompt [auto-yes]"
    return 0
  fi
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

echo "==> bePrepared uninstall-dev.sh"
echo ""

echo "==> Stopping and disabling $UNIT_NAME..."
systemctl --user stop "$UNIT_NAME" >/dev/null 2>&1 || true
systemctl --user disable "$UNIT_NAME" >/dev/null 2>&1 || true
systemctl --user reset-failed "$UNIT_NAME" >/dev/null 2>&1 || true

echo "==> Removing dev container runtime..."
podman rm -f beprepared-dev >/dev/null 2>&1 || true

echo "==> Removing dev Quadlet unit..."
rm -f "$QUADLET_DIR/beprepared-dev.container"

echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

if [[ "$REMOVE_IMAGE" == "true" ]] || confirm "==> Remove localhost/beprepared-dev:latest?"; then
  echo "==> Removing dev image..."
  podman image rm -f localhost/beprepared-dev:latest >/dev/null 2>&1 || true
else
  echo "==> Dev image kept."
fi

echo ""
echo "==> Dev container uninstall complete."
