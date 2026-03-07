# 08 — Architecture

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-architecture-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Layout](#2-monorepo-layout)
3. [Component Map](#3-component-map)
4. [Request Flow](#4-request-flow)
5. [Policy Engine](#5-policy-engine)
6. [Worker / Scheduler](#6-worker--scheduler)
7. [Database Layer](#7-database-layer)
8. [Deployment Topology](#8-deployment-topology)
9. [Key Design Decisions](#9-key-design-decisions)

---

## 1. System Overview

[↑ TOC](#table-of-contents)

**bePrepared** is a three-process web platform deployed as a single rootless Podman pod:

| Process    | Stack                           | Role                                                        |
| ---------- | ------------------------------- | ----------------------------------------------------------- |
| `frontend` | Next.js 15, Tailwind, shadcn/ui | User interface — ticksheets, dashboard, inventory, settings |
| `api`      | Bun + Elysia, Drizzle ORM       | REST API, OpenAPI/Swagger at `/docs`                        |
| `worker`   | Bun (cron)                      | Hourly alert generation — expiry, replacement, maintenance  |

All three share a single MariaDB database. No direct DB access from the frontend — everything goes through the API.

---

## 2. Monorepo Layout

[↑ TOC](#table-of-contents)

```
bePrepared/
├── package.json            # root — bun workspaces: ["frontend","api","worker"]
├── frontend/               # Next.js app
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/            # App Router pages and layouts
│       ├── components/     # shadcn/ui + custom components
│       └── lib/            # API client, utils
├── api/                    # Elysia REST API
│   ├── package.json
│   ├── drizzle.config.ts
│   └── src/
│       ├── index.ts        # Elysia entry + Swagger
│       ├── db/
│       │   ├── client.ts   # mysql2 pool + drizzle instance
│       │   ├── migrate.ts  # run pending migrations
│       │   ├── schema/     # Drizzle table definitions
│       │   └── seeds/      # idempotent seed data
│       ├── lib/
│       │   └── policyEngine.ts  # three-tier policy + four-tier people resolution
│       └── routes/         # Elysia route groups (one dir per resource)
├── worker/                 # Hourly background scheduler
│   ├── package.json
│   └── src/index.ts
├── deploy/                 # Podman / Quadlet deployment artefacts
│   ├── Containerfile.api
│   ├── Containerfile.frontend
│   ├── Containerfile.worker
│   ├── quadlet/            # *.container and *.pod Quadlet unit files
│   └── .env.example
├── scripts/                # Deployment and operations scripts
│   ├── install.sh          # first-run setup
│   ├── uninstall.sh        # full teardown
│   ├── rebuild.sh          # rebuild images + restart services
│   ├── start.sh / stop.sh / restart.sh
│   ├── status.sh           # health check
│   ├── logs.sh             # tail journalctl logs
│   ├── db.sh               # migrate / seed
│   └── update.sh           # git pull + rebuild + migrate + verify
└── docs/                   # This documentation tree
```

---

## 3. Component Map

[↑ TOC](#table-of-contents)

```
┌─────────────────────────────────────────────────────────┐
│                     Podman Pod: beprepared               │
│                                                         │
│  ┌──────────────┐   HTTP (9999)   ┌──────────────────┐  │
│  │  frontend    │────────────────▶│     api           │  │
│  │  Next.js     │ /api/bff/* proxy│  Bun + Elysia    │  │
│  │  :9999       │                 │  :3001            │  │
│  └──────────────┘                 │  /docs (Swagger)  │  │
│                                   └────────┬─────────┘  │
│                                            │             │
│  ┌──────────────┐                          │ Drizzle     │
│  │  worker      │──────────────────────────┤             │
│  │  Bun cron    │    direct DB writes      │             │
│  │  (no port)   │                          │             │
│  └──────────────┘                 ┌────────▼─────────┐  │
│                                   │   MariaDB :3306   │  │
│                                   └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
        Exposed: :9999 (frontend)
```

The `api` and `worker` both connect directly to MariaDB via `mysql2` pool. The `frontend` only speaks to the `api` over HTTP.

---

## 4. Request Flow

[↑ TOC](#table-of-contents)

### Typical UI → API → DB flow

```
Browser
  │
  │  GET /api/bff/planning/:householdId/shelter_in_place
  ▼
Next.js Route Handler (rewrite proxy)
  │
  │  GET http://api:3001/planning/:householdId/shelter_in_place
  ▼
Elysia planningRoute
  │
  │  resolvePlanningTotals(householdId, scenario, manualPeople?)
  ▼
policyEngine.ts
  │  SELECT scenario_policies → household_policies → policy_defaults
  │  SELECT household.target_people + profiles
  ▼
JSON response  →  Next.js  →  Browser render
```

### Worker alert generation flow

```
Worker (every ~1 hour)
  │
  ├── checkExpiryAlerts()
  │     SELECT inventory_lots WHERE expires_at < now() + alert_upcoming_days
  │     INSERT alerts (upsert on duplicate)
  │
  ├── checkReplacementDueAlerts()
  │     SELECT inventory_lots WHERE next_replace_at < cutoff
  │     INSERT alerts (upsert on duplicate)
  │
  └── checkMaintenanceDueAlerts()
        SELECT maintenance_schedules WHERE next_due_at < cutoff
        INSERT alerts (idempotent upsert by entity+category)
```

---

## 5. Policy Engine

[↑ TOC](#table-of-contents)

Located at `api/src/lib/policyEngine.ts`. Implements two resolution chains:

### Policy value (three-tier)

```
1. scenario_policies  (household + scenario override)
         ↓ if absent
2. household_policies (household global override)
         ↓ if absent
3. policy_defaults    (system default)
```

Supported policy keys:

| Key                                | Default | Unit              |
| ---------------------------------- | ------- | ----------------- |
| `water_liters_per_person_per_day`  | 4.0     | liters/person/day |
| `calories_kcal_per_person_per_day` | 2200    | kcal/person/day   |
| `alert_upcoming_days`              | 14      | days              |
| `alert_grace_days`                 | 3       | days              |

### People count (four-tier)

```
1. manual session override  (query param ?people=N)
         ↓ if absent
2. scenario-bound profile   (profile.scenario_bound = active_scenario)
         ↓ if absent
3. active profile           (household.active_profile_id)
         ↓ if absent
4. household baseline       (household.target_people)
```

`resolvePlanningTotals()` multiplies effective values across four time horizons: **72 h**, **14 d**, **30 d**, **90 d**.

---

## 6. Worker / Scheduler

[↑ TOC](#table-of-contents)

`worker/src/index.ts` runs on startup and then on a 1-hour interval (using `setInterval`). It:

- Queries all active households
- For each household, checks inventory expiry, lot replacement due, and maintenance due
- Uses idempotent upsert/update behavior to avoid duplicate active alerts for the same entity+category

The worker shares the same Drizzle schema (imported from `../../api/src/db/schema`) — intentional cross-workspace reference in the monorepo.

---

## 7. Database Layer

[↑ TOC](#table-of-contents)

- **Engine**: MariaDB (configured via `DATABASE_URL` env var)
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Pattern**: archive-only — no `DELETE` statements; `archived_at TIMESTAMP NULL` column on every mutable table
- **Timestamps**: all stored UTC, transported ISO-8601, displayed in UI as local `YYYY-MM-DD HH:mm:ss`
- **IDs**: UUID v4 strings (36-char `VARCHAR`)
- **Migrations**: `bun run db:migrate` runs `api/src/db/migrate.ts` → `drizzle-kit push` or `migrate()`
- **Seeds**: `bun run db:seed` is idempotent — uses `onDuplicateKeyUpdate` throughout

---

## 8. Deployment Topology

[↑ TOC](#table-of-contents)

Everything runs as a **rootless Podman pod** managed by **systemd user services** (Quadlet).

```
~/.config/containers/systemd/
├── beprepared.pod          # pod definition
├── beprepared-db.container
├── beprepared-api.container
├── beprepared-worker.container
└── beprepared-frontend.container
```

Commands:

```bash
systemctl --user daemon-reload
systemctl --user start beprepared-pod
systemctl --user status beprepared-api
journalctl --user -u beprepared-api -f
```

Only **port 9999** (frontend) is published to the host. The API (3001) and DB (3306) are internal to the pod network.

See `docs/11-operations-podman.md` for full operational runbook.

---

## 9. Key Design Decisions

[↑ TOC](#table-of-contents)

| Decision          | Choice                       | Rationale                                                                      |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Runtime           | Bun                          | Fast startup, native TypeScript, built-in test runner                          |
| API framework     | Elysia                       | Native Bun, type-safe, built-in Swagger plugin                                 |
| ORM               | Drizzle                      | Type-safe, no magic, SQL-close, drizzle-kit migrations                         |
| DB                | MariaDB                      | Open-source, battle-tested, Drizzle support, simple for self-hosting           |
| Deletion policy   | Archive-only                 | Audit trail, accidental-delete safety, restore flows                           |
| Auth              | NextAuth + API bearer tokens | Credentials login at `/auth/login`; household/admin scope checks on API routes |
| Container runtime | Podman rootless              | No root daemon, systemd-native, RHEL 10 compatible                             |
| Frontend          | Next.js App Router           | File-based routing, RSC, strong ecosystem                                      |
| ID type           | UUID v4 string               | No integer sequence leakage, safe for future federation                        |
| Timestamps        | UTC in DB, ISO-8601 on wire  | Portable, unambiguous, display-locale handled in UI                            |

---

_Content licensed under CC BY-NC-SA 4.0_
