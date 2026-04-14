# bePrepared — Deployment Scripts

Scripts for installing, managing, and operating the bePrepared Podman pod.
All scripts must be run from the **project root** (the directory that contains `deploy/`, `api/`, `frontend/`, etc.).

For full operational context — Quadlet unit files, backup/restore procedures, environment variable reference, and troubleshooting — see [docs/11-operations-podman.md](../docs/11-operations-podman.md).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Reference](#2-quick-reference)
3. [install.sh](#3-installsh)
4. [uninstall.sh](#4-uninstallsh)
5. [rebuild.sh](#5-rebuildsh)
6. [start.sh](#6-startsh)
7. [stop.sh](#7-stopsh)
8. [restart.sh](#8-restartsh)
9. [status.sh](#9-statussh)
10. [logs.sh](#10-logssh)
11. [db.sh](#11-dbsh)
12. [update.sh](#12-updatesh)
13. [start-dev.sh](#13-start-devsh)
14. [dev.sh](#14-devsh)

---

## 1. Prerequisites

[↑ TOC](#table-of-contents)

| Requirement             | Notes                                               |
| ----------------------- | --------------------------------------------------- |
| Podman ≥ 4.8 (rootless) | `podman --version`                                  |
| systemd user session    | `loginctl enable-linger $USER` for boot persistence |
| `.env` file             | Copy from `.env.example` and fill in all values     |
| Quadlet directory       | Created automatically by `install.sh` if missing    |

```bash
# Verify Podman
podman --version

# Enable linger (services survive logout and reboot)
loginctl enable-linger $USER

# Copy and edit the environment file before running install
cp .env.example .env
$EDITOR .env
```

---

## 2. Quick Reference

[↑ TOC](#table-of-contents)

| Script         | Purpose                                                                        | Key Options                                                                                        |
| -------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `install.sh`   | First-run setup: build images, install Quadlet units, start pod, migrate, seed | `--skip-seed`                                                                                      |
| `uninstall.sh` | Stop pod, remove Quadlet units; optionally wipe volume and images              | `--yes`, `--remove-volumes`, `--remove-images`                                                     |
| `rebuild.sh`   | Rebuild one or more container images and restart affected services             | `api`, `worker`, `frontend` (positional, default: all)                                             |
| `start.sh`     | Start the full pod                                                             | —                                                                                                  |
| `stop.sh`      | Stop the full pod                                                              | —                                                                                                  |
| `restart.sh`   | Restart the pod or a single service                                            | `api`, `worker`, `frontend`, `db` (positional, default: pod)                                       |
| `status.sh`    | Check systemd unit status + API `/health` + frontend reachability              | —                                                                                                  |
| `logs.sh`      | Tail journalctl logs                                                           | `api`, `worker`, `frontend`, `db` (positional, default: all); extra args forwarded to `journalctl` |
| `db.sh`        | Run DB migrations and/or seed inside the API container                         | `migrate`, `seed`, `migrate+seed` (required subcommand)                                            |
| `update.sh`    | `git pull` → rebuild all → restart → migrate → status                          | `--skip-pull`, `--skip-migrate`                                                                    |

All scripts accept `-h` / `--help`.

---

## 3. install.sh

[↑ TOC](#table-of-contents)

**First-run setup.** Builds all container images, installs Quadlet pod/container/volume units, starts the pod, waits for MariaDB, runs migrations, and optionally seeds reference data.

### Synopsis

```
./scripts/install.sh [--skip-seed]
```

### Options

| Option        | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `--skip-seed` | Skip running `db:seed` after migrations (useful for reinstalls where seed data already exists) |
| `-h, --help`  | Show help and exit                                                                             |

### Steps performed

1. Verify `.env` (repo root) exists
2. Build images: `beprepared-api:latest`, `beprepared-worker:latest`, `beprepared-frontend:latest`
3. Copy Quadlet `.pod`, `.container`, and `.volume` files to `~/.config/containers/systemd/`
4. `systemctl --user daemon-reload`
5. `systemctl --user start beprepared-pod`
6. Wait up to 60 s for MariaDB to accept connections
7. Run `db:migrate`
8. Run `db:seed` (unless `--skip-seed`)
9. Call `status.sh` to verify all services are healthy

### Examples

```bash
# Standard first install
./scripts/install.sh

# Reinstall after wiping and restoring a backup — skip seed
./scripts/install.sh --skip-seed
```

---

## 4. uninstall.sh

[↑ TOC](#table-of-contents)

**Full teardown.** Stops and disables project units, removes Podman runtime artifacts, removes Quadlet source files, reloads the daemon, and optionally purges the database volume and local images.

### Synopsis

```
./scripts/uninstall.sh [--yes] [--remove-volumes] [--remove-images]
```

### Options

| Option             | Description                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--yes`            | Skip interactive prompts (non-interactive / CI). Does **not** delete volumes — use `--remove-volumes` for that.                                        |
| `--remove-volumes` | Delete all bePrepared Podman volumes (`systemd-beprepared-db`, `systemd-beprepared-dev`, `systemd-beprepared-dev-db`) — **destroys all database data** |
| `--remove-images`  | Remove local `beprepared-*:latest` container images                                                                                                    |
| `-h, --help`       | Show help and exit                                                                                                                                     |

### Examples

```bash
# Teardown — no prompts; volumes kept, images removed
./scripts/uninstall.sh --yes

# Full clean wipe — no prompts, destroy DB volume and images (e.g. decommission)
./scripts/uninstall.sh --yes --remove-volumes --remove-images

# Interactive teardown — volumes always kept; prompts before removing images
./scripts/uninstall.sh
```

> **Warning:** `--remove-volumes` permanently deletes all MariaDB data. Take a backup first.
> Volumes are **never** deleted unless `--remove-volumes` is explicitly passed — `--yes` alone does not touch data.

---

## 5. rebuild.sh

[↑ TOC](#table-of-contents)

**Rebuild container images and restart services.** Accepts one or more service names as positional arguments. Defaults to rebuilding all three application services if no arguments are provided. Does not touch the database container.

### Synopsis

```
./scripts/rebuild.sh [api] [worker] [frontend]
```

### Arguments

| Argument   | Image rebuilt                | Service restarted     |
| ---------- | ---------------------------- | --------------------- |
| `api`      | `beprepared-api:latest`      | `beprepared-api`      |
| `worker`   | `beprepared-worker:latest`   | `beprepared-worker`   |
| `frontend` | `beprepared-frontend:latest` | `beprepared-frontend` |
| _(none)_   | All three                    | All three             |

### Examples

```bash
# Rebuild everything
./scripts/rebuild.sh

# Rebuild API only (fastest after a backend-only change)
./scripts/rebuild.sh api

# Rebuild API and worker but not frontend
./scripts/rebuild.sh api worker
```

---

## 6. start.sh

[↑ TOC](#table-of-contents)

**Start the full pod.** Equivalent to `systemctl --user start beprepared-pod`. All containers start in dependency order (DB → API → worker, frontend).

### Synopsis

```
./scripts/start.sh
```

### Examples

```bash
./scripts/start.sh
./scripts/status.sh   # verify everything came up
```

---

## 7. stop.sh

[↑ TOC](#table-of-contents)

**Stop the full pod.** Equivalent to `systemctl --user stop beprepared-pod`. Gracefully stops all containers.

### Synopsis

```
./scripts/stop.sh
```

### Examples

```bash
./scripts/stop.sh
```

---

## 8. restart.sh

[↑ TOC](#table-of-contents)

**Restart the pod or a single service.** Without arguments, restarts the full pod. With a service name, restarts only that container — useful after a targeted `rebuild.sh` or configuration change.

### Synopsis

```
./scripts/restart.sh [api|worker|frontend|db]
```

### Arguments

| Argument   | Unit restarted              |
| ---------- | --------------------------- |
| `api`      | `beprepared-api`            |
| `worker`   | `beprepared-worker`         |
| `frontend` | `beprepared-frontend`       |
| `db`       | `beprepared-db`             |
| _(none)_   | `beprepared-pod` (full pod) |

### Examples

```bash
# Restart the full pod
./scripts/restart.sh

# Restart only the API (e.g. after a config change)
./scripts/restart.sh api

# Restart the worker to trigger an immediate alert run
./scripts/restart.sh worker
```

---

## 9. status.sh

[↑ TOC](#table-of-contents)

**Health check for all services.** Checks the systemd active state for all five units, probes the API `/health` endpoint from inside the API container, and checks frontend reachability from inside the frontend container. Exits `0` if all checks pass, `1` if any fail.

### Synopsis

```
./scripts/status.sh
```

### Checks performed

| Check                        | Method                                | Pass condition       |
| ---------------------------- | ------------------------------------- | -------------------- |
| `beprepared-pod` active      | `systemctl --user is-active`          | active               |
| `beprepared-db` active       | `systemctl --user is-active`          | active               |
| `beprepared-api` active      | `systemctl --user is-active`          | active               |
| `beprepared-worker` active   | `systemctl --user is-active`          | active               |
| `beprepared-frontend` active | `systemctl --user is-active`          | active               |
| API `/health`                | `podman exec beprepared-api` → `wget` | HTTP 200             |
| Frontend reachable           | `podman exec beprepared-frontend`     | HTTP 2xx / 3xx / 4xx |

### Examples

```bash
# Run health check
./scripts/status.sh

# Use in a post-deploy pipeline (non-zero exit on failure)
./scripts/status.sh && echo "Deploy OK" || echo "Deploy FAILED"
```

---

## 10. logs.sh

[↑ TOC](#table-of-contents)

**Tail journalctl logs.** Without a service argument, follows all `beprepared*` units. With a service name, scopes to that unit. Any additional arguments are forwarded directly to `journalctl`.

### Synopsis

```
./scripts/logs.sh [api|worker|frontend|db] [journalctl options...]
```

### Arguments

| Argument   | Unit followed           |
| ---------- | ----------------------- |
| `api`      | `beprepared-api`        |
| `worker`   | `beprepared-worker`     |
| `frontend` | `beprepared-frontend`   |
| `db`       | `beprepared-db`         |
| _(none)_   | All `beprepared*` units |

Default behaviour (no extra journalctl args) is `-f` (follow / live tail).

### Examples

```bash
# Follow all units (live tail)
./scripts/logs.sh

# Follow API logs only
./scripts/logs.sh api

# Last 100 lines from the worker, no live follow
./scripts/logs.sh worker -n 100

# API logs since midnight, no live follow
./scripts/logs.sh api --since today

# DB logs from the last 10 minutes
./scripts/logs.sh db --since "10 minutes ago"
```

---

## 11. db.sh

[↑ TOC](#table-of-contents)

**Run database operations.** Executes Drizzle commands inside the running `beprepared-api` container. A subcommand is required.

### Synopsis

```
./scripts/db.sh <migrate|seed|migrate+seed>
```

### Subcommands

| Subcommand     | Command run          | Notes                                       |
| -------------- | -------------------- | ------------------------------------------- |
| `migrate`      | `bun run db:migrate` | Applies all pending Drizzle migrations      |
| `seed`         | `bun run db:seed`    | Inserts reference/default data — idempotent |
| `migrate+seed` | Both in sequence     | Runs migrate first, then seed               |

### Examples

```bash
# Apply pending migrations
./scripts/db.sh migrate

# Re-seed reference data
./scripts/db.sh seed

# Migrate and seed in one step (e.g. after a fresh install)
./scripts/db.sh migrate+seed
```

---

## 12. update.sh

[↑ TOC](#table-of-contents)

**Pull latest code, rebuild, migrate, and verify.** Intended for applying updates to a running installation. Each step calls the appropriate sub-script so the behaviour is consistent with running those scripts individually.

### Synopsis

```
./scripts/update.sh [--skip-pull] [--skip-migrate]
```

### Options

| Option           | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `--skip-pull`    | Skip `git pull` (use when you have already checked out the desired commit) |
| `--skip-migrate` | Skip running DB migrations after rebuild                                   |
| `-h, --help`     | Show help and exit                                                         |

### Steps performed

1. `git pull` (unless `--skip-pull`)
2. `./scripts/rebuild.sh` — rebuild all three images and restart services
3. `./scripts/restart.sh` — ensure full pod is in a clean state
4. `./scripts/db.sh migrate` (unless `--skip-migrate`)
5. `./scripts/status.sh` — verify all services are healthy

### Examples

```bash
# Standard update from latest main
./scripts/update.sh

# Already on the right commit, skip pull
./scripts/update.sh --skip-pull

# Update but do not run migrations (e.g. no schema changes in this release)
./scripts/update.sh --skip-migrate
```

---

## 13. start-dev.sh

[↑ TOC](#table-of-contents)

---

### Purpose

`start-dev.sh` is the **container entrypoint** (`CMD`) declared in `Containerfile.dev`. It is invoked automatically by Podman when the `beprepared-dev` container starts — **it is not run manually by operators**.

To trigger it, rebuild and restart the dev container:

```bash
./scripts/dev.sh
```

### What it does

On every container start, in this order:

1. **Migrate** — runs `bun run db:migrate` (applies pending schema changes; safe to re-run)
2. **Seed** — runs `bun run db:seed` (loads reference data; safe to re-run)
3. **Launch servers** — starts all three dev servers in parallel:
   - `bun run dev:api` — API server
   - `bun run dev:frontend` — Vite dev server
   - `bun run dev:worker` — background worker
4. **Signal handling** — traps `SIGTERM` / `SIGINT`; kills all child processes cleanly on container stop
5. **Crash detection** — `wait`s on all PIDs; exits non-zero if any server crashes (surfaces failure to systemd)

### Ports

| Server   | Container port | Host port | URL                        |
| -------- | -------------- | --------- | -------------------------- |
| API      | 9995           | 9996      | http://localhost:9996      |
| Swagger  | 9995           | 9996      | http://localhost:9996/docs |
| Frontend | 9999           | 9997      | http://localhost:9997      |

### Viewing output

```bash
# Live log tail (migrate/seed output + all three servers)
podman logs -f beprepared-dev

# Via journald
journalctl --user -u beprepared-dev -f
```

### Related

| File                | Role                                                          |
| ------------------- | ------------------------------------------------------------- |
| `Containerfile.dev` | Declares `start-dev.sh` as the container `CMD`                |
| `scripts/dev.sh`    | Builds the dev image and restarts the `beprepared-dev` unit   |
| `scripts/db.sh`     | Run migrations or seed manually against the running container |

---

## 14. dev.sh

[↑ TOC](#table-of-contents)

---

### Purpose

`dev.sh` is the **day-to-day dev workflow script**. It rebuilds the dev
container image and restarts the full dev stack in one command. Run it after
any source change that requires a container rebuild.

```bash
./scripts/dev.sh
```

> **Note:** This script only ever touches the **dev** stack.
> It never builds or restarts any prod container.

---

### Prerequisites

| Requirement            | Details                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Rootless Podman        | Installed and configured for the current user                  |
| systemd user session   | `loginctl enable-linger <user>` if the session doesn't persist |
| `.env` at repo root    | `cp .env.example .env` then fill in real values                |
| `.quadlet/` unit files | Present in the repo root (committed)                           |

---

### What it does

In order:

1. **Guards** — Fails fast with a clear error if:
   - `.env` is missing at the repo root
   - A stale host-level env file exists at `~/.config/containers/systemd/beprepared.env` (leftover from an older setup; would shadow the repo-local `.env`)

2. **Quadlet sync** — Copies every file from `.quadlet/` to
   `~/.config/containers/systemd/`, substituting the `%%REPO_DIR%%` placeholder
   with the absolute path of the repo. This makes the `EnvironmentFile=`
   directive in each unit resolve correctly regardless of where the repo is
   cloned. Runs `systemctl --user daemon-reload` afterwards.

3. **Build** — Runs `podman build -f Containerfile.dev -t beprepared-dev:latest .`
   to produce a fresh dev image.

4. **Restart** — Tears down the running dev stack cleanly and starts it in the
   correct dependency order:

   ```
   pod → db (MariaDB) → workspace (beprepared-dev)
   ```

   Short sleeps between steps give MariaDB time to accept connections before the
   workspace container starts.

5. **Health wait** — Polls host ports **9996** (API) and **9997** (Frontend)
   every 2 s. Exits once both respond, or prints a log hint and exits after 90 s.

---

### Ports

| Server   | Host port | URL                        |
| -------- | --------- | -------------------------- |
| API      | 9996      | http://localhost:9996      |
| Swagger  | 9996      | http://localhost:9996/docs |
| Frontend | 9997      | http://localhost:9997      |

---

### Useful follow-up commands

```bash
# Tail live logs from the dev workspace container
podman logs -f beprepared-dev

# Run DB migrations manually (e.g. after adding a schema file)
podman exec -it beprepared-dev bun run db:migrate

# Re-seed the database
podman exec -it beprepared-dev bun run db:seed

# Run the test suite
podman exec -it beprepared-dev bun test

# Type-check all workspaces
podman exec -it beprepared-dev bun run typecheck
```

---

### Related

| File                   | Role                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `Containerfile.dev`    | Defines the dev image that this script builds                    |
| `scripts/start-dev.sh` | Container entrypoint: runs migrate, seed, and starts all servers |
| `.quadlet/`            | Quadlet unit sources synced to systemd by step 2                 |
| `.env`                 | Runtime secrets and config loaded by the container at start      |
| `scripts/install.sh`   | First-time setup — builds prod images and installs Quadlet units |

---
