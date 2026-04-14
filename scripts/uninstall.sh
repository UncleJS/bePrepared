#!/usr/bin/env bash
# =============================================================================
# uninstall.sh — Tear down the bePrepared pod and clean up systemd units
# =============================================================================
#
# PURPOSE
#   Fully removes the bePrepared installation from the current user's systemd
#   session. Stops and disables all units, removes Podman runtime artifacts
#   (pods and containers), deletes Quadlet unit files from the systemd
#   directory, and reloads the daemon. Data volumes and container images are
#   kept by default to prevent accidental data loss — pass explicit flags to
#   remove them.
#
#   Covers both the prod stack and the dev stack in one run. Safe to call
#   repeatedly; missing units and containers are silently skipped.
#
# PREREQUISITES
#   - systemd user session active
#   - Podman available
#   - No other processes depending on bePrepared volumes (or use --remove-volumes)
#
# PHASES
#   1. Args            — parse --yes / --remove-volumes / --remove-images;
#                        handle -h/--help
#   2. Stop            — systemctl stop all known units (errors suppressed)
#   3. Disable         — systemctl disable all known units (errors suppressed)
#   4. Runtime cleanup — podman pod rm + podman rm for all known containers
#   5. Reset failed    — clear systemd failed state for all known units
#   6. Unit file removal — rm Quadlet files from ~/.config/containers/systemd/
#   7. systemd reload  — daemon-reload so systemd forgets the removed units
#   8. Volumes         — podman volume rm (only with --remove-volumes; DATA LOSS)
#   9. Images          — podman rmi (only with --remove-images or interactive y)
#
# FLAGS / ENV VARS
#   --yes              Skip all interactive confirmation prompts (CI / scripted use)
#   --remove-volumes   Also delete named Podman volumes — DESTROYS ALL DB DATA
#                      Volumes: systemd-beprepared-db, systemd-beprepared-dev,
#                               systemd-beprepared-dev-db
#   --remove-images    Also remove all local bePrepared container images
#                      without prompting (implies --yes for the image step)
#   -h, --help         Print this help and exit
#
#   (no env vars — unit and container names are hard-coded constants)
#
# USAGE
#   ./scripts/uninstall.sh [--yes] [--remove-volumes] [--remove-images]
#
# EXAMPLES
#   ./scripts/uninstall.sh                               # safe uninstall, keep data
#   ./scripts/uninstall.sh --yes                         # non-interactive, keep data
#   ./scripts/uninstall.sh --yes --remove-volumes        # full wipe including DB data
#   ./scripts/uninstall.sh --yes --remove-volumes --remove-images  # complete cleanup
#
# Run from the project root.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
AUTO_YES=false
REMOVE_VOLUMES=false
REMOVE_IMAGES=false

# Known units — prod first, then dev. Used for stop/disable/reset-failed.
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

# Quadlet files to remove from QUADLET_DIR.
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

# ── Args ──────────────────────────────────────────────────────────────────────
# All flags are optional. Parse them before doing any work so --help exits
# cleanly and destructive flags are clearly visible before execution starts.

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

# ── Stop ──────────────────────────────────────────────────────────────────────
# Gracefully stop every known unit. Errors are suppressed because units may
# already be stopped or may never have been started.

stop_units() {
  echo "==> Stopping systemd user units..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user stop "$unit" >/dev/null 2>&1 || true
  done
}

# ── Disable ───────────────────────────────────────────────────────────────────
# Prevent units from auto-starting on next login. Errors are suppressed for
# the same reason as stop.

disable_units() {
  echo "==> Disabling systemd user units..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user disable "$unit" >/dev/null 2>&1 || true
  done
}

# ── Runtime cleanup ───────────────────────────────────────────────────────────
# Remove Podman pods and containers that may have been left behind after
# systemd stopped the units. Errors are suppressed for missing containers.

remove_runtime() {
  echo "==> Removing Podman runtime artifacts..."
  podman pod rm -f beprepared >/dev/null 2>&1 || true
  podman pod rm -f beprepared-dev >/dev/null 2>&1 || true
  for container in "${PROJECT_CONTAINERS[@]}"; do
    podman rm -f "$container" >/dev/null 2>&1 || true
  done
}

# ── Reset failed ──────────────────────────────────────────────────────────────
# Clear the failed state from systemd's unit cache. Without this, a future
# install.sh / start.sh would be blocked by stale failed-state records.

reset_failed_units() {
  echo "==> Clearing systemd failed state..."
  for unit in "${PROJECT_UNITS[@]}"; do
    systemctl --user reset-failed "$unit" >/dev/null 2>&1 || true
  done
}

# ── Unit file removal ─────────────────────────────────────────────────────────
# Delete Quadlet unit files from the systemd user-unit directory. A count is
# printed so it's obvious if files were already removed by a prior run.

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

# ── systemd reload ────────────────────────────────────────────────────────────
# Reload after removing unit files so systemd no longer shows the units in
# `systemctl --user list-units`.

echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

# ── Volumes ───────────────────────────────────────────────────────────────────
# Named volumes are skipped by default to protect DB data. Pass --remove-volumes
# to delete them. This is IRREVERSIBLE — there is no automated restore path.

if [[ "$REMOVE_VOLUMES" == "true" ]]; then
  echo "==> Removing named volumes..."
  for volume in "${PROJECT_VOLUMES[@]}"; do
    podman volume rm -f "$volume" >/dev/null 2>&1 && echo "    removed: $volume" || echo "    (not found: $volume)"
  done
else
  echo "==> Volumes kept (systemd-beprepared-db, systemd-beprepared-dev, systemd-beprepared-dev-db)."
  echo "    Pass --remove-volumes to delete them (DATA LOSS — no automated restore)."
fi

# ── Images ────────────────────────────────────────────────────────────────────
# Container images are large and can be rebuilt from source, so they are
# removed only when --remove-images is passed or the user confirms interactively.

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
