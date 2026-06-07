// schema/equipment.ts
import {
  mysqlTable,
  varchar,
  text,
  int,
  decimal,
  boolean,
  timestamp,
  mysqlEnum,
  date,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const equipmentItems = mysqlTable("equipment_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }).notNull(),
  categoryId: varchar("category_id", { length: 36 }),
  categorySlug: varchar("category_slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  model: varchar("model", { length: 255 }),
  serialNo: varchar("serial_no", { length: 255 }),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["operational", "needs_service", "unserviceable", "retired"])
    .notNull()
    .default("operational"),
  acquiredAt: date("acquired_at"),
  notes: text("notes"),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

export const equipmentCategories = mysqlTable("equipment_categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }),
  isSystem: boolean("is_system").notNull().default(false),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

// Battery-specific profiling (linked to equipment_items or standalone)
export const batteryProfiles = mysqlTable(
  "battery_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    chemistry: mysqlEnum("chemistry", [
      "alkaline",
      "lithium_primary",
      "liion",
      "nimh",
      "lead_acid",
      "other",
    ]).notNull(),
    shelfLifeDays: int("shelf_life_days"),
    recheckCycleDays: int("recheck_cycle_days"), // how often to check/recharge
    storageTempMin: int("storage_temp_min"), // celsius
    storageTempMax: int("storage_temp_max"),
    notes: text("notes"),
    archivedAtUTC: timestamp("archived_at_UTC"),
  },
  (table) => ({
    nameUnique: uniqueIndex("battery_profiles_name_unique").on(table.name),
  })
);

// Templates for maintenance tasks (reusable)
export const maintenanceTemplates = mysqlTable(
  "maintenance_templates",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    categorySlug: varchar("category_slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    taskType: mysqlEnum("task_type", [
      "inspect",
      "clean",
      "lubricate",
      "test",
      "full_service",
      "recharge",
      "replace",
    ])
      .notNull()
      .default("inspect"),
    defaultCalDays: int("default_cal_days"), // calendar interval days
    usageMeterUnit: varchar("usage_meter_unit", { length: 50 }), // "hours", "cycles", "km"
    defaultUsageInterval: decimal("default_usage_interval", { precision: 10, scale: 2 }),
    graceDays: int("grace_days").notNull().default(7),
    archivedAtUTC: timestamp("archived_at_UTC"),
  },
  (table) => ({
    categoryNameUnique: uniqueIndex("maintenance_templates_category_name_unique").on(
      table.categorySlug,
      table.name
    ),
  })
);

// Per-item scheduled maintenance (links item to template with optional overrides)
export const maintenanceSchedules = mysqlTable("maintenance_schedules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  equipmentItemId: varchar("equipment_item_id", { length: 36 }).notNull(),
  templateId: varchar("template_id", { length: 36 }),
  name: varchar("name", { length: 500 }).notNull(),
  calDays: int("cal_days"), // override template
  usageMeterUnit: varchar("usage_meter_unit", { length: 50 }),
  usageInterval: decimal("usage_interval", { precision: 10, scale: 2 }),
  graceDays: int("grace_days").notNull().default(7),
  lastDoneAt: date("last_done_at"),
  lastMeterValue: decimal("last_meter_value", { precision: 10, scale: 2 }),
  nextDueAt: date("next_due_at"),
  nextDueMeter: decimal("next_due_meter", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

// Completed maintenance events (full service history)
export const maintenanceEvents = mysqlTable("maintenance_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scheduleId: varchar("schedule_id", { length: 36 }).notNull(),
  equipmentItemId: varchar("equipment_item_id", { length: 36 }).notNull(),
  performedAtUTC: timestamp("performed_at_UTC").notNull(),
  performedBy: varchar("performed_by", { length: 255 }),
  meterReading: decimal("meter_reading", { precision: 10, scale: 2 }),
  nextDueAt: date("next_due_at"),
  notes: text("notes"),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});
