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
- [~] **Remove default admin credential risk**: startup guard now blocks `SEED_ADMIN_PASSWORD=changeme` when `NODE_ENV=production`; operational secret rotation still pending.
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

- [~] **Create baseline API tests**: auth token + route scope coverage and planning calculation tests added; critical CRUD tests still pending.
- [x] **Create baseline frontend tests**: added utility tests (household/session helpers, timestamp/date behavior), middleware auth/path guards, and page-render smoke coverage for login/dashboard/tasks routes.

### P1

- [ ] **Add CI pipeline**: lint, type-check, and tests on pull requests.
- [ ] **Standardize lint/format config**: repository-wide rules and scripts.

---

## C) Architecture and Code Health

### P1

- [ ] **Refactor large frontend pages**: split `tasks`, `inventory`, and `equipment` into hooks + focused components.
- [ ] **Deduplicate category management**: shared backend helpers and shared frontend category management UI.
- [ ] **Strengthen enum validation**: replace loose string casting with strict schema-level enum validation.

### P2

- [ ] **Add transactions** for multi-step write flows (archive/reassign/audit).
- [ ] **Clarify `task_dependencies` lifecycle**: implement usage or remove dead schema path.

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

- [ ] **Deep dive #1: Authentication and session architecture**
- [ ] **Deep dive #2: API authorization and household scoping**
- [ ] **Deep dive #3: Alert generation logic and escalation correctness**
- [ ] **Deep dive #4: Data model constraints, indexes, and FK strategy**
- [ ] **Deep dive #5: Frontend maintainability refactor plan**
- [ ] **Deep dive #6: Deployment hardening with Podman/Quadlet**

---

## Notes

- This backlog intentionally separates discovery from implementation.
- Use this file as the single checkpoint before each deep-dive sprint.
- Update status markers during execution to keep continuity across sessions.
