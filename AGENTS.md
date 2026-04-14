# bePrepared — project AGENTS

## Project overview

Disaster preparedness system — household readiness from 72h to 90-day self-sufficiency.
Monorepo: `api` (Bun + Elysia) · `frontend` (Vite + React 19) · `worker` (Bun) · `shared` · `e2e` (Playwright).

## Dev container

Project: `beprepared` | Image: `localhost/beprepared-dev:latest`

### Rebuild and restart (after any source change)

```bash
./scripts/dev.sh
```

`scripts/dev.sh` builds the image and restarts the Quadlet unit. **Only ever rebuild dev — never prod.**

### First-time setup

```bash
cp .env.example .env   # fill in real values
# Install quadlet units (copy .quadlet/ files to systemd)
cp .quadlet/*.container .quadlet/*.pod .quadlet/*.volume \
   ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start beprepared-dev-pod beprepared-dev-db beprepared-dev
```

### Exec into the dev container

```bash
podman exec -it beprepared-dev bun run dev:api
podman exec -it beprepared-dev bun run dev:frontend
podman exec -it beprepared-dev bun run dev:worker
podman exec -it beprepared-dev bun run db:migrate
podman exec -it beprepared-dev bun run db:seed
podman exec -it beprepared-dev bun test
podman exec -it beprepared-dev bun run typecheck
```

## Ports

All bePrepared ports live in the range **9980–9999** so dev and prod can run simultaneously.

### Dev

| Service                 | Port                       |
| ----------------------- | -------------------------- |
| Frontend (Vite + React) | 9997                       |
| API (Elysia)            | 9996                       |
| API Swagger docs        | http://localhost:9996/docs |
| MariaDB (dev, internal) | 3306                       |

### Prod

| Service                  | Port                       |
| ------------------------ | -------------------------- |
| Frontend (Vite + React)  | 9999                       |
| API (Elysia)             | 9995                       |
| API Swagger docs         | http://localhost:9995/docs |
| phpMyAdmin               | 9998                       |
| MariaDB (prod, internal) | 3306                       |

## Container names

| Container     | Name                  |
| ------------- | --------------------- |
| Dev workspace | `beprepared-dev`      |
| Dev database  | `beprepared-dev-db`   |
| Prod API      | `beprepared-api`      |
| Prod frontend | `beprepared-frontend` |
| Prod worker   | `beprepared-worker`   |
| Prod database | `beprepared-db`       |

## Prod images (never rebuild unless explicitly requested)

| Image                                  | Containerfile                   |
| -------------------------------------- | ------------------------------- |
| `localhost/beprepared-api:latest`      | `deploy/Containerfile.api`      |
| `localhost/beprepared-frontend:latest` | `deploy/Containerfile.frontend` |
| `localhost/beprepared-worker:latest`   | `deploy/Containerfile.worker`   |

## Env files

- `.env.example` — committed; canonical placeholder at **repo root**
- `.env` — gitignored; real secrets at **repo root**
- `deploy/.env.example` — prod-ops reference only; canonical is repo root

## Teardown helpers

```bash
systemctl --user stop beprepared-dev beprepared-dev-db beprepared-dev-pod-pod
systemctl --user disable beprepared-dev beprepared-dev-db beprepared-dev-pod-pod
podman rm -f beprepared-dev beprepared-dev-db
podman image rm -f localhost/beprepared-dev:latest
systemctl --user daemon-reload
# Purge data volumes (destructive — only when needed):
# podman volume rm beprepared-dev beprepared-dev-db
```
