# 14 — Project Review and Remediation Backlog

> Persistent checklist from the full-repo review. Keep this file as the working index for future deep dives.

---

## Status Key

- `[ ]` Pending
- `[~]` In progress
- `[x]` Completed
- Priority: `P0` (urgent) to `P3` (nice-to-have)

---

## A) Security Findings

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

### P0

- [x] **Create baseline API tests**: added auth token/scope tests, planning calculation tests, and critical CRUD coverage for tasks route create/update/progress validation.
- [x] **Create baseline frontend tests**: added utility tests (household/session helpers, timestamp/date behavior), middleware auth/path guards, and page-render smoke coverage for login/dashboard/tasks routes.

### P1

- [x] **Add CI pipeline**: GitHub Actions workflow added for pull requests/main push (lint, type-check, build, tests).
- [x] **Standardize lint/format config**: workspace lint/typecheck scripts are standardized, Mermaid markdown linting is wired in, and repository formatter policy/scripts are now defined via Prettier config + ignore + `format`/`format:check` scripts.

---

## C) Architecture and Code Health

### P1

- [x] **Refactor large frontend pages**: `tasks`, `inventory`, and `equipment` pages are split into focused modules with extracted forms/rows plus dedicated data/action hooks.
- [x] **Deduplicate category management**: shared backend category-access helpers and unified frontend category management UI component implemented.
- [x] **Strengthen enum validation**: removed loose enum casts in routes and tightened scenario path params with explicit schema validation.

### P2

- [x] **Add transactions** for multi-step write flows (archive/reassign/audit).
- [x] **Clarify `task_dependencies` lifecycle**: implemented dependency APIs and completion-time enforcement in task progress routes.

---

## D) Documentation Accuracy

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

- [x] **Deep dive #1: Authentication and session architecture** (documented in `docs/15-deep-dive-auth-session-architecture.md`)
- [x] **Deep dive #2: API authorization and household scoping** (documented in `docs/16-deep-dive-api-authorization-household-scoping.md`)
- [x] **Deep dive #3: Alert generation logic and escalation correctness** (documented in `docs/17-deep-dive-alert-generation-escalation.md`)
- [x] **Deep dive #4: Data model constraints, indexes, and FK strategy** (documented in `docs/18-deep-dive-data-model-indexes-fk-strategy.md`)
- [x] **Deep dive #5: Frontend maintainability refactor plan** (documented in `docs/19-deep-dive-frontend-maintainability-plan.md`)
- [x] **Deep dive #6: Deployment hardening with Podman/Quadlet** (documented in `docs/20-deep-dive-deployment-hardening-podman-quadlet.md`)

---

## F) Post Deep-Dive Implementation Queue

### P1

- [x] **Add alert severity/escalation unit coverage** in worker (`computeAlertSeverity`, monotonic escalation checks).

### P2

- [x] **Add worker-level idempotency/escalation test coverage** for repeated candidate runs against fixture sequences.
- [x] **Add worker run metrics counters** (inserted/escalated/skipped/errors per category) to support operations visibility.
- [x] **Add deployment post-restart verification script** for service status and basic endpoint checks.
- [x] **Document recurring backup-restore drill cadence** with pass/fail criteria in operations docs.

---

## Notes

- This backlog intentionally separates discovery from implementation.
- Use this file as the single checkpoint before each deep-dive sprint.
- Update status markers during execution to keep continuity across sessions.
