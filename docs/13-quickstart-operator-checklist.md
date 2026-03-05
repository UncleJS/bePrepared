# 13 — Quickstart & Operator Checklist

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-quickstart-green?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

---

## Table of Contents

1. [5-Minute Local Dev Start](#1-5-minute-local-dev-start)
2. [Production Deploy Checklist](#2-production-deploy-checklist)
3. [First Use: Household Setup](#3-first-use-household-setup)
4. [Daily Operator Checks](#4-daily-operator-checks)
5. [Weekly Operator Checks](#5-weekly-operator-checks)
6. [Monthly Operator Checks](#6-monthly-operator-checks)
7. [Troubleshooting Quick Reference](#7-troubleshooting-quick-reference)
8. [Useful One-Liners](#8-useful-one-liners)

---

## 1. 5-Minute Local Dev Start

[↑ TOC](#table-of-contents)

```bash
# Prerequisites: Bun ≥ 1.1, MariaDB running locally

git clone <repo> bePrepared && cd bePrepared

# Install all workspace deps
bun install

# Start MariaDB (local, not containerised)
# — or — use a quick podman one-liner:
podman run -d --name bp-dev-db \
  -e MARIADB_ROOT_PASSWORD=root \
  -e MARIADB_DATABASE=beprepared \
  -e MARIADB_USER=bpuser \
  -e MARIADB_PASSWORD=bppass \
  -p 3306:3306 \
  docker.io/library/mariadb:11

# Set env
export DATABASE_URL="mysql://bpuser:bppass@localhost:3306/beprepared"

# Push schema + run seed
cd api
bun run db:migrate
bun run db:seed

# Start API in watch mode
bun run dev &

# Start frontend
cd ../frontend
bun run dev
```

Open http://localhost:9999 — UI and API docs proxy at http://localhost:9999/api/bff/docs.

---

## 2. Production Deploy Checklist

[↑ TOC](#table-of-contents)

### Pre-deploy

- [ ] Podman ≥ 4.8 installed (`podman --version`)
- [ ] `loginctl enable-linger $USER` run (boot persistence)
- [ ] `~/.config/containers/systemd/` directory exists
- [ ] `deploy/.env` created from `.env.example` and filled in
- [ ] Strong passwords set for `DB_ROOT_PASSWORD` and `DB_PASSWORD`
- [ ] `~/bePrepared/data/mariadb/` directory created for volume mount

### Build images

- [ ] `podman build -f deploy/Containerfile.api -t beprepared-api:latest .`
- [ ] `podman build -f deploy/Containerfile.worker -t beprepared-worker:latest .`
- [ ] `podman build -f deploy/Containerfile.frontend -t beprepared-frontend:latest .`

### Install and start

- [ ] Quadlet `.container` and `.pod` files copied to `~/.config/containers/systemd/`
- [ ] `systemctl --user daemon-reload` run
- [ ] `systemctl --user start beprepared-pod` run
- [ ] Wait ~10s for MariaDB to initialise
- [ ] `podman exec -it beprepared-api bun run db:migrate` run
- [ ] `podman exec -it beprepared-api bun run db:seed` run

### Verify

- [ ] `systemctl --user status beprepared-api` shows `active (running)`
- [ ] `curl http://localhost:9999` returns HTML (frontend)
- [ ] Swagger UI accessible at http://localhost:9999/api/bff/docs
- [ ] API health check from inside API container succeeds (`podman exec beprepared-api curl -s http://localhost:3001/health`)
- [ ] Worker logs show at least one successful alert-check run

### Enable auto-start

- [ ] `systemctl --user enable beprepared-pod`

---

## 3. First Use: Household Setup

[↑ TOC](#table-of-contents)

After deploy, follow these steps in the UI (or via Swagger at `/api/bff/docs` through the frontend proxy):

### Step 1 — Create your household
- Name it something meaningful
- Set `target_people` to your baseline household size
- Leave `active_scenario` as `shelter_in_place`

### Step 2 — Create people profiles (optional)
- Create a "Full household" profile with actual count
- If you have an evacuation group (e.g., just 2 people leaving by car), create a `shelter_in_place`-bound and `evacuation`-bound profile
- Set one as `is_default = true`

### Step 3 — Review planning targets
- Go to Settings → Planning Targets
- Review water (default 4.0 L/person/day) and calories (default 2200 kcal/person/day)
- Override if your household has different needs

### Step 4 — Work through ticksheets
- Start at Level 1 (72h) — Water module first
- Tick tasks as you acquire/prepare items
- Add evidence notes (optional but recommended)

**Admin note — add/edit task definitions:**
- Open `Ticksheets` as an admin user.
- **Add task**: complete the **Add Task** form (title, module/section, class, level, scenario, recurrence) and click **Create Task**.
- **Edit task**: locate the task in its level panel, click **Edit**, update fields, then click **Save Changes**.
- Refresh the page to confirm the task appears with updated metadata and ordering.

### Step 5 — Log your inventory
- Add items to inventory as you acquire them
- Always add lots with an `acquired_at` date
- Add `expires_at` for perishables; add `replace_days` for rotation items

### Step 6 — Register equipment
- Add critical equipment (radios, generators, water filters)
- Create maintenance schedules for each item

### Step 7 — Review the alert queue
- Alerts auto-generate hourly
- Check and resolve any seeded or generated alerts

---

## 4. Daily Operator Checks

[↑ TOC](#table-of-contents)

```bash
# Services healthy?
systemctl --user is-active beprepared-api beprepared-worker beprepared-frontend

# Any service errors in last 24h?
journalctl --user -u 'beprepared*' --since "24 hours ago" -p err

# API reachable through frontend proxy?
curl -s http://localhost:9999/api/bff/health | jq .
```

In the UI:
- [ ] Review new alerts (bell icon on dashboard)
- [ ] Check for any `overdue` severity alerts and act on them

---

## 5. Weekly Operator Checks

[↑ TOC](#table-of-contents)

```bash
# Backup the database
podman exec beprepared-db mariadb-dump \
  -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  | gzip > ~/backups/beprepared-$(date +%Y%m%d).sql.gz
```

In the UI:
- [ ] Review expiring lots (Inventory → Expiring)
- [ ] Check maintenance due queue (Maintenance → Due)
- [ ] Log any completed maintenance tasks
- [ ] Review task progress — are you still on track?

---

## 6. Monthly Operator Checks

[↑ TOC](#table-of-contents)

- [ ] Verify backup restores correctly (test restore to a temp DB)
- [ ] Check for application updates (git pull)
- [ ] Review all `due` and `overdue` alerts, resolve as needed
- [ ] Review readiness level progress — aim to advance one level per quarter
- [ ] Walk the physical stores — verify logged quantities match reality
- [ ] Review and update `target_people` if household composition changed
- [ ] Review policies — water and calorie targets still appropriate?

---

## 7. Troubleshooting Quick Reference

[↑ TOC](#table-of-contents)

| Problem | Quick fix |
|---------|-----------|
| API not responding | `systemctl --user restart beprepared-api` |
| No alerts generating | `systemctl --user restart beprepared-worker` |
| Frontend shows blank | `systemctl --user restart beprepared-frontend` |
| DB connection refused | `systemctl --user status beprepared-db` — check logs for init state |
| Port 9999 taken | Check `.env` for `FRONTEND_PORT` or use `ss -tlnp | grep 9999` |
| Migrations fail | Check `DATABASE_URL` in `.env`; ensure DB is up first |
| Old image still running | Rebuild image then `systemctl --user restart <service>` |

Full troubleshooting guide: `docs/11-operations-podman.md` Section 10.

---

## 8. Useful One-Liners

[↑ TOC](#table-of-contents)

```bash
# Replace with your real household id from setup (example shown below)
HOUSEHOLD_ID="demo-household-001"

# All service statuses at once
systemctl --user status 'beprepared*' --no-pager

# Tail all logs together
journalctl --user -u 'beprepared*' -f

# Count active alerts via API
curl -s "http://localhost:9999/api/bff/alerts/${HOUSEHOLD_ID}" | jq length

# Get current planning totals (shelter_in_place, 4 people)
curl -s "http://localhost:9999/api/bff/planning/${HOUSEHOLD_ID}/shelter_in_place?people=4" | jq .

# Get lots expiring in 90 days
curl -s "http://localhost:9999/api/bff/inventory/${HOUSEHOLD_ID}/expiring?days=90" | jq length

# List due maintenance tasks
curl -s "http://localhost:9999/api/bff/maintenance/${HOUSEHOLD_ID}/due?days=30" | jq .

# Open Swagger in browser (Linux)
xdg-open http://localhost:9999/api/bff/docs

# Quick DB row count check
podman exec beprepared-db mariadb \
  -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='beprepared';"
```

---

*Content licensed under CC BY-NC-SA 4.0*
