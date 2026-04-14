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

PROJECT_UNITS=(
  # prod
  beprepared-pod
  beprepared-db
  beprepared-api
  beprepared-worker
  beprepared-frontend
  beprepared-db-volume
  # dev
  beprepared-dev-pod
  beprepared-dev
  beprepared-dev-db
  beprepared-dev-db-volume
  beprepared-dev-volume
)

PROJECT_UNIT_FILES=(
  # prod
  beprepared.pod
  beprepared-db.container
  beprepared-api.container
  beprepared-worker.container
  beprepared-frontend.container
  beprepared-db.volume
  # dev
  beprepared-dev-pod.pod
  beprepared-dev.container
  beprepared-dev-db.container
  beprepared-dev-db.volume
  beprepared-dev.volume
)

PROJECT_CONTAINERS=(
  beprepared-db beprepared-api beprepared-worker beprepared-frontend
  beprepared-dev beprepared-dev-db
)
PROJECT_IMAGES=(
  localhost/beprepared-api:latest
  localhost/beprepared-worker:latest
  localhost/beprepared-frontend:latest
  localhost/beprepared-dev:latest
)
PROJECT_VOLUMES=(
  systemd-beprepared-db
  systemd-beprepared-dev
  systemd-beprepared-dev-db
)

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
      echo "  --remove-volumes  Also delete all bePrepared Podman volumes (DATA LOSS)"
      echo "                    (systemd-beprepared-db, systemd-beprepared-dev, systemd-beprepared-dev-db)"
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

stop_units() {
  echo "==> Stopping systemd user units..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user stop "$unit" >/dev/null 2>&1 || true
  done
}

disable_units() {
  echo "==> Disabling systemd user units..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user disable "$unit" >/dev/null 2>&1 || true
  done
}

remove_runtime() {
  echo "==> Removing Podman runtime artifacts..."
  podman pod rm -f beprepared >/dev/null 2>&1 || true
  podman pod rm -f beprepared-dev >/dev/null 2>&1 || true
  for container in "${PROJECT_CONTAINERS[@]}"; do
    podman rm -f "$container" >/dev/null 2>&1 || true
  done
}

reset_failed_units() {
  echo "==> Clearing systemd failed state..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user reset-failed "$unit" >/dev/null 2>&1 || true
  done
}

remove_unit_files() {
  echo "==> Removing Quadlet units from $QUADLET_DIR..."
  local removed=0
  for file in "${PROJECT_UNIT_FILES[@]}"; do
    if [[ -f "$QUADLET_DIR/$file" ]]; then
      rm -f "$QUADLET_DIR/$file"
      echo "    removed: $file"
      removed=$((removed + 1))
    fi
  done
  if [[ "$removed" -eq 0 ]]; then
    echo "    (no units found — already removed?)"
  fi
}

stop_units
disable_units
remove_runtime
reset_failed_units
remove_unit_files

# ---- Reload systemd ----
echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ---- Optionally remove volume ----
if [[ "$REMOVE_VOLUMES" == "true" ]]; then
  echo "==> Removing named volumes..."
  for volume in "${PROJECT_VOLUMES[@]}"; do
    podman volume rm -f "$volume" >/dev/null 2>&1 && echo "    removed: $volume" || echo "    (not found: $volume)"
  done
else
  echo "==> Volumes kept (systemd-beprepared-db, systemd-beprepared-dev, systemd-beprepared-dev-db).  Pass --remove-volumes to delete (DATA LOSS)."
fi

# ---- Optionally remove images ----
if [[ "$REMOVE_IMAGES" == "true" ]] || confirm "==> Remove local bePrepared container images?"; then
  echo "==> Removing container images..."
  for img in "${PROJECT_IMAGES[@]}"; do
    podman rmi "$img" 2>/dev/null && echo "    removed: $img" || echo "    (not found: $img)"
  done
else
  echo "==> Container images kept."
fi

echo ""
echo "==> Uninstall complete."
echo "    Quadlet units removed from $QUADLET_DIR"
echo "    To reinstall: ./scripts/install.sh"
