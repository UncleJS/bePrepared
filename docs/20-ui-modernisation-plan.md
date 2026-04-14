# 20 — UI Modernisation & Screen Organisation Plan

## Project Summary

**bePrepared** — household disaster-preparedness tracker.  
Scope: 72-hour to 90-day self-sufficiency. Multi-household, role-based (admin / member).  
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · NextAuth · Bun.

---

## 1. Current State Inventory

| Route                            | Status                                                     |
| -------------------------------- | ---------------------------------------------------------- |
| `/` (redirect)                   | → `/dashboard`                                             |
| `/(auth)/login`                  | ✅ exists                                                  |
| `/dashboard`                     | ✅ exists — two client widgets                             |
| `/modules`                       | ✅ list only                                               |
| `/modules/[slug]`                | ✅ detail page                                             |
| `/tasks`                         | ✅ decomposed — `use*Data`, `use*Actions`, FormFields, Row |
| `/inventory`                     | ✅ decomposed — item + lot rows/forms                      |
| `/equipment`                     | ✅ decomposed                                              |
| `/maintenance`                   | ✅ exists                                                  |
| `/planning`                      | ✅ exists                                                  |
| `/alerts`                        | ✅ exists — inline load + action logic                     |
| `/settings`                      | ✅ index card grid                                         |
| `/settings/household`            | ✅                                                         |
| `/settings/users`                | ✅ admin only                                              |
| `/settings/policies`             | ✅                                                         |
| `/settings/modules`              | ✅ admin only                                              |
| `/settings/inventory-categories` | ✅                                                         |
| `/settings/equipment-categories` | ✅                                                         |
| `/settings/families`             | ✅ admin only                                              |

**Known pain points (from doc 19):**

- Error/message UX inconsistent across pages
- Hook return shapes not standardised
- Inline mutation logic leaks into page components (alerts, maintenance)
- No shared confirm-archive-reload primitive
- No shadcn `<Dialog>` / `<Sheet>` for forms — raw inline sections used instead

---

## 2. Proposed Screen Map (Modernised)

### 2a. Public / Auth

```
/(auth)/login          Login card — email + password
```

### 2b. App Shell (all authenticated routes)

```
/layout.tsx            RootLayout
  └─ <AppShell>
       ├─ <SideNav>    Collapsible, 56px collapsed / 224px expanded
       ├─ <TopBar>     HouseholdSwitcher · UserMenu · AlertBadge
       └─ {children}
```

### 2c. Primary Navigation (8 items → rationalised to 7)

| #   | Route          | Label       | Icon            | Notes                                                |
| --- | -------------- | ----------- | --------------- | ---------------------------------------------------- |
| 1   | `/dashboard`   | Dashboard   | LayoutDashboard | readiness score + widgets                            |
| 2   | `/modules`     | Modules     | BookOpen        | guidance library                                     |
| 3   | `/tasks`       | Ticksheets  | CheckSquare     | keep label                                           |
| 4   | `/supplies`    | Supplies    | Package         | **merge** inventory + equipment into one tabbed page |
| 5   | `/maintenance` | Maintenance | Wrench          |                                                      |
| 6   | `/planning`    | Planning    | Calculator      |                                                      |
| 7   | `/alerts`      | Alerts      | Bell            | badge count                                          |
| —   | `/settings`    | Settings    | Settings        | collapsible sub-nav (admin-gated items)              |

> **Decision A** — see Section 4.

### 2d. Settings Sub-pages (unchanged routes, better grouping)

```
/settings                    Index card grid (existing pattern — keep)
/settings/household          Household profile
/settings/users              User management  [admin]
/settings/families           Families/household groups  [admin]
/settings/policies           Policy overrides
/settings/modules            Module content  [admin]
/settings/inventory-categories  [admin]
/settings/equipment-categories  [admin]
```

---

## 3. User Flows

### Flow 1 — First visit / login

```
/login → credential submit → redirect → /dashboard
```

### Flow 2 — Daily readiness check

```
/dashboard → click alert widget → /alerts → mark-read / resolve
```

### Flow 3 — Add consumable stock

```
/supplies (Inventory tab) → "+ Add Item" Sheet → fill form → save → row appears
```

### Flow 4 — Log maintenance

```
/maintenance → select equipment → log event → alert cleared
```

### Flow 5 — Work through a module

```
/modules → card list → /modules/[slug] → read sections → mark tasks complete via /tasks
```

### Flow 6 — Admin onboarding

```
/settings/families → create family
/settings/users → invite / create users
/settings/policies → set scenario horizons
```

---

## 4. Component Map

### Shell Components (`src/components/layout/`)

| Component           | Responsibility                                         |
| ------------------- | ------------------------------------------------------ |
| `AppShell`          | Wraps SideNav + TopBar + main content area             |
| `SideNav`           | Collapsible nav list; admin-gated Settings sub-tree    |
| `TopBar`            | Breadcrumb · HouseholdSwitcher · AlertBadge · UserMenu |
| `HouseholdSwitcher` | Dropdown to switch active household                    |
| `UserMenu`          | Avatar + dropdown (profile / logout)                   |
| `AlertBadge`        | Unread alert count pill — polls `/alerts` lightly      |

### Shared UI Primitives (`src/components/ui/`)

> Use shadcn generated components — **do not hand-roll these**.

| Component          | shadcn basis  | Use                                        |
| ------------------ | ------------- | ------------------------------------------ |
| `<DataTable>`      | `Table`       | All list pages                             |
| `<FormSheet>`      | `Sheet`       | Add/edit forms slide in from right         |
| `<ConfirmDialog>`  | `AlertDialog` | Delete / archive confirmations             |
| `<StatusBadge>`    | `Badge`       | Alert severity, task level, stock status   |
| `<EmptyState>`     | custom        | Empty lists with CTA                       |
| `<LoadingSpinner>` | custom        | Replaces bare `<p>Loading…</p>`            |
| `<ErrorBanner>`    | custom        | Replaces inconsistent inline error text    |
| `<Timestamp>`      | custom        | Always renders `YYYY-MM-DD HH:mm:ss` local |

### Shared Hooks (`src/lib/hooks/`)

| Hook                | Replaces                                              |
| ------------------- | ----------------------------------------------------- |
| `useApiResource<T>` | Repeated `loading/error/data` fetch patterns          |
| `useFormSheet`      | Sheet open/close + form reset                         |
| `useConfirmAction`  | confirm → async action → reload pattern               |
| `useToastFeedback`  | Replace scattered `message` state with shadcn `toast` |

### Feature Modules (page-level colocation stays)

```
src/app/
  dashboard/
    page.tsx                   Composition shell
    DashboardReadinessCard.tsx  NEW — score + horizon bars
    DashboardAlerts.tsx        (existing)
    DashboardPlanning.tsx      (existing)
    DashboardTasks.tsx         NEW — upcoming tasks widget

  supplies/                    NEW merged route
    page.tsx                   Tabs: Inventory | Equipment
    inventory/
      InventoryPanel.tsx
      InventoryItemRow.tsx
      InventoryLotRow.tsx
      InventoryItemFormFields.tsx
      InventoryLotFormFields.tsx
      useInventoryData.ts
      useInventoryItemActions.ts
      useInventoryLotActions.ts
    equipment/
      EquipmentPanel.tsx
      EquipmentRow.tsx
      EquipmentFormFields.tsx
      useEquipmentData.ts
      useEquipmentItemActions.ts

  tasks/
    page.tsx
    TaskRow.tsx
    TaskFormFields.tsx
    useTasksData.ts
    useTaskActions.ts

  maintenance/
    page.tsx
    MaintenanceRow.tsx         EXTRACT from page
    MaintenanceFormFields.tsx  EXTRACT from page
    useMaintenanceData.ts      (existing)
    useMaintenanceActions.ts   (existing)

  alerts/
    page.tsx                   Thin shell
    AlertRow.tsx               EXTRACT from page
    useAlertsData.ts           EXTRACT from page
    useAlertActions.ts         EXTRACT from page

  planning/
    page.tsx

  modules/
    page.tsx
    [slug]/page.tsx

  settings/
    page.tsx                   Card grid (keep)
    household/page.tsx
    users/page.tsx
    families/page.tsx
    policies/page.tsx
    modules/page.tsx
    inventory-categories/page.tsx
    equipment-categories/page.tsx
```

---

## 5. Key States for Every List Page

All list pages must handle these four states uniformly:

| State     | Component                                    |
| --------- | -------------------------------------------- |
| Loading   | `<LoadingSpinner />`                         |
| Error     | `<ErrorBanner message={…} retry={reload} />` |
| Empty     | `<EmptyState title icon cta />`              |
| Populated | `<DataTable>` or card grid                   |

---

## 6. Theming & Token Guidance (High-Contrast Dark)

```css
/* globals.css — dark mode tokens */
--background: 0 0% 6%; /* near-black canvas */
--foreground: 0 0% 98%; /* white text */
--card: 0 0% 10%; /* slightly lifted surface */
--card-foreground: 0 0% 98%;
--primary: 142 71% 45%; /* green — readiness positive signal */
--primary-foreground: 0 0% 4%;
--destructive: 0 72% 51%; /* red — alerts / overdue */
--border: 0 0% 18%; /* subtle borders */
--muted: 0 0% 14%;
--muted-foreground: 0 0% 55%;
--accent: 0 0% 15%; /* hover state */
```

Alert severity colours:

- `overdue` → `text-red-400 bg-red-900/20 border-red-800`
- `due` → `text-yellow-400 bg-yellow-900/15 border-yellow-800`
- `upcoming` → `text-foreground bg-card border-border`

Timestamps — always via `<Timestamp value={isoString} />`:

```tsx
// src/components/ui/Timestamp.tsx
export function Timestamp({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return (
    <time dateTime={d.toISOString()} className="font-mono text-xs text-muted-foreground">
      {formatted}
    </time>
  );
}
```

---

## 7. Decisions Needed

### Decision A — Inventory + Equipment merge

Should `/inventory` and `/equipment` be merged into a single `/supplies` page with tabs?

| Option                | Route                                                                 | Pros                                                        | Cons                       |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| **A1 ✅ Recommended** | `/supplies` (tabs: Inventory / Equipment)                             | Shorter nav, related concerns together, single load context | Breaks existing URLs       |
| A2                    | Keep separate routes, add "Supplies" section header in nav            | No URL churn                                                | Nav still has 8 items      |
| A3                    | Keep separate, no change                                              | Safest                                                      | Doesn't reduce nav clutter |
| A4                    | `/supplies/inventory` + `/supplies/inventory/[id]` full nested router | Most scalable                                               | Most work                  |

### Decision B — Form UI pattern

How should Add/Edit forms be presented?

| Option                | Pattern                                    | Pros                               | Cons                                |
| --------------------- | ------------------------------------------ | ---------------------------------- | ----------------------------------- |
| **B1 ✅ Recommended** | `<Sheet>` slide-in (shadcn)                | Modern, no page jump, context kept | Slightly more state                 |
| B2                    | Inline accordion section (current pattern) | Already exists                     | Clutters page, non-standard         |
| B3                    | Modal `<Dialog>`                           | Standard                           | Less screen space for complex forms |
| B4                    | Dedicated `/feature/new` route             | URL-addressable                    | Full navigation cost                |

### Decision C — Readiness score on Dashboard

Should a readiness/completeness score be added to the dashboard?

| Option                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| **C1 ✅ Recommended** | Percentage ring + horizon bars (72h / 2wk / 30d / 90d) |
| C2                    | Simple text summary per category                       |
| C3                    | Defer — no score for now                               |

### Decision D — SideNav collapse behaviour on mobile

| Option                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| **D1 ✅ Recommended** | Sheet drawer overlay on mobile (`<Sheet side="left">`) |
| D2                    | Icon-only rail (56px) always visible                   |
| D3                    | Top navigation bar replaces sidebar on mobile          |

---

## 8. Refactor Phases (aligned with doc 19)

| Phase                         | Work                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **P0 — Primitives**           | `<Timestamp>` · `<ErrorBanner>` · `<LoadingSpinner>` · `<EmptyState>` · `useToastFeedback` |
| **P1 — Shell**                | `AppShell` wrapper · `TopBar` AlertBadge · SideNav collapse                                |
| **P2 — Alerts extraction**    | `AlertRow` · `useAlertsData` · `useAlertActions`                                           |
| **P3 — Form sheets**          | `<FormSheet>` + `<ConfirmDialog>` replace inline sections                                  |
| **P4 — Supplies merge**       | `/supplies` tabbed page (if Decision A1 accepted)                                          |
| **P5 — Dashboard**            | Readiness card + tasks widget                                                              |
| **P6 — Hook standardisation** | `useApiResource<T>` base + standardise all feature hooks                                   |
