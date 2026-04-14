# 11 — Operations: Podman

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-operations-orange?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--04--14-informational?style=flat-square)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-Run Setup](#2-first-run-setup)
3. [Quadlet Unit Files](#3-quadlet-unit-files)
4. [Service Management](#4-service-management)
5. [Logs](#5-logs)
6. [Database Operations](#6-database-operations)
7. [Updates and Rebuilds](#7-updates-and-rebuilds)
8. [Backup and Restore](#8-backup-and-restore)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

[↑ TOC](#table-of-contents)

- Podman ≥ 4.8 (rootless)
- systemd user session (`loginctl enable-linger $USER` for boot persistence)
- Bun ≥ 1.1 (build host only — not needed inside containers)
- `~/.config/containers/systemd/` directory exists

```bash
# Verify podman
podman --version

# Enable linger (survives logout/reboot)
loginctl enable-linger $USER

# Create Quadlet directory
mkdir -p ~/.config/containers/systemd
```

---

## 2. First-Run Setup

[↑ TOC](#table-of-contents)

```bash
# 1. Clone or extract the project
cd ~/bePrepared

# 2. Copy and edit secrets
cp .env.example .env
# Edit .env — set DB password, ports, AUTH_SECRET, etc.

# 3. Run the install script (handles steps 3–6 automatically)
./scripts/install.sh
```

`install.sh` builds all three container images, installs Quadlet unit files, starts the pod, waits for MariaDB, runs migrations, and seeds reference data. Pass `--skip-seed` to skip seeding on reinstalls.

To run the steps manually instead:

```bash
# Build container images
podman build -f deploy/Containerfile.api      -t beprepared-api:latest .
podman build -f deploy/Containerfile.worker   -t beprepared-worker:latest .
podman build -f deploy/Containerfile.frontend -t beprepared-frontend:latest .

# Install Quadlet units
cp deploy/quadlet/*.container ~/.config/containers/systemd/
cp deploy/quadlet/*.pod       ~/.config/containers/systemd/

# Reload systemd and start the pod
systemctl --user daemon-reload
systemctl --user start beprepared-pod

# Wait ~5s for MariaDB to initialise, then run migrations + seed
podman exec beprepared-api bun run db:migrate
podman exec beprepared-api bun run db:seed
```

---

## 3. Quadlet Unit Files

[↑ TOC](#table-of-contents)

All unit files live in `deploy/quadlet/`. After copying to `~/.config/containers/systemd/`, systemd generates `.service` files automatically on `daemon-reload`.

### `beprepared.pod`

```ini
[Pod]
PodName=beprepared
PublishPort=9999:9999

[Install]
WantedBy=default.target
```

### `beprepared-db.container`

```ini
[Unit]
Description=bePrepared MariaDB
After=beprepared-pod.service

[Container]
Image=docker.io/library/mariadb:11
Pod=beprepared.pod
ContainerName=beprepared-db
EnvironmentFile=%h/0_opencode/bePrepared/.env
Volume=%h/0_opencode/bePrepared/data/mariadb:/var/lib/mysql:Z
Environment=MARIADB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
Environment=MARIADB_DATABASE=${DB_NAME}
Environment=MARIADB_USER=${DB_USER}
Environment=MARIADB_PASSWORD=${DB_PASSWORD}

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

### `beprepared-api.container`

```ini
[Unit]
Description=bePrepared API
After=beprepared-db.container

[Container]
Image=localhost/beprepared-api:latest
Pod=beprepared.pod
ContainerName=beprepared-api
EnvironmentFile=%h/0_opencode/bePrepared/.env

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

### `beprepared-worker.container`

```ini
[Unit]
Description=bePrepared Worker (15 min scheduler)
After=beprepared-api.container

[Container]
Image=localhost/beprepared-worker:latest
Pod=beprepared.pod
ContainerName=beprepared-worker
EnvironmentFile=%h/0_opencode/bePrepared/.env
PodmanArgs=--read-only
PodmanArgs=--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m
PodmanArgs=--security-opt=no-new-privileges
PodmanArgs=--cap-drop=all

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

### `beprepared-frontend.container`

```ini
[Unit]
Description=bePrepared Frontend
After=beprepared-api.container

[Container]
Image=localhost/beprepared-frontend:latest
Pod=beprepared.pod
ContainerName=beprepared-frontend
EnvironmentFile=%h/0_opencode/bePrepared/.env
PodmanArgs=--read-only
PodmanArgs=--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m
PodmanArgs=--security-opt=no-new-privileges
PodmanArgs=--cap-drop=all

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

---

## 4. Service Management

[↑ TOC](#table-of-contents)

Use the scripts in `scripts/` for common operations, or run the underlying `systemctl` commands directly.

```bash
# Start everything
./scripts/start.sh
# or: systemctl --user start beprepared-pod

# Stop everything
./scripts/stop.sh
# or: systemctl --user stop beprepared-pod

# Restart full pod
./scripts/restart.sh
# or: systemctl --user restart beprepared-pod

# Restart one service (e.g. after rebuild)
./scripts/restart.sh api
# or: systemctl --user restart beprepared-api

# Check health (all units + API /health + frontend)
./scripts/status.sh

# Raw status of a unit
systemctl --user status beprepared-api
systemctl --user status beprepared-db
systemctl --user status beprepared-worker
systemctl --user status beprepared-frontend

# List all beprepared units
systemctl --user list-units 'beprepared*'

# Enable auto-start on boot (requires linger)
systemctl --user enable beprepared-pod
```

---

## 5. Logs

[↑ TOC](#table-of-contents)

```bash
# Follow all bePrepared unit logs (live tail)
./scripts/logs.sh

# Follow a specific service
./scripts/logs.sh api
./scripts/logs.sh worker
./scripts/logs.sh db

# Last 100 lines of API, no follow
./scripts/logs.sh api -n 100

# API logs since midnight
./scripts/logs.sh api --since today

# Raw journalctl equivalents
journalctl --user -u beprepared-api -f
journalctl --user -u beprepared-worker -f
journalctl --user -u beprepared-db -f
journalctl --user -u 'beprepared*' --since today
journalctl --user -u beprepared-api -n 100
```

---

## 6. Database Operations

[↑ TOC](#table-of-contents)

### Run migrations

```bash
./scripts/db.sh migrate
# or: podman exec -it beprepared-api bun run db:migrate
```

### Run seeds (idempotent)

```bash
./scripts/db.sh seed
# or: podman exec -it beprepared-api bun run db:seed
```

### Migrate then seed in one step

```bash
./scripts/db.sh migrate+seed
```

### Open a MariaDB shell

```bash
podman exec -it beprepared-db mariadb \
  -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

### Check table row counts

```sql
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'beprepared'
ORDER BY table_name;
```

---

## 7. Updates and Rebuilds

[↑ TOC](#table-of-contents)

```bash
# Full update: git pull → rebuild all → restart → migrate → status check
./scripts/update.sh

# Already on the right commit, skip pull
./scripts/update.sh --skip-pull

# Rebuild a single service after a targeted code change
./scripts/rebuild.sh api
./scripts/rebuild.sh worker
./scripts/rebuild.sh frontend

# Rebuild all three manually
./scripts/rebuild.sh
```

Manual steps (equivalent to `update.sh`):

```bash
# 1. Pull latest code
git pull

# 2. Rebuild images
podman build -f deploy/Containerfile.api      -t beprepared-api:latest .
podman build -f deploy/Containerfile.worker   -t beprepared-worker:latest .
podman build -f deploy/Containerfile.frontend -t beprepared-frontend:latest .

# 3. Restart affected services
systemctl --user restart beprepared-api
systemctl --user restart beprepared-worker
systemctl --user restart beprepared-frontend

# 4. Run any new migrations
podman exec -it beprepared-api bun run db:migrate

# 5. Run post-restart verification checks
./scripts/status.sh
```

Images are tagged `:latest` locally — no registry required.

---

## 8. Backup and Restore

[↑ TOC](#table-of-contents)

### Backup (MariaDB dump)

```bash
# Full dump
podman exec beprepared-db mariadb-dump \
  -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  > backup-$(date +%Y%m%d-%H%M%S).sql

# Compress
gzip backup-*.sql
```

### Restore

```bash
# Stop API and worker first to prevent writes
systemctl --user stop beprepared-api beprepared-worker

# Restore dump
gunzip -c backup-YYYYMMDD-HHmmss.sql.gz | \
  podman exec -i beprepared-db mariadb \
  -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Restart
systemctl --user start beprepared-api beprepared-worker
```

### Data volume location

MariaDB data is stored in `~/0_opencode/bePrepared/data/mariadb/`. This directory persists across container restarts and rebuilds. Back up this directory for a raw data backup (stop DB first).

### Restore drill cadence (recommended)

Run a restore drill on a regular schedule (for example, monthly) to confirm backups are actually recoverable.

Suggested drill process:

1. Pick a recent compressed dump (`backup-*.sql.gz`) and record its filename.
2. Stop write-producing services:
   - `systemctl --user stop beprepared-api beprepared-worker`
3. Restore the selected dump using the restore command above.
4. Start services:
   - `systemctl --user start beprepared-api beprepared-worker`
5. Run verification checks:
   - `./scripts/status.sh`
6. Confirm data sanity with a small query set (example: key table counts, latest alerts/tasks rows).

Pass/fail criteria:

- Pass: restore completes without SQL errors, services are healthy, and core tables are readable.
- Fail: restore aborts, services fail checks, or critical tables are missing/inconsistent.

Record for each drill:

- dump filename and timestamp
- operator name
- duration
- result (pass/fail)
- follow-up actions for any failures

---

## 9. Environment Variables Reference

[↑ TOC](#table-of-contents)

Copy `.env.example` to `.env` and fill in values.

| Variable                             | Required | Default                 | Notes                                                    |
| ------------------------------------ | -------- | ----------------------- | -------------------------------------------------------- |
| `DB_HOST`                            | yes      | `127.0.0.1`             | Inside pod: use `127.0.0.1` (shared pod network)         |
| `DB_PORT`                            | no       | `3306`                  |                                                          |
| `DB_NAME`                            | yes      | `beprepared`            |                                                          |
| `DB_USER`                            | yes      | —                       |                                                          |
| `DB_PASSWORD`                        | yes      | —                       |                                                          |
| `DB_ROOT_PASSWORD`                   | yes      | —                       | MariaDB container only                                   |
| `DATABASE_URL`                       | yes      | —                       | `mysql://user:pass@host:3306/dbname`                     |
| `PORT`                               | no       | `9995`                  | API listen port (internal)                               |
| `VITE_API_URL`                       | yes      | `http://localhost:9995` | Browser API base URL (used by the Vite SPA at runtime)   |
| `CORS_ORIGINS`                       | yes      | `http://localhost:9999` | Comma-separated allowed browser origins                  |
| `ALLOW_LOCALHOST_CORS_IN_PRODUCTION` | no       | `false`                 | Production guard override for localhost origins          |
| `AUTH_SECRET`                        | yes      | —                       | Random secret for JWT signing; `openssl rand -base64 32` |
| `AUTH_ENABLED`                       | no       | `true`                  | Set `false` only for local dev (never in production)     |
| `WORKER_INTERVAL_MS`                 | no       | `900000`                | Alert worker run interval in ms (default = 15 minutes)   |
| `NODE_ENV`                           | no       | `production`            |                                                          |

---

## 10. Troubleshooting

[↑ TOC](#table-of-contents)

### Degraded mode recovery runbook

Use this sequence when one or more services are unhealthy after restart, deploy, or host reboot.

```bash
# 1) Snapshot current status
systemctl --user list-units 'beprepared*'

# 2) Recover DB first (base dependency)
systemctl --user restart beprepared-db
journalctl --user -u beprepared-db -n 50

# 3) Recover API after DB is ready
systemctl --user restart beprepared-api
journalctl --user -u beprepared-api -n 50

# 4) Recover worker and frontend
systemctl --user restart beprepared-worker beprepared-frontend

# 5) Run post-restart checks
./scripts/status.sh
```

If checks fail repeatedly:

- Re-run migrations: `podman exec beprepared-api bun run db:migrate`
- Restart full pod: `systemctl --user restart beprepared-pod`
- Restore from latest validated backup (section 8) if data integrity is suspected

### API won't start — "Can't connect to DB"

```bash
# Check DB is up
systemctl --user status beprepared-db
# Wait for "ready for connections" in DB logs
journalctl --user -u beprepared-db -n 30
# Restart API after DB is ready
systemctl --user restart beprepared-api
```

### Port 9999 already in use

```bash
# Find conflicting process
ss -tlnp | grep 9999
# Edit .env to change the published port, then reload
systemctl --user daemon-reload && systemctl --user restart beprepared-pod
```

### Quadlet units not found by systemd

```bash
# Verify files are in the right place
ls ~/.config/containers/systemd/
# Reload and check for parse errors
systemctl --user daemon-reload
systemctl --user status beprepared-pod
```

### Worker not generating alerts

```bash
# Check worker logs
journalctl --user -u beprepared-worker -n 50
# Worker runs at startup then every 15 minutes by default — restart to trigger immediately
systemctl --user restart beprepared-worker
```

### Container image outdated after code change

```bash
# Rebuild the specific image
podman build -f deploy/Containerfile.api -t beprepared-api:latest .
systemctl --user restart beprepared-api
```

---

_Content licensed under CC BY-NC-SA 4.0_
