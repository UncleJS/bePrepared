#!/usr/bin/env bash
# install-dev.sh — Build and install the bePrepared development container
# Usage: ./scripts/install-dev.sh
# Run from the project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
UNIT_NAME="beprepared-dev"

echo "==> bePrepared install-dev.sh"
echo "    Project root : $PROJECT_ROOT"
echo "    Quadlet dir  : $QUADLET_DIR"
echo ""

if [[ ! -f "$PROJECT_ROOT/Containerfile.dev" ]]; then
  echo "ERROR: $PROJECT_ROOT/Containerfile.dev not found."
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/.quadlet/beprepared-dev.container" ]]; then
  echo "ERROR: $PROJECT_ROOT/.quadlet/beprepared-dev.container not found."
  exit 1
fi

echo "==> Stopping existing dev unit (if running)..."
systemctl --user stop "$UNIT_NAME" >/dev/null 2>&1 || true

echo "==> Building localhost/beprepared-dev:latest..."
podman build -f "$PROJECT_ROOT/Containerfile.dev" -t localhost/beprepared-dev:latest "$PROJECT_ROOT"

echo "==> Installing dev Quadlet unit..."
mkdir -p "$QUADLET_DIR"
cp "$PROJECT_ROOT/.quadlet/beprepared-dev.container" "$QUADLET_DIR/"

echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "==> Starting $UNIT_NAME..."
systemctl --user start "$UNIT_NAME"

echo "==> Verifying $UNIT_NAME..."
systemctl --user is-active --quiet "$UNIT_NAME"
podman container exists beprepared-dev >/dev/null

echo ""
echo "==> Dev container ready."
echo "    Exec shell : podman exec -it beprepared-dev bash"
echo "    Stop unit  : systemctl --user stop $UNIT_NAME"
