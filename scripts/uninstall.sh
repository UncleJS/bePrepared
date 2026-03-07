#!/usr/bin/env bash
# uninstall.sh — Tear down the bePrepared pod and optionally remove data
# Usage: ./scripts/uninstall.sh [--yes] [--remove-volumes] [--remove-images]
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
AUTO_YES=false
REMOVE_VOLUMES=false
REMOVE_IMAGES=false

# ---- Parse args ----
for arg in "$@"; do
  case "$arg" in
    --yes)            AUTO_YES=true ;;
    --remove-volumes) REMOVE_VOLUMES=true ;;
    --remove-images)  REMOVE_IMAGES=true ;;
    -h|--help)
      echo "Usage: ./scripts/uninstall.sh [--yes] [--remove-volumes] [--remove-images]"
      echo ""
      echo "Options:"
      echo "  --yes             Skip all confirmation prompts (non-interactive)"
      echo "  --remove-volumes  Also delete the beprepared-db Podman volume (DATA LOSS)"
      echo "  --remove-images   Also remove local beprepared container images"
      echo "  -h, --help        Show this help message"
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

echo "==> bePrepared uninstall.sh"
echo ""

# ---- 1. Stop pod ----
echo "==> Stopping beprepared-pod..."
systemctl --user stop beprepared-pod 2>/dev/null || echo "    (pod was not running)"

# ---- 2. Remove Quadlet unit files ----
echo "==> Removing Quadlet units from $QUADLET_DIR..."
UNITS_REMOVED=0
for f in beprepared.pod beprepared-api.container beprepared-worker.container beprepared-frontend.container beprepared-db.container; do
  if [[ -f "$QUADLET_DIR/$f" ]]; then
    rm -f "$QUADLET_DIR/$f"
    echo "    removed: $f"
    UNITS_REMOVED=$((UNITS_REMOVED + 1))
  fi
done
if [[ "$UNITS_REMOVED" -eq 0 ]]; then
  echo "    (no units found — already removed?)"
fi

# ---- 3. Reload systemd ----
echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ---- 4. Optionally remove volume ----
if [[ "$REMOVE_VOLUMES" == "true" ]] || confirm "==> Delete Podman volume 'beprepared-db'? (DESTROYS ALL DATABASE DATA)"; then
  echo "==> Removing volume: beprepared-db..."
  podman volume rm beprepared-db 2>/dev/null && echo "    Volume removed." || echo "    (volume not found)"
else
  echo "==> Volume 'beprepared-db' kept."
fi

# ---- 5. Optionally remove images ----
if [[ "$REMOVE_IMAGES" == "true" ]] || confirm "==> Remove local bePrepared container images?"; then
  echo "==> Removing container images..."
  for img in beprepared-api:latest beprepared-worker:latest beprepared-frontend:latest; do
    podman rmi "$img" 2>/dev/null && echo "    removed: $img" || echo "    (not found: $img)"
  done
else
  echo "==> Container images kept."
fi

echo ""
echo "==> Uninstall complete."
echo "    Quadlet units removed from $QUADLET_DIR"
echo "    To reinstall: ./scripts/install.sh"
