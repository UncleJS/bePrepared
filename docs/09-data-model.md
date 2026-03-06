# 09 — Data Model

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Doc Type](https://img.shields.io/badge/doc-data--model-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-stable-brightgreen?style=flat-square)
![Updated](https://img.shields.io/badge/updated-2026--03--05-informational?style=flat-square)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Entity Relationship Overview](#2-entity-relationship-overview)
3. [Households Domain](#3-households-domain)
4. [Policies Domain](#4-policies-domain)
5. [Users Domain](#5-users-domain)
6. [Modules & Tasks Domain](#6-modules--tasks-domain)
7. [Inventory Domain](#7-inventory-domain)
8. [Equipment & Maintenance Domain](#8-equipment--maintenance-domain)
9. [Alerts Domain](#9-alerts-domain)
10. [Archive & Restore Pattern](#10-archive--restore-pattern)
11. [Enum Reference](#11-enum-reference)

---

## 1. Design Principles

[↑ TOC](#table-of-contents)

- **Archive-only lifecycle**: every mutable table has `archived_at TIMESTAMP NULL`. `NULL` = active; non-null = archived. Never `DELETE`.
- **UTC everywhere**: all `TIMESTAMP` columns store UTC. Display formatting (local `YYYY-MM-DD HH:mm:ss`) is a UI concern.
- **UUID primary keys**: all PKs are `VARCHAR(36)` UUID v4 strings.
- **Decimal for quantities**: `DECIMAL(10,2)` for quantities; `DECIMAL(10,4)` for policy values.
- **No cascading deletes**: foreign-key integrity is enforced in application logic, not via DB cascade.
- **Denorm allowed for performance**: `next_due_at`, `next_replace_at` are computed and stored for fast alert queries; re-derived on every maintenance event write.

---

## 2. Entity Relationship Overview

[↑ TOC](#table-of-contents)

```
households
  ├─ household_people_profiles  (1:N)
  ├─ household_policies         (1:N, per key)
  ├─ scenario_policies          (1:N, per scenario+key)
  ├─ audit_log                  (1:N)
  ├─ task_progress              (1:N, via household_id)
  ├─ inventory_items            (1:N)
  │    └─ inventory_lots        (1:N)
  ├─ equipment_items            (1:N)
  │    └─ maintenance_schedules (1:N)
  │         └─ maintenance_events (1:N)
  └─ alerts                     (1:N)

— global / seed tables (no household_id) —
modules
  └─ sections (1:N)
       └─ guidance_docs (1:N)
tasks
  ├─ task_dependencies (M:N self-join)
  └─ task_progress (1:N, per household)
policy_defaults           (system-wide, keyed)
inventory_categories      (system-seeded + per-household custom; see §7)
battery_profiles          (global reference)
maintenance_templates     (global reference)
equipment_categories      (system-seeded + per-household custom; see §8)
```

---

## 3. Households Domain

[↑ TOC](#table-of-contents)

### `households`

| Column              | Type                                                             | Notes                                             |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `id`                | VARCHAR(36) PK                                                   | UUID v4                                           |
| `name`              | VARCHAR(255) NOT NULL                                            | Display name                                      |
| `target_people`     | INT NOT NULL DEFAULT 2                                           | Baseline people count (tier 4 of 4)               |
| `active_scenario`   | ENUM('shelter_in_place','evacuation') DEFAULT 'shelter_in_place' | Current scenario context                          |
| `active_profile_id` | VARCHAR(36) NULL                                                 | FK → `household_people_profiles.id` (tier 3 of 4) |
| `notes`             | TEXT NULL                                                        | Free text                                         |
| `created_at`        | TIMESTAMP NOT NULL                                               | UTC                                               |
| `updated_at`        | TIMESTAMP NOT NULL                                               | UTC, auto-update                                  |
| `archived_at`       | TIMESTAMP NULL                                                   | NULL = active                                     |

### `household_people_profiles`

| Column           | Type                                       | Notes                                                           |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `id`             | VARCHAR(36) PK                             |                                                                 |
| `household_id`   | VARCHAR(36) NOT NULL                       | FK → `households.id`                                            |
| `name`           | VARCHAR(255) NOT NULL                      | Profile label e.g. "Full family", "Just us two"                 |
| `people_count`   | INT NOT NULL DEFAULT 1                     | Number of people this profile represents                        |
| `is_default`     | BOOLEAN NOT NULL DEFAULT FALSE             | Used when no scenario-bound profile matches                     |
| `scenario_bound` | ENUM('shelter_in_place','evacuation') NULL | If set, auto-selects when that scenario is active (tier 2 of 4) |
| `notes`          | TEXT NULL                                  |                                                                 |
| `created_at`     | TIMESTAMP NOT NULL                         |                                                                 |
| `updated_at`     | TIMESTAMP NOT NULL                         |                                                                 |
| `archived_at`    | TIMESTAMP NULL                             |                                                                 |

---

## 4. Policies Domain

[↑ TOC](#table-of-contents)

### `policy_defaults`

System-wide defaults. One row per key. Not per-household.

| Column          | Type                 | Notes                                  |
| --------------- | -------------------- | -------------------------------------- |
| `key`           | VARCHAR(100) PK      | e.g. `water_liters_per_person_per_day` |
| `value_decimal` | DECIMAL(10,4) NULL   | Used for floating-point values         |
| `value_int`     | INT NULL             | Used for integer values                |
| `unit`          | VARCHAR(50) NOT NULL | e.g. `liters/person/day`               |
| `description`   | VARCHAR(500) NULL    | Human rationale                        |
| `updated_at`    | TIMESTAMP NOT NULL   |                                        |

### `household_policies`

Household global override for one policy key. Archived when updated (full trail).

| Column          | Type                  | Notes                              |
| --------------- | --------------------- | ---------------------------------- |
| `id`            | VARCHAR(36) PK        |                                    |
| `household_id`  | VARCHAR(36) NOT NULL  |                                    |
| `key`           | VARCHAR(100) NOT NULL | Must match a `policy_defaults.key` |
| `value_decimal` | DECIMAL(10,4) NULL    |                                    |
| `value_int`     | INT NULL              |                                    |
| `unit`          | VARCHAR(50) NOT NULL  |                                    |
| `created_at`    | TIMESTAMP NOT NULL    |                                    |
| `updated_at`    | TIMESTAMP NOT NULL    |                                    |
| `archived_at`   | TIMESTAMP NULL        | Non-null = superseded              |

### `scenario_policies`

Per-household, per-scenario override. Highest priority tier.

| Column          | Type                                           | Notes |
| --------------- | ---------------------------------------------- | ----- |
| `id`            | VARCHAR(36) PK                                 |       |
| `household_id`  | VARCHAR(36) NOT NULL                           |       |
| `scenario`      | ENUM('shelter_in_place','evacuation') NOT NULL |       |
| `key`           | VARCHAR(100) NOT NULL                          |       |
| `value_decimal` | DECIMAL(10,4) NULL                             |       |
| `value_int`     | INT NULL                                       |       |
| `unit`          | VARCHAR(50) NOT NULL                           |       |
| `created_at`    | TIMESTAMP NOT NULL                             |       |
| `updated_at`    | TIMESTAMP NOT NULL                             |       |
| `archived_at`   | TIMESTAMP NULL                                 |       |

### `audit_log`

Append-only. Never archived.

| Column         | Type                  | Notes                         |
| -------------- | --------------------- | ----------------------------- |
| `id`           | VARCHAR(36) PK        |                               |
| `household_id` | VARCHAR(36) NULL      |                               |
| `entity`       | VARCHAR(100) NOT NULL | Table name                    |
| `entity_id`    | VARCHAR(36) NULL      | Row ID affected               |
| `action`       | VARCHAR(50) NOT NULL  | `create`, `update`, `archive` |
| `changed_by`   | VARCHAR(255) NULL     | Future: user/session          |
| `old_value`    | VARCHAR(1000) NULL    |                               |
| `new_value`    | VARCHAR(1000) NULL    |                               |
| `created_at`   | TIMESTAMP NOT NULL    |                               |

---

## 5. Users Domain

[↑ TOC](#table-of-contents)

### `users`

Application users. Each user belongs to exactly one household.

| Column          | Type                  | Notes                                                    |
| --------------- | --------------------- | -------------------------------------------------------- |
| `id`            | VARCHAR(36) PK        | UUID v4                                                  |
| `household_id`  | VARCHAR(36) NOT NULL  | FK → `households.id`                                     |
| `username`      | VARCHAR(255) NOT NULL | Login identifier (unique)                                |
| `email`         | VARCHAR(255) NULL     | Optional email address                                   |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt hash of the user's password                       |
| `is_admin`      | BOOLEAN NOT NULL      | Admin users may manage global tasks, modules, categories |
| `created_at`    | TIMESTAMP NOT NULL    |                                                          |
| `updated_at`    | TIMESTAMP NOT NULL    |                                                          |
| `archived_at`   | TIMESTAMP NULL        | NULL = active                                            |

---

## 6. Modules & Tasks Domain

[↑ TOC](#table-of-contents)

### `modules`

| Column        | Type                                                                                                       | Notes                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `id`          | VARCHAR(36) PK                                                                                             |                                            |
| `slug`        | VARCHAR(100) NOT NULL UNIQUE                                                                               | e.g. `water`, `food`, `medical`            |
| `title`       | VARCHAR(255) NOT NULL                                                                                      |                                            |
| `description` | TEXT NULL                                                                                                  |                                            |
| `icon_name`   | VARCHAR(100) NULL                                                                                          | Icon identifier for UI (e.g. `droplets`)   |
| `category`    | ENUM('water','food','shelter','medical','security','comms','sanitation','power','mobility','general') NULL | Domain category used for filtering/display |
| `sort_order`  | INT NOT NULL DEFAULT 0                                                                                     |                                            |
| `created_at`  | TIMESTAMP NOT NULL                                                                                         |                                            |
| `updated_at`  | TIMESTAMP NOT NULL                                                                                         |                                            |
| `archived_at` | TIMESTAMP NULL                                                                                             |                                            |

### `sections`

Sub-groups within a module.

| Column        | Type                   | Notes                                   |
| ------------- | ---------------------- | --------------------------------------- |
| `id`          | VARCHAR(36) PK         |                                         |
| `module_id`   | VARCHAR(36) NOT NULL   | FK → `modules.id`                       |
| `slug`        | VARCHAR(100) NOT NULL  | URL-safe identifier (unique per module) |
| `title`       | VARCHAR(255) NOT NULL  |                                         |
| `sort_order`  | INT NOT NULL DEFAULT 0 |                                         |
| `created_at`  | TIMESTAMP NOT NULL     |                                         |
| `updated_at`  | TIMESTAMP NOT NULL     |                                         |
| `archived_at` | TIMESTAMP NULL         |                                         |

### `guidance_docs`

Informational content within a section.

| Column        | Type                   | Notes                                 |
| ------------- | ---------------------- | ------------------------------------- |
| `id`          | VARCHAR(36) PK         |                                       |
| `section_id`  | VARCHAR(36) NOT NULL   | FK → `sections.id`                    |
| `title`       | VARCHAR(255) NOT NULL  |                                       |
| `body`        | TEXT NOT NULL          | Markdown content                      |
| `badge_json`  | TEXT NULL              | JSON blob for optional badge metadata |
| `sort_order`  | INT NOT NULL DEFAULT 0 |                                       |
| `created_at`  | TIMESTAMP NOT NULL     |                                       |
| `updated_at`  | TIMESTAMP NOT NULL     |                                       |
| `archived_at` | TIMESTAMP NULL         |                                       |

### `tasks`

Library of preparedness tasks. Global (not per-household).

| Column            | Type                                                   | Notes                  |
| ----------------- | ------------------------------------------------------ | ---------------------- |
| `id`              | VARCHAR(36) PK                                         |                        |
| `module_id`       | VARCHAR(36) NOT NULL                                   |                        |
| `section_id`      | VARCHAR(36) NULL                                       |                        |
| `title`           | VARCHAR(500) NOT NULL                                  |                        |
| `description`     | TEXT NULL                                              |                        |
| `task_class`      | ENUM('acquire','prepare','test','maintain','document') |                        |
| `readiness_level` | ENUM('l1_72h','l2_14d','l3_30d','l4_90d')              | Target horizon         |
| `scenario`        | ENUM('both','shelter_in_place','evacuation')           | Which scenario applies |
| `is_recurring`    | BOOLEAN NOT NULL DEFAULT FALSE                         |                        |
| `recur_days`      | INT NULL                                               | Recurrence period      |
| `sort_order`      | INT NOT NULL DEFAULT 0                                 |                        |
| `evidence_prompt` | VARCHAR(500) NULL                                      | Completion note hint   |
| `created_at`      | TIMESTAMP NOT NULL                                     |                        |
| `updated_at`      | TIMESTAMP NOT NULL                                     |                        |
| `archived_at`     | TIMESTAMP NULL                                         |                        |

### `task_dependencies`

Directed edges: `task_id` cannot be completed before `depends_on_task_id`.

| Column               | Type                 | Notes |
| -------------------- | -------------------- | ----- |
| `id`                 | VARCHAR(36) PK       |       |
| `task_id`            | VARCHAR(36) NOT NULL |       |
| `depends_on_task_id` | VARCHAR(36) NOT NULL |       |
| `created_at`         | TIMESTAMP NOT NULL   |       |

### `task_progress`

Per-household completion status of each task.

| Column          | Type                                                | Notes               |
| --------------- | --------------------------------------------------- | ------------------- |
| `id`            | VARCHAR(36) PK                                      |                     |
| `household_id`  | VARCHAR(36) NOT NULL                                |                     |
| `task_id`       | VARCHAR(36) NOT NULL                                |                     |
| `status`        | ENUM('pending','in_progress','completed','overdue') |                     |
| `completed_at`  | TIMESTAMP NULL                                      |                     |
| `next_due_at`   | TIMESTAMP NULL                                      | For recurring tasks |
| `evidence_note` | TEXT NULL                                           | Free-text proof     |
| `completed_by`  | VARCHAR(255) NULL                                   |                     |
| `created_at`    | TIMESTAMP NOT NULL                                  |                     |
| `updated_at`    | TIMESTAMP NOT NULL                                  |                     |
| `archived_at`   | TIMESTAMP NULL                                      |                     |

---

## 7. Inventory Domain

[↑ TOC](#table-of-contents)

### `inventory_categories`

Supports both system-seeded categories (`is_system = true`, `household_id = NULL`) and per-household custom categories (`is_system = false`, `household_id` set). Active queries for a household return rows where `is_system = true OR household_id = :householdId`.

| Column         | Type                           | Notes                                             |
| -------------- | ------------------------------ | ------------------------------------------------- |
| `id`           | VARCHAR(36) PK                 |                                                   |
| `household_id` | VARCHAR(36) NULL               | NULL = system-seeded; non-null = household custom |
| `name`         | VARCHAR(255) NOT NULL          |                                                   |
| `slug`         | VARCHAR(100) NOT NULL          | Unique within scope (system or per-household)     |
| `is_system`    | BOOLEAN NOT NULL DEFAULT FALSE | TRUE for seed records; FALSE for household custom |
| `module_id`    | VARCHAR(36) NULL               | Optional link to owning module                    |
| `sort_order`   | INT NOT NULL DEFAULT 0         |                                                   |
| `created_at`   | TIMESTAMP NOT NULL             |                                                   |
| `updated_at`   | TIMESTAMP NOT NULL             |                                                   |
| `archived_at`  | TIMESTAMP NULL                 |                                                   |

### `inventory_items`

Household-specific item definitions. A single "item" may have multiple lots.

| Column                 | Type                                | Notes                                 |
| ---------------------- | ----------------------------------- | ------------------------------------- |
| `id`                   | VARCHAR(36) PK                      |                                       |
| `household_id`         | VARCHAR(36) NOT NULL                |                                       |
| `category_id`          | VARCHAR(36) NULL                    | FK → `inventory_categories`           |
| `name`                 | VARCHAR(500) NOT NULL               |                                       |
| `description`          | TEXT NULL                           |                                       |
| `unit`                 | VARCHAR(50) NOT NULL DEFAULT 'unit' | e.g. liters, cans, tablets            |
| `location`             | VARCHAR(255) NULL                   | Storage location label                |
| `target_qty`           | DECIMAL(10,2) NULL                  | Goal quantity                         |
| `low_stock_threshold`  | DECIMAL(10,2) NULL                  | Alert below this                      |
| `default_replace_days` | INT NULL                            | Item-level calendar replacement cycle |
| `is_tracked_by_expiry` | BOOLEAN NOT NULL DEFAULT FALSE      | Whether lots have expiry dates        |
| `notes`                | TEXT NULL                           |                                       |
| `created_at`           | TIMESTAMP NOT NULL                  |                                       |
| `updated_at`           | TIMESTAMP NOT NULL                  |                                       |
| `archived_at`          | TIMESTAMP NULL                      |                                       |

### `inventory_lots`

Physical batches. Archiving a lot = consumed or disposed.

| Column               | Type                   | Notes                                               |
| -------------------- | ---------------------- | --------------------------------------------------- |
| `id`                 | VARCHAR(36) PK         |                                                     |
| `item_id`            | VARCHAR(36) NOT NULL   | FK → `inventory_items`                              |
| `household_id`       | VARCHAR(36) NOT NULL   | Denorm for fast queries                             |
| `qty`                | DECIMAL(10,2) NOT NULL |                                                     |
| `acquired_at`        | DATE NULL              | Purchase/receive date                               |
| `expires_at`         | DATE NULL              | Best-before / expiry date                           |
| `replace_days`       | INT NULL               | Lot-level override of item's `default_replace_days` |
| `next_replace_at`    | DATE NULL              | Computed: `acquired_at + replace_days`              |
| `batch_ref`          | VARCHAR(255) NULL      | Lot number, receipt ref                             |
| `notes`              | TEXT NULL              |                                                     |
| `created_at`         | TIMESTAMP NOT NULL     |                                                     |
| `updated_at`         | TIMESTAMP NOT NULL     |                                                     |
| `archived_at`        | TIMESTAMP NULL         | Non-null = consumed/disposed                        |
| `replaced_by_lot_id` | VARCHAR(36) NULL       | Restore reference chain                             |

---

## 8. Equipment & Maintenance Domain

[↑ TOC](#table-of-contents)

### `equipment_categories`

Supports both system-seeded categories (`is_system = true`, `household_id = NULL`) and per-household custom categories (`is_system = false`, `household_id` set). Active queries for a household return rows where `is_system = true OR household_id = :householdId`.

| Column         | Type                           | Notes                                              |
| -------------- | ------------------------------ | -------------------------------------------------- |
| `id`           | VARCHAR(36) PK                 |                                                    |
| `household_id` | VARCHAR(36) NULL               | NULL = system-seeded; non-null = household custom  |
| `slug`         | VARCHAR(100) NOT NULL          | Unique within scope; referenced by equipment items |
| `name`         | VARCHAR(255) NOT NULL          |                                                    |
| `is_system`    | BOOLEAN NOT NULL DEFAULT FALSE | TRUE for seed records; FALSE for household custom  |
| `sort_order`   | INT NOT NULL DEFAULT 0         |                                                    |
| `created_at`   | TIMESTAMP NOT NULL             |                                                    |
| `updated_at`   | TIMESTAMP NOT NULL             |                                                    |
| `archived_at`  | TIMESTAMP NULL                 |                                                    |

### `equipment_items`

| Column          | Type                                                                                | Notes |
| --------------- | ----------------------------------------------------------------------------------- | ----- |
| `id`            | VARCHAR(36) PK                                                                      |       |
| `household_id`  | VARCHAR(36) NOT NULL                                                                |       |
| `category_slug` | VARCHAR(100) NOT NULL                                                               |       |
| `name`          | VARCHAR(500) NOT NULL                                                               |       |
| `model`         | VARCHAR(255) NULL                                                                   |       |
| `serial_no`     | VARCHAR(255) NULL                                                                   |       |
| `location`      | VARCHAR(255) NULL                                                                   |       |
| `status`        | ENUM('operational','needs_service','unserviceable','retired') DEFAULT 'operational' |       |
| `acquired_at`   | DATE NULL                                                                           |       |
| `notes`         | TEXT NULL                                                                           |       |
| `created_at`    | TIMESTAMP NOT NULL                                                                  |       |
| `updated_at`    | TIMESTAMP NOT NULL                                                                  |       |
| `archived_at`   | TIMESTAMP NULL                                                                      |       |

### `battery_profiles`

Global reference. Seed includes 5 chemistries.

| Column               | Type                                                                  | Notes                          |
| -------------------- | --------------------------------------------------------------------- | ------------------------------ |
| `id`                 | VARCHAR(36) PK                                                        |                                |
| `name`               | VARCHAR(255) NOT NULL                                                 |                                |
| `chemistry`          | ENUM('alkaline','lithium_primary','liion','nimh','lead_acid','other') |                                |
| `shelf_life_days`    | INT NULL                                                              |                                |
| `recheck_cycle_days` | INT NULL                                                              | How often to check or recharge |
| `storage_temp_min`   | INT NULL                                                              | Celsius                        |
| `storage_temp_max`   | INT NULL                                                              | Celsius                        |
| `notes`              | TEXT NULL                                                             |                                |
| `archived_at`        | TIMESTAMP NULL                                                        |                                |

### `maintenance_templates`

Global reusable templates. Seed includes 19.

| Column                   | Type                                                                           | Notes                         |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------- |
| `id`                     | VARCHAR(36) PK                                                                 |                               |
| `category_slug`          | VARCHAR(100) NOT NULL                                                          |                               |
| `name`                   | VARCHAR(500) NOT NULL                                                          |                               |
| `description`            | TEXT NULL                                                                      |                               |
| `task_type`              | ENUM('inspect','clean','lubricate','test','full_service','recharge','replace') |                               |
| `default_cal_days`       | INT NULL                                                                       | Calendar interval             |
| `usage_meter_unit`       | VARCHAR(50) NULL                                                               | e.g. `hours`, `cycles`        |
| `default_usage_interval` | DECIMAL(10,2) NULL                                                             |                               |
| `grace_days`             | INT NOT NULL DEFAULT 7                                                         | Days after due before OVERDUE |
| `archived_at`            | TIMESTAMP NULL                                                                 |                               |

### `maintenance_schedules`

Attaches a template (or custom definition) to a specific equipment item.

| Column              | Type                          | Notes                                  |
| ------------------- | ----------------------------- | -------------------------------------- |
| `id`                | VARCHAR(36) PK                |                                        |
| `equipment_item_id` | VARCHAR(36) NOT NULL          |                                        |
| `template_id`       | VARCHAR(36) NULL              | Optional template reference            |
| `name`              | VARCHAR(500) NOT NULL         |                                        |
| `cal_days`          | INT NULL                      | Override template's `default_cal_days` |
| `usage_meter_unit`  | VARCHAR(50) NULL              |                                        |
| `usage_interval`    | DECIMAL(10,2) NULL            |                                        |
| `grace_days`        | INT NOT NULL DEFAULT 7        |                                        |
| `last_done_at`      | DATE NULL                     |                                        |
| `last_meter_value`  | DECIMAL(10,2) NULL            |                                        |
| `next_due_at`       | DATE NULL                     | Computed, stored for fast queries      |
| `next_due_meter`    | DECIMAL(10,2) NULL            |                                        |
| `is_active`         | BOOLEAN NOT NULL DEFAULT TRUE |                                        |
| `created_at`        | TIMESTAMP NOT NULL            |                                        |
| `updated_at`        | TIMESTAMP NOT NULL            |                                        |
| `archived_at`       | TIMESTAMP NULL                |                                        |

### `maintenance_events`

Immutable service history records.

| Column              | Type                 | Notes                                          |
| ------------------- | -------------------- | ---------------------------------------------- |
| `id`                | VARCHAR(36) PK       |                                                |
| `schedule_id`       | VARCHAR(36) NOT NULL |                                                |
| `equipment_item_id` | VARCHAR(36) NOT NULL | Denorm                                         |
| `performed_at`      | TIMESTAMP NOT NULL   |                                                |
| `performed_by`      | VARCHAR(255) NULL    |                                                |
| `meter_reading`     | DECIMAL(10,2) NULL   |                                                |
| `next_due_at`       | DATE NULL            | Snapshot of computed next due at time of event |
| `notes`             | TEXT NULL            |                                                |
| `created_at`        | TIMESTAMP NOT NULL   |                                                |
| `archived_at`       | TIMESTAMP NULL       | (correction/void flow only)                    |

---

## 9. Alerts Domain

[↑ TOC](#table-of-contents)

### `alerts`

| Column         | Type                                                                                | Notes                       |
| -------------- | ----------------------------------------------------------------------------------- | --------------------------- |
| `id`           | VARCHAR(36) PK                                                                      |                             |
| `household_id` | VARCHAR(36) NOT NULL                                                                |                             |
| `severity`     | ENUM('upcoming','due','overdue') NOT NULL DEFAULT 'upcoming'                        |                             |
| `category`     | ENUM('expiry','replacement','maintenance','low_stock','task_due','policy') NOT NULL |                             |
| `title`        | VARCHAR(500) NOT NULL                                                               |                             |
| `detail`       | TEXT NULL                                                                           |                             |
| `entity_type`  | VARCHAR(100) NOT NULL                                                               | Related entity table name   |
| `entity_id`    | VARCHAR(36) NOT NULL                                                                | Related row ID              |
| `due_at`       | TIMESTAMP NULL                                                                      | Date/time driving the alert |
| `is_read`      | BOOLEAN NOT NULL DEFAULT false                                                      |                             |
| `is_resolved`  | BOOLEAN NOT NULL DEFAULT false                                                      |                             |
| `resolved_at`  | TIMESTAMP NULL                                                                      |                             |
| `created_at`   | TIMESTAMP NOT NULL                                                                  |                             |
| `updated_at`   | TIMESTAMP NOT NULL                                                                  |                             |
| `archived_at`  | TIMESTAMP NULL                                                                      |                             |

---

## 10. Archive & Restore Pattern

[↑ TOC](#table-of-contents)

**Archiving** sets `archived_at = NOW()`. The row stays in the table indefinitely.

**Active queries** always include `WHERE archived_at IS NULL`.

**Restoring** sets `archived_at = NULL`. Any route that supports restore will be a dedicated `POST /:id/restore` endpoint.

**Policy overrides** use an archive-then-insert pattern (not UPDATE) to maintain a full history of every value:

1. Archive the current active row (`archived_at = NOW()`)
2. Insert a new row with the new value
3. Write to `audit_log`

This means `household_policies` and `scenario_policies` may have multiple rows per key — only the row with `archived_at IS NULL` is active.

---

## 11. Enum Reference

[↑ TOC](#table-of-contents)

| Enum                                       | Values                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `households.active_scenario`               | `shelter_in_place`, `evacuation`                                                                         |
| `household_people_profiles.scenario_bound` | `shelter_in_place`, `evacuation`, NULL                                                                   |
| `modules.category`                         | `water`, `food`, `shelter`, `medical`, `security`, `comms`, `sanitation`, `power`, `mobility`, `general` |
| `tasks.task_class`                         | `acquire`, `prepare`, `test`, `maintain`, `document`                                                     |
| `tasks.readiness_level`                    | `l1_72h`, `l2_14d`, `l3_30d`, `l4_90d`                                                                   |
| `tasks.scenario`                           | `both`, `shelter_in_place`, `evacuation`                                                                 |
| `task_progress.status`                     | `pending`, `in_progress`, `completed`, `overdue`                                                         |
| `equipment_items.status`                   | `operational`, `needs_service`, `unserviceable`, `retired`                                               |
| `battery_profiles.chemistry`               | `alkaline`, `lithium_primary`, `liion`, `nimh`, `lead_acid`, `other`                                     |
| `maintenance_templates.task_type`          | `inspect`, `clean`, `lubricate`, `test`, `full_service`, `recharge`, `replace`                           |
| `alerts.severity`                          | `upcoming`, `due`, `overdue`                                                                             |
| `alerts.category`                          | `expiry`, `replacement`, `maintenance`, `low_stock`, `task_due`, `policy`                                |

---

_Content licensed under CC BY-NC-SA 4.0_
