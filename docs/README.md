# bePrepared — Disaster Preparedness System

![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-lightgrey?style=flat-square)
![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Elysia%20%7C%20MariaDB-blue?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-Podman_Pod-orange?style=flat-square)
![Docs](https://img.shields.io/badge/docs-20_pages-informational?style=flat-square)

> A database-driven household preparedness platform — from 72-hour readiness to 90-day self-sufficiency.

---

## Table of Contents

1. [About This System](#1-about-this-system)
2. [Documentation Map](#2-documentation-map)
3. [Quick Start](#3-quick-start)
4. [Core Concepts at a Glance](#4-core-concepts-at-a-glance)
5. [System Architecture Summary](#5-system-architecture-summary)
6. [Review and Remediation Backlog](#6-review-and-remediation-backlog)
7. [License and Attribution](#7-license-and-attribution)

---

## 1. About This System

**bePrepared** is a structured household disaster preparedness platform that guides you from first steps to long-term self-sufficiency through:

- **Ticksheets** — actionable, level-based checklists from 72-hour to 90-day readiness
- **Scenario planning** — separate strategies and resource targets for shelter-in-place and evacuation
- **Configurable household targets** — water, calories, and people counts that adapt to your household
- **Lifecycle management** — expiry tracking, replacement cycles, and maintenance scheduling for consumables and equipment
- **Intelligent alerting** — upcoming, due, and overdue notifications prioritised by life-safety relevance
- **Guidance modules** — detailed operational doctrine for Water, Food, Power, Comms, Medical, Shelter, Sanitation, Security, and Mobility

[↑ Go to TOC](#table-of-contents)

---

## 2. Documentation Map

Source of truth note: for persisted enums, field names, and API payload semantics, treat [Data Model](./09-data-model.md) and [API Contract](./10-api-contract.md) as canonical. Narrative docs explain behavior and examples, but should defer to those two specs when wording differs.

| #   | File                                                                                                            | Purpose                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 01  | [Theory and Figures](./01-theory-and-figures.md)                                                                | Planning assumptions, default values, and the reasoning behind them       |
| 02  | [Usage Guide](./02-usage-guide.md)                                                                              | Daily, weekly, and monthly operational workflows                          |
| 03  | [Ticksheets and Progression](./03-ticksheets-and-progression.md)                                                | Level model, task types, dependency logic, and scoring                    |
| 04  | [Settings and Overrides](./04-settings-and-overrides.md)                                                        | Household policy system, profiles, and scenario binding                   |
| 05  | [Inventory, Replacement, Expiry](./05-inventory-replacement-expiry.md)                                          | Stock management, rotation, and lifecycle rules                           |
| 06  | [Maintenance Management](./06-maintenance-management.md)                                                        | Equipment and battery maintenance scheduling                              |
| 07  | [Alerting and Prioritization](./07-alerting-and-prioritization.md)                                              | Alert severity model and triage logic                                     |
| 08  | [Architecture](./08-architecture.md)                                                                            | Full system topology and data flow                                        |
| 09  | [Data Model](./09-data-model.md)                                                                                | Entity definitions and relationships                                      |
| 10  | [API Contract](./10-api-contract.md)                                                                            | Endpoint groups and payload shapes                                        |
| 11  | [Operations — Podman](./11-operations-podman.md)                                                                | Pod deployment, startup, and maintenance                                  |
| 12  | [Governance and License](./12-governance-license.md)                                                            | CC BY-NC-SA rules, contribution standards                                 |
| 13  | [Quickstart Operator Checklist](./13-quickstart-operator-checklist.md)                                          | One-page printable runbook                                                |
| 14  | [Project Review and Remediation Backlog](./14-project-review-and-remediation-backlog.md)                        | Prioritized findings checklist for deep-dive follow-up                    |
| 15  | [Deep Dive: Auth and Session Architecture](./15-deep-dive-auth-session-architecture.md)                         | Detailed auth flow, trust boundaries, and hardening posture               |
| 16  | [Deep Dive: API Authorization and Household Scoping](./16-deep-dive-api-authorization-household-scoping.md)     | Guard coverage, scope boundaries, and authorization behavior              |
| 17  | [Deep Dive: Alert Generation and Escalation](./17-deep-dive-alert-generation-escalation.md)                     | Worker alert correctness, escalation, and lifecycle behavior              |
| 18  | [Deep Dive: Data Model Constraints, Indexes, and FK Strategy](./18-deep-dive-data-model-indexes-fk-strategy.md) | Schema integrity posture and scale-oriented DB strategy                   |
| 19  | [Deep Dive: Frontend Maintainability Refactor Plan](./19-deep-dive-frontend-maintainability-plan.md)            | Incremental roadmap for frontend maintainability and testability          |
| 20  | [Deep Dive: Deployment Hardening (Podman/Quadlet)](./20-deep-dive-deployment-hardening-podman-quadlet.md)       | Operations hardening posture and deployment resilience plan               |
| —   | [Deployment Scripts](../scripts/README.md)                                                                      | install, uninstall, rebuild, start/stop/restart, status, logs, db, update |

[↑ Go to TOC](#table-of-contents)

---

## 3. Quick Start

```bash
# 1. Clone / enter project
cd bePrepared

# 2. Install all dependencies
bun install

# 3. Copy environment template and fill in secrets
cp deploy/.env.example deploy/.env
$EDITOR deploy/.env

# 4. Install, build, and start everything (migrations + seed included)
./scripts/install.sh

# 5. Open frontend
http://localhost:9999

# 6. Open API docs
http://localhost:3001/docs
```

See [scripts/README.md](../scripts/README.md) for the full scripts reference (rebuild, update, logs, and more).

[↑ Go to TOC](#table-of-contents)

---

## 4. Core Concepts at a Glance

| Concept                  | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| **Readiness Level**      | L1=72h, L2=14d, L3=30d, L4=90d                                        |
| **Scenario**             | `shelter_in_place` or `evacuation`                                    |
| **Household Profile**    | Named people-count that auto-switches by scenario                     |
| **Policy**               | Configurable per-person/day targets (water, calories, alert windows)  |
| **Effective value**      | Scenario override → global override → system default                  |
| **Ticksheet**            | Checklist of tasks at a readiness level, with dependency tracking     |
| **Inventory lot**        | Physical batch of a consumable with qty, expiry, and replacement date |
| **Maintenance schedule** | Calendar and/or usage-based service interval for equipment            |
| **Alert**                | Upcoming / due / overdue notification generated by the worker         |

[↑ Go to TOC](#table-of-contents)

---

## 5. System Architecture Summary

```
┌─────────────────── Podman Pod: beprepared ─────────────────────────┐
│                                                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │  frontend   │──▶│     api     │──▶│   mariadb   │               │
│  │  Next.js    │   │ Elysia/Bun  │   │ (persistent)│               │
│  │  :9999      │   │  :3001      │   │  :3306      │               │
│  └─────────────┘   └──────┬──────┘   └──────▲──────┘               │
│                            │                 │                       │
│                     ┌──────▼──────┐          │                       │
│                     │   worker    │──────────┘                       │
│                     │  Bun cron   │                                  │
│                     └─────────────┘                                  │
└───────────────────────────────────────────────────────────────────────┘
```

See [Architecture](./08-architecture.md) and [Operations — Podman](./11-operations-podman.md) for full detail.

[↑ Go to TOC](#table-of-contents)

---

## 6. Review and Remediation Backlog

For a persistent, prioritized checklist based on the latest project-wide review, see:

- [Project Review and Remediation Backlog](./14-project-review-and-remediation-backlog.md)

This file is intended to be the working list for deep-dive sessions and implementation follow-ups.

[↑ Go to TOC](#table-of-contents)

---

## 7. License and Attribution

This documentation and all authored guidance content is licensed under:

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

You are free to share and adapt this material for non-commercial purposes, provided you give appropriate credit and distribute your contributions under the same license.

Full license text: https://creativecommons.org/licenses/by-nc-sa/4.0/

See [Governance and License](./12-governance-license.md) for full usage rules and attribution guidance.

[↑ Go to TOC](#table-of-contents)

---

_Content licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) · bePrepared Disaster Preparedness System_
