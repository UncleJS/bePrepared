# 10 — API Contract

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-api--contract-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Households](#2-households)
3. [People Profiles](#3-people-profiles)
4. [Modules & Guidance](#4-modules--guidance)
5. [Tasks & Progress](#5-tasks--progress)
6. [Inventory](#6-inventory)
7. [Equipment](#7-equipment)
8. [Maintenance](#8-maintenance)
9. [Alerts](#9-alerts)
10. [Settings & Policies](#10-settings--policies)
11. [Planning](#11-planning)
12. [Health & Meta](#12-health--meta)

---

## 1. Conventions

[↑ TOC](#table-of-contents)

- **Base URL**: browser access is typically via frontend BFF proxy `http://localhost:9999/api/bff`; API listens internally on `http://localhost:3001`
- **Interactive docs**: `GET /docs` (or via frontend proxy `GET /api/bff/docs`) — Swagger UI (`Try it out` disabled in production)
- **Machine-readable spec**: `GET /docs/json` (or via frontend proxy `GET /api/bff/docs/json`) — OpenAPI 3.0 JSON
- **Content-Type**: `application/json` for all request bodies
- **Timestamps**: ISO-8601 UTC strings (`2026-03-05T14:30:00.000Z`) — dates are `YYYY-MM-DD`
- **Deletion**: all `DELETE` endpoints are soft-archive — row is kept with `archived_at` set
- **IDs**: UUID v4 strings
- **Authentication**: Bearer token required for all routes except `/`, `/health`, and `/auth/login`; `/docs*` is public only in non-production
- **HTTP status codes**:
  - `200` — success
  - `401` — unauthorized
  - `403` — forbidden (scope mismatch)
  - `201` — created (some routes return `200` + body)
  - `400` — validation error
  - `404` — not found
  - `500` — internal server error

---

## 2. Households

[↑ TOC](#table-of-contents)

### `GET /households`

List all active (non-archived) households.

**Response** — array of household objects.

---

### `POST /households`

Create a new household.

**Body**:

```json
{
  "name": "Smith Family",
  "targetPeople": 4,
  "notes": "Mountain cabin household"
}
```

**Response** — created household object.

---

### `GET /households/:id`

Get one household by ID.

**Response** — household object or `404`.

---

### `PATCH /households/:id`

Update household fields.

**Body** (all fields optional):

```json
{
  "name": "Smith Family (updated)",
  "targetPeople": 5,
  "activeScenario": "evacuation",
  "activeProfileId": "uuid-of-profile",
  "notes": "Updated notes"
}
```

---

### `DELETE /households/:id`

Archive a household (`archived_at = now()`).

**Response**: `{ "archived": true }`

---

## 3. People Profiles

[↑ TOC](#table-of-contents)

### `GET /households/:id/profiles`

List active people profiles for a household.

---

### `POST /households/:id/profiles`

Create a people profile.

**Body**:

```json
{
  "name": "Full family",
  "peopleCount": 4,
  "isDefault": true,
  "scenarioBound": "shelter_in_place",
  "notes": "All four at home"
}
```

---

### `PATCH /households/:id/profiles/:profileId`

Update a profile (all fields optional).

---

### `DELETE /households/:id/profiles/:profileId`

Archive a profile.

---

## 4. Modules & Guidance

[↑ TOC](#table-of-contents)

### `GET /modules`

List all active modules (with sections).

---

### `POST /modules`

Create a module.

**Body**:

```json
{
  "slug": "water",
  "title": "Water",
  "description": "Safe water storage and purification",
  "iconName": "droplets",
  "category": "water",
  "sortOrder": 1
}
```

---

### `GET /modules/:slug`

Get one module with nested sections and guidance docs.

---

### `POST /modules/:id/sections`

Create a section. **Admin only.**

**Body**:

```json
{
  "slug": "storage",
  "title": "Storage",
  "sortOrder": 1
}
```

> `slug` is required and must be URL-safe (e.g. `storage`, `purification`).

---

### `PATCH /modules/:moduleId/sections/:sectionId/docs/:docId`

Update a guidance document. **Admin only.**

**Body** (all fields optional):

```json
{
  "title": "Updated title",
  "body": "Updated markdown content...",
  "sortOrder": 2
}
```

---

### `POST /modules/:moduleId/sections/:sectionId/docs`

Create a guidance document.

**Body**:

```json
{
  "title": "How to store water",
  "body": "Markdown content...",
  "sortOrder": 1
}
```

---

## 5. Tasks & Progress

[↑ TOC](#table-of-contents)

### `GET /tasks`

List all active tasks. Supports query params:

- `moduleId` — filter by module
- `readinessLevel` — `l1_72h` | `l2_14d` | `l3_30d` | `l4_90d`
- `scenario` — `both` | `shelter_in_place` | `evacuation`

---

### `GET /tasks/by-id/:id`

Get one active task by ID.

---

### `GET /tasks/by-id/:id/dependencies`

List dependency edges for a task, including resolved dependency task metadata.

---

### `POST /tasks/by-id/:id/dependencies`

Create a dependency edge (`task` depends on `dependsOnTaskId`, admin only).

**Body**:

```json
{
  "dependsOnTaskId": "uuid"
}
```

Returns `409` if the dependency already exists.

---

### `POST /tasks`

Create a task (global library entry, admin only).

**Body**:

```json
{
  "moduleId": "uuid",
  "sectionId": "uuid",
  "title": "Store 72h water supply",
  "description": "...",
  "taskClass": "acquire",
  "readinessLevel": "l1_72h",
  "scenario": "both",
  "isRecurring": false,
  "recurDays": null,
  "sortOrder": 1,
  "evidencePrompt": "Photo of stored containers"
}
```

---

### `PATCH /tasks/by-id/:id`

Update a task (global library entry, admin only).

All body fields are optional; omitted fields remain unchanged.

**Body** (partial):

```json
{
  "title": "Store 72h potable water supply",
  "description": "Updated wording",
  "taskClass": "acquire",
  "readinessLevel": "l1_72h",
  "scenario": "both",
  "isRecurring": false,
  "recurDays": null,
  "sortOrder": 1,
  "evidencePrompt": "Photo + storage location"
}
```

---

### `GET /tasks/:householdId/progress`

Get all task progress records for a household.

---

### `POST /tasks/:householdId/progress`

Create or update task progress (tick/untick).

**Body**:

```json
{
  "taskId": "uuid",
  "status": "completed",
  "completedAt": "2026-03-05T10:00:00Z",
  "evidenceNote": "Stored 60L in garage",
  "completedBy": "Alice"
}
```

Returns `409` when dependencies for `taskId` are not completed.

---

### `PATCH /tasks/:householdId/progress/:progressId`

Update a progress record.

Returns `409` when moving to `completed` while dependencies remain incomplete.

---

## 6. Inventory

[↑ TOC](#table-of-contents)

### `GET /inventory/categories`

List all inventory categories.

---

### `GET /inventory/:householdId/categories`

List available inventory categories for the household (`isSystem=true` plus household custom categories).

---

### `POST /inventory/:householdId/categories`

Create a household custom inventory category.

---

### `PATCH /inventory/:householdId/categories/:categoryId`

Update a household custom inventory category.

---

### `DELETE /inventory/:householdId/categories/:categoryId?replacementCategoryId=:id`

Archive a household custom inventory category. Requires `replacementCategoryId` when items still reference that category.

---

### `GET /inventory/:householdId/items`

List all active inventory items for a household, with their active lots nested.

---

### `POST /inventory/:householdId/items`

Create an inventory item.

**Body**:

```json
{
  "name": "Drinking water (4L jugs)",
  "categoryId": "uuid",
  "unit": "liters",
  "location": "Garage shelf A",
  "targetQty": 80,
  "lowStockThreshold": 40,
  "defaultReplaceDays": 365,
  "isTrackedByExpiry": false,
  "notes": ""
}
```

---

### `PATCH /inventory/:householdId/items/:itemId`

Update an inventory item.

**Body** (all fields optional):

```json
{
  "name": "Drinking water (5L jugs)",
  "categoryId": "uuid",
  "unit": "liters",
  "location": "Garage shelf B",
  "targetQty": 100,
  "lowStockThreshold": 50,
  "defaultReplaceDays": 365,
  "isTrackedByExpiry": true,
  "notes": "Rotation schedule updated"
}
```

---

### `DELETE /inventory/:householdId/items/:itemId`

Archive an inventory item.

---

### `POST /inventory/:householdId/items/:itemId/lots`

Add a lot (batch) to an inventory item.

**Body**:

```json
{
  "qty": 20,
  "acquiredAt": "2026-03-01",
  "expiresAt": "2028-03-01",
  "replaceDays": 365,
  "batchRef": "receipt-2026-03-01",
  "notes": ""
}
```

Note: `nextReplaceAt` is auto-computed as `acquiredAt + replaceDays`.

---

### `DELETE /inventory/:householdId/items/:itemId/lots/:lotId`

Archive (consume/dispose) a lot.

---

### `PATCH /inventory/:householdId/items/:itemId/lots/:lotId`

Update a lot.

**Body** (all fields optional):

```json
{
  "qty": 18,
  "acquiredAt": "2026-03-01",
  "expiresAt": "2028-03-01",
  "replaceDays": 365,
  "batchRef": "receipt-2026-03-01-updated",
  "notes": "Corrected qty after audit"
}
```

---

### `GET /inventory/:householdId/expiring?days=30`

Get lots expiring within the next N days (default 30).

---

## 7. Equipment

[↑ TOC](#table-of-contents)

### `GET /equipment/battery-profiles`

List all battery chemistry profiles. **Admin only.**

---

### `POST /equipment/battery-profiles`

Create a battery chemistry profile. **Admin only.**

**Body**:

```json
{
  "name": "AA Alkaline",
  "chemistry": "alkaline",
  "shelfLifeDays": 3650,
  "recheckCycleDays": 365,
  "storageTempMin": 10,
  "storageTempMax": 25,
  "notes": "Standard AA alkaline — store cool and dry"
}
```

---

### `GET /equipment/:householdId/categories`

List available equipment categories for the household (`isSystem=true` plus household custom categories).

---

### `POST /equipment/:householdId/categories`

Create a household custom equipment category.

---

### `PATCH /equipment/:householdId/categories/:categoryId`

Update a household custom equipment category.

---

### `DELETE /equipment/:householdId/categories/:categoryId?replacementCategoryId=:id`

Archive a household custom equipment category. Requires `replacementCategoryId` when equipment still references that category.

---

### `GET /equipment/:householdId`

List all active equipment items for a household.

---

### `POST /equipment/:householdId`

Create an equipment item.

**Body**:

```json
{
  "categorySlug": "comms",
  "name": "BaoFeng UV-5R",
  "model": "UV-5R",
  "serialNo": "BF-12345",
  "location": "Go-bag",
  "status": "operational",
  "acquiredAt": "2025-01-01",
  "notes": "Programmed with local repeaters"
}
```

---

### `PATCH /equipment/:householdId/:itemId`

Update an equipment item.

---

### `DELETE /equipment/:householdId/:itemId`

Archive an equipment item.

---

### `POST /equipment/:householdId/:itemId/restore`

Restore a previously archived equipment item (sets `archived_at = NULL`).

**Response**: restored equipment item object.

---

## 8. Maintenance

[↑ TOC](#table-of-contents)

### `GET /maintenance/templates`

List all maintenance templates (global).

---

### `POST /maintenance/templates`

Create a maintenance template. **Admin only.**

**Body**:

```json
{
  "categorySlug": "generator",
  "name": "Annual full service",
  "description": "Full engine service including oil, filter, and spark plug",
  "taskType": "full_service",
  "defaultCalDays": 365,
  "usageMeterUnit": "hours",
  "defaultUsageInterval": 100,
  "graceDays": 14
}
```

---

### `GET /maintenance/:householdId/schedules`

List all maintenance schedules across all equipment for a household.

---

### `POST /maintenance/:householdId/:equipmentItemId/schedules`

Create a maintenance schedule for an equipment item.

**Body**:

```json
{
  "templateId": "uuid-optional",
  "name": "Annual full service",
  "calDays": 365,
  "usageMeterUnit": "hours",
  "usageInterval": 100,
  "graceDays": 14,
  "lastDoneAt": "2025-06-01",
  "lastMeterValue": 0
}
```

Note: `nextDueAt` is auto-computed as `lastDoneAt + calDays`.

---

### `PATCH /maintenance/:householdId/schedules/:scheduleId`

Update a maintenance schedule.

---

### `DELETE /maintenance/:householdId/schedules/:scheduleId`

Archive a maintenance schedule.

---

### `POST /maintenance/:householdId/schedules/:scheduleId/events`

Log a completed maintenance event. Also updates schedule's `lastDoneAt` and recomputes `nextDueAt`.

**Body**:

```json
{
  "performedAt": "2026-03-05T09:00:00Z",
  "performedBy": "Alice",
  "meterReading": 42.5,
  "notes": "Replaced filter, tested output"
}
```

---

### `GET /maintenance/:householdId/schedules/:scheduleId/events`

Get event history for a schedule.

---

### `GET /maintenance/:householdId/due`

Get all overdue and upcoming maintenance tasks (sorted by urgency).

Query params:

- `days` — lookahead window in days (default `30`)

---

## 9. Alerts

[↑ TOC](#table-of-contents)

### `GET /alerts/:householdId`

List all active (non-archived) alerts for a household.

Query params:

- `status` — optional: `active` or `resolved`
- `unread` — optional boolean-like string (`"true"`)
- `unresolved` — optional boolean-like string (`"true"`)

---

### `PATCH /alerts/:householdId/:alertId/read`

Mark an alert as read.

**Response**: `{ "read": true }`

---

### `PATCH /alerts/:householdId/:alertId/resolve`

Mark an alert as resolved.

**Response**: `{ "resolved": true }`

---

### `DELETE /alerts/:householdId/:alertId`

Archive an alert.

---

### `POST /alerts/run-job`

Trigger an immediate alert generation run across all households. **Admin only.**

**Response**:

```json
{
  "expiry": { "inserted": 2, "escalated": 1, "skipped": 0, "errors": 0 },
  "replacement": { "inserted": 0, "escalated": 0, "skipped": 3, "errors": 0 },
  "maintenance": { "inserted": 1, "escalated": 0, "skipped": 2, "errors": 0 }
}
```

---

## 10. Settings & Policies

[↑ TOC](#table-of-contents)

### `GET /settings/defaults`

Get all system policy defaults.

---

### `GET /settings/:householdId/policies`

Get active household-level policy overrides.

---

### `PUT /settings/:householdId/policies/:key`

Upsert a household-level policy override (archives old value, inserts new).

**Body**:

```json
{
  "unit": "liters/person/day",
  "valueDecimal": 6.0
}
```

---

### `DELETE /settings/:householdId/policies/:key`

Reset a household policy to system default (archives the override).

---

### `GET /settings/:householdId/scenario/:scenario`

Get scenario-specific policy overrides.

`:scenario` = `shelter_in_place` or `evacuation`

---

### `PUT /settings/:householdId/scenario/:scenario/:key`

Upsert a scenario-specific policy override.

**Body**: same as household policy body.

---

### `GET /settings/:householdId/audit`

Get the policy audit log for a household (append-only history).

---

## 11. Planning

[↑ TOC](#table-of-contents)

### `GET /planning/:householdId/:scenario?people=N`

Calculate effective planning totals for a household and scenario.

`:scenario` = `shelter_in_place` or `evacuation`

Query param `people` — manual override of people count (integer).

**Policy resolution**: scenario override → household override → system default.
**People resolution**: `?people` query → scenario-bound profile → active profile → `target_people`.

**Response**:

```json
{
  "people": {
    "count": 4,
    "source": "household_baseline"
  },
  "policy": {
    "waterLitersPerPersonPerDay": 4,
    "caloriesKcalPerPersonPerDay": 2200,
    "alertUpcomingDays": 14,
    "alertGraceDays": 3
  },
  "totals": {
    "h72": {
      "water": 48,
      "calories": 26400
    },
    "d14": {
      "water": 224,
      "calories": 123200
    },
    "d30": {
      "water": 480,
      "calories": 264000
    },
    "d90": {
      "water": 1440,
      "calories": 792000
    }
  }
}
```

---

## 12. Health & Meta

[↑ TOC](#table-of-contents)

### `GET /`

API identity check.

**Response**: `{ "status": "ok", "name": "bePrepared API", "version": "0.1.0" }`

---

### `GET /health`

Liveness probe.

**Response**: `{ "status": "ok", "ts": "2026-03-05T14:30:00.000Z" }`

---

_Content licensed under CC BY-NC-SA 4.0_
