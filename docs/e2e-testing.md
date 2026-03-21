# E2E Testing

## Purpose

This project uses Playwright for browser E2E coverage in the dedicated `e2e/` workspace.

- Real browser: Chromium
- Real frontend: Next.js on `127.0.0.1:9998`
- Real API: Elysia on `127.0.0.1:3002`
- Real database: MariaDB seeded with deterministic demo data

The Playwright config starts the frontend and API automatically. You only need to provide a test MariaDB instance and the expected environment variables.

## Prerequisites

- `bun install`
- `bun run test:e2e:install`
- Rootless Podman available locally

## Local Database Setup

Start a dedicated E2E MariaDB instance with Podman:

```bash
podman run -d \
  --name beprepared-e2e-db \
  -e MARIADB_DATABASE=beprepared_e2e \
  -e MARIADB_USER=beprepared \
  -e MARIADB_PASSWORD=beprepared \
  -e MARIADB_ROOT_PASSWORD=root \
  -p 127.0.0.1:13306:3306 \
  docker.io/library/mariadb:11
```

If the container already exists:

```bash
podman start beprepared-e2e-db
```

Optional readiness check:

```bash
podman exec beprepared-e2e-db mariadb-admin ping -h 127.0.0.1 -uroot -proot --silent
```

## Required Environment

```bash
export DB_HOST=127.0.0.1
export DB_PORT=13306
export DB_USER=beprepared
export DB_PASSWORD=beprepared
export DB_NAME=beprepared_e2e

export AUTH_SECRET=e2e-auth-secret
export API_AUTH_SECRET=e2e-auth-secret
export SEED_ADMIN_PASSWORD=e2e-admin-password

export API_PORT=3002
export FRONTEND_PORT=9998
export NEXTAUTH_URL=http://127.0.0.1:9998
export NEXTAUTH_API_URL=http://127.0.0.1:3002
export NEXT_PUBLIC_API_URL=http://127.0.0.1:3002
export CORS_ORIGINS=http://127.0.0.1:9998

export NODE_ENV=test
export AUTH_ENABLED=true
```

## Full Local Run

```bash
bun run db:migrate
bun run db:seed
bun run test:e2e
```

Useful variants:

```bash
bun run test:e2e:ui
bun run --cwd e2e test auth.spec.ts
bun run --cwd e2e test modules.spec.ts
```

## Shard Debugging

CI runs the browser suite in two shards and uploads Playwright blob reports. You can reproduce that split locally.

Run one shard:

```bash
bun run --cwd e2e test -- --shard=1/2 --reporter=blob
bun run --cwd e2e test -- --shard=2/2 --reporter=blob
```

Merge shard output into a local HTML report:

```bash
bun run test:e2e:merge
```

Artifacts are written to:

- `e2e/blob-report/`
- `e2e/playwright-report/`
- `e2e/test-results/`

## Common Troubleshooting

- Port collision on `9998` or `3002`: stop old local dev servers or override `FRONTEND_PORT` / `API_PORT`
- Auth failures in setup: confirm `SEED_ADMIN_PASSWORD` matches the seeded admin user
- Empty or stale test data: rerun `bun run db:migrate` and `bun run db:seed`
- Browser missing in CI-like environments: run `bun run test:e2e:install:ci`

## Cleanup

```bash
podman stop beprepared-e2e-db
```
