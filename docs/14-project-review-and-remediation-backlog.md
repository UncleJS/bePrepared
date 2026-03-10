# 14 — Project Review and Remediation Backlog

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-remediation_backlog-orange?style=flat-square)
![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--10-informational?style=flat-square)

---

## Table of Contents

1. [Status Key](#status-key)
2. [A) Security Findings](#a-security-findings)
3. [B) Quality, Testing, and CI/CD](#b-quality-testing-and-cicd)
4. [C) Architecture and Code Health](#c-architecture-and-code-health)
5. [D) Documentation Accuracy](#d-documentation-accuracy)
6. [E) Deep-Dive Queue (for future sessions)](#e-deep-dive-queue-for-future-sessions)
7. [F) Post Deep-Dive Implementation Queue](#f-post-deep-dive-implementation-queue)
8. [Notes](#notes)
9. [G) Post-Review Session 2 Improvements](#g-post-review-session-2-improvements)

> Persistent checklist from the full-repo review. Keep this file as the working index for future deep dives.

---

## Status Key

[↑ TOC](#table-of-contents)

- `[ ]` Pending
- `[~]` In progress
- `[x]` Completed
- Priority: `P0` (urgent) to `P3` (nice-to-have)

---

## A) Security Findings

[↑ TOC](#table-of-contents)

### P0

- [x] **Secrets hygiene audit**: verified `deploy/.env` is ignored and not tracked in current git history (`git log --all -- deploy/.env` returned no commits).
- [x] **Remove default admin credential risk**: seeds now reject `SEED_ADMIN_PASSWORD=changeme`, require explicit seed password in production, and generate one-time random password in non-production when unset.
- [x] **Add login rate limiting**: throttle `POST /auth/login` to mitigate brute-force and credential stuffing.

### P1

- [x] **Keep API token server-side**: implemented frontend BFF proxy (`/api/bff/*`) and removed `apiToken` from client session payloads.
- [x] **Lock auth kill switch**: production startup now fails if `AUTH_ENABLED=false`.
- [x] **Harden household cookie**: set `Secure` where applicable and review write model for admin context switching.

### P2

- [x] **Reduce stale privilege risk**: globally re-verify authenticated users against DB on each private request; admin demotion now applies immediately.
- [x] **Swagger exposure policy**: `/docs` now requires auth in production, and Swagger Try-It-Out is disabled in production.
- [x] **phpMyAdmin exposure policy**: removed phpMyAdmin Quadlet service and host port exposure from default deployment.
- [x] **CORS production validation**: enforce explicit trusted origins and startup checks (no wildcard; localhost blocked in production unless explicitly overridden).
- [x] **Payload constraints**: added route-level max length and numeric bounds across auth, household, module, task, inventory, equipment, maintenance, settings, planning, and alerts endpoints.

---

## B) Quality, Testing, and CI/CD

[↑ TOC](#table-of-contents)

### P0

- [x] **Create baseline API tests**: added auth token/scope tests, planning calculation tests, and critical CRUD coverage for tasks route create/update/progress validation.
- [x] **Create baseline frontend tests**: added utility tests (household/session helpers, timestamp/date behavior), middleware auth/path guards, and page-render smoke coverage for login/dashboard/tasks routes.

### P1

- [x] **Add CI pipeline**: GitHub Actions workflow added for pull requests/main push (lint, type-check, build, tests).
- [x] **Standardize lint/format config**: workspace lint/typecheck scripts are standardized, Mermaid markdown linting is wired in, and repository formatter policy/scripts are now defined via Prettier config + ignore + `format`/`format:check` scripts.

---

## C) Architecture and Code Health

[↑ TOC](#table-of-contents)

### P1

- [x] **Refactor large frontend pages**: `tasks`, `inventory`, and `equipment` pages are split into focused modules with extracted forms/rows plus dedicated data/action hooks.
- [x] **Deduplicate category management**: shared backend category-access helpers and unified frontend category management UI component implemented.
- [x] **Strengthen enum validation**: removed loose enum casts in routes and tightened scenario path params with explicit schema validation.

### P2

- [x] **Add transactions** for multi-step write flows (archive/reassign/audit).
- [x] **Clarify `task_dependencies` lifecycle**: implemented dependency APIs and completion-time enforcement in task progress routes.

---

## D) Documentation Accuracy

[↑ TOC](#table-of-contents)

### P0

- [x] **Fix runtime ports and service map** across docs (frontend/API/phpMyAdmin).
- [x] **Document actual auth model**: NextAuth credentials flow, API token semantics, admin/household authorization model.
- [x] **Align API contract doc with implemented routes** (`/modules/:slug`, alerts endpoints, category endpoints).

### P1

- [x] **Align alert model docs** with current schema (`upcoming|due|overdue`, read/resolved lifecycle).
- [x] **Align worker behavior docs** with currently implemented jobs.
- [x] **Fix quickstart command sequencing** for workspace-aware migration/seed commands.

---

## E) Deep-Dive Queue (for future sessions)

[↑ TOC](#table-of-contents)

- [x] **Deep dive #1: Authentication and session architecture** (documented in `docs/15-deep-dive-auth-session-architecture.md`)
- [x] **Deep dive #2: API authorization and household scoping** (documented in `docs/16-deep-dive-api-authorization-household-scoping.md`)
- [x] **Deep dive #3: Alert generation logic and escalation correctness** (documented in `docs/17-deep-dive-alert-generation-escalation.md`)
- [x] **Deep dive #4: Data model constraints, indexes, and FK strategy** (documented in `docs/18-deep-dive-data-model-indexes-fk-strategy.md`)
- [x] **Deep dive #5: Frontend maintainability refactor plan** (documented in `docs/19-deep-dive-frontend-maintainability-plan.md`)
- [x] **Deep dive #6: Deployment hardening with Podman/Quadlet** (documented in `docs/20-deep-dive-deployment-hardening-podman-quadlet.md`)

---

## F) Post Deep-Dive Implementation Queue

[↑ TOC](#table-of-contents)

### P1

- [x] **Add alert severity/escalation unit coverage** in worker (`computeAlertSeverity`, monotonic escalation checks).

### P2

- [x] **Add worker-level idempotency/escalation test coverage** for repeated candidate runs against fixture sequences.
- [x] **Add worker run metrics counters** (inserted/escalated/skipped/errors per category) to support operations visibility.
- [x] **Add deployment post-restart verification script** for service status and basic endpoint checks.
- [x] **Document recurring backup-restore drill cadence** with pass/fail criteria in operations docs.
- [x] **Document degraded-mode recovery runbook** for DB/API/worker/frontend restart sequencing.
- [ ] **Split shared deploy env into service-scoped env files** (deferred by operator choice; revisit when secret-minimization becomes priority).

---

## Notes

[↑ TOC](#table-of-contents)

- This backlog intentionally separates discovery from implementation.
- Use this file as the single checkpoint before each deep-dive sprint.
- Update status markers during execution to keep continuity across sessions.

---

## G) Post-Review Session 2 Improvements

[↑ TOC](#table-of-contents)

Applied as a full codebase sweep on 2026-03-06. All 20 API tests continued passing after changes. Typecheck remained clean (0 errors).

### P1

- [x] **Structured JSON logger** (`api/src/lib/logger.ts`): thin `logger.info/warn/error` writing one JSON line per call to stdout/stderr; replaces all runtime `console.*` across API and worker.
- [x] **Replace `as any` with non-null assertion `!`** in `api/src/routes/tasks/index.ts` on `query.readinessLevel` and `query.scenario`; values are guaranteed valid by Elysia schema before the handler runs.
- [x] **`AlertCategory` union type** in `api/src/lib/alertJobs.ts`: matches the DB enum (`expiry | replacement | maintenance | low_stock | task_due | policy`), eliminating the `as any` cast in `upsertAlert`.
- [x] **Batched alert-policy DB queries** in `api/src/lib/alertJobs.ts`: replaced two separate `getUpcomingDays()` / `getGraceDays()` calls (4 round-trips/household) with a single `getAlertPolicyForHousehold()` helper using `inArray` for both keys in 2 parallel queries.
- [x] **Batched policy-engine DB queries** in `api/src/lib/policyEngine.ts`: removed `resolveKey()` (up to 12 sequential round-trips per planning call); replaced with `resolvePolicy()` using 3 parallel `findMany()` + `inArray` calls, resolving all 4 keys in-memory.
- [x] **`SELECT 1` DB health probe** in `api/src/index.ts`: `/health` now executes a live DB check and returns HTTP 503 on failure instead of always returning 200.
- [x] **Remove weak DB credential defaults** in `api/src/db/client.ts`: `user`, `password`, and `database` no longer fall back to the hardcoded string `"beprepared"`; the process will fail fast if env vars are unset.
- [x] **`setInterval` stale-entry cleanup** in `api/src/routes/auth/index.ts`: the `loginAttempts` Map is now swept every 5 minutes via `.unref()`'d interval to prevent unbounded memory growth.

---

_Content licensed under CC BY-NC-SA 4.0._
