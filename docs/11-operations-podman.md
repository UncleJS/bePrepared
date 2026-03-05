# 11 — Operations: Podman

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-operations-orange?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

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
cp deploy/.env.example deploy/.env
# Edit deploy/.env — set DB password, ports, etc.

# 3. Build container images
podman build -f deploy/Containerfile.api     -t beprepared-api:latest .
podman build -f deploy/Containerfile.worker  -t beprepared-worker:latest .
podman build -f deploy/Containerfile.frontend -t beprepared-frontend:latest .

# 4. Install Quadlet units
cp deploy/quadlet/*.container ~/.config/containers/systemd/
cp deploy/quadlet/*.pod       ~/.config/containers/systemd/

# 5. Reload systemd and start the pod
systemctl --user daemon-reload
systemctl --user start beprepared-pod

# 6. Wait ~5s for MariaDB to initialise, then run migrations + seed
podman exec beprepared-api bun run db:migrate
podman exec beprepared-api bun run db:seed
```

The `pod-start.sh` script in `deploy/` wraps steps 4–6 for convenience.

---

## 3. Quadlet Unit Files

[↑ TOC](#table-of-contents)

All unit files live in `deploy/quadlet/`. After copying to `~/.config/containers/systemd/`, systemd generates `.service` files automatically on `daemon-reload`.

### `beprepared.pod`
```ini
[Pod]
PodName=beprepared
PublishPort=3000:3000

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
EnvironmentFile=%h/bePrepared/deploy/.env
Volume=%h/bePrepared/data/mariadb:/var/lib/mysql:Z
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
EnvironmentFile=%h/bePrepared/deploy/.env

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

### `beprepared-worker.container`
```ini
[Unit]
Description=bePrepared Worker (hourly scheduler)
After=beprepared-api.container

[Container]
Image=localhost/beprepared-worker:latest
Pod=beprepared.pod
ContainerName=beprepared-worker
EnvironmentFile=%h/bePrepared/deploy/.env

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
EnvironmentFile=%h/bePrepared/deploy/.env

[Service]
Restart=on-failure

[Install]
WantedBy=beprepared-pod.service
```

---

## 4. Service Management

[↑ TOC](#table-of-contents)

```bash
# Start everything
systemctl --user start beprepared-pod

# Stop everything
systemctl --user stop beprepared-pod

# Restart one service (e.g. after rebuild)
systemctl --user restart beprepared-api

# Check status
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
# Follow API logs
journalctl --user -u beprepared-api -f

# Follow worker logs
journalctl --user -u beprepared-worker -f

# Follow DB logs
journalctl --user -u beprepared-db -f

# All pod logs since last boot
journalctl --user -u 'beprepared*' --since today

# Last 100 lines of API
journalctl --user -u beprepared-api -n 100
```

---

## 6. Database Operations

[↑ TOC](#table-of-contents)

### Run migrations
```bash
podman exec -it beprepared-api bun run db:migrate
```

### Run seeds (idempotent)
```bash
podman exec -it beprepared-api bun run db:seed
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
# 1. Pull latest code
git pull

# 2. Rebuild images
podman build -f deploy/Containerfile.api     -t beprepared-api:latest .
podman build -f deploy/Containerfile.worker  -t beprepared-worker:latest .
podman build -f deploy/Containerfile.frontend -t beprepared-frontend:latest .

# 3. Restart affected services
systemctl --user restart beprepared-api
systemctl --user restart beprepared-worker
systemctl --user restart beprepared-frontend

# 4. Run any new migrations
podman exec -it beprepared-api bun run db:migrate
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
MariaDB data is stored in `~/bePrepared/data/mariadb/`. This directory persists across container restarts and rebuilds. Back up this directory for a raw data backup (stop DB first).

---

## 9. Environment Variables Reference

[↑ TOC](#table-of-contents)

Copy `deploy/.env.example` to `deploy/.env` and fill in values.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DB_HOST` | yes | `127.0.0.1` | Inside pod: use `127.0.0.1` (shared pod network) |
| `DB_PORT` | no | `3306` | |
| `DB_NAME` | yes | `beprepared` | |
| `DB_USER` | yes | — | |
| `DB_PASSWORD` | yes | — | |
| `DB_ROOT_PASSWORD` | yes | — | MariaDB container only |
| `DATABASE_URL` | yes | — | `mysql://user:pass@host:3306/dbname` |
| `PORT` | no | `3001` | API listen port (internal) |
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:3001` | Frontend → API URL |
| `NODE_ENV` | no | `production` | |

---

## 10. Troubleshooting

[↑ TOC](#table-of-contents)

### API won't start — "Can't connect to DB"
```bash
# Check DB is up
systemctl --user status beprepared-db
# Wait for "ready for connections" in DB logs
journalctl --user -u beprepared-db -n 30
# Restart API after DB is ready
systemctl --user restart beprepared-api
```

### Port 3000 already in use
```bash
# Find conflicting process
ss -tlnp | grep 3000
# Edit deploy/.env to change the published port, then reload
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
# Worker runs at startup then every 1h — restart to trigger immediately
systemctl --user restart beprepared-worker
```

### Container image outdated after code change
```bash
# Rebuild the specific image
podman build -f deploy/Containerfile.api -t beprepared-api:latest .
systemctl --user restart beprepared-api
```

---

*Content licensed under CC BY-NC-SA 4.0*
