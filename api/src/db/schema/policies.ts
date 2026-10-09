// schema/policies.ts
import { sql } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  decimal,
  timestamp,
  mysqlEnum,
  int,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// System-wide defaults (only ever 1 row per key)
export const policyDefaults = mysqlTable("policy_defaults", {
  key: varchar("key", { length: 100 }).primaryKey(),
  valueDecimal: decimal("value_decimal", { precision: 10, scale: 4 }),
  valueInt: int("value_int"),
  unit: varchar("unit", { length: 50 }).notNull(),
  description: varchar("description", { length: 500 }),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
});

// Household-level global overrides (per key)
export const householdPolicies = mysqlTable(
  "household_policies",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    householdId: varchar("household_id", { length: 36 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    valueDecimal: decimal("value_decimal", { precision: 10, scale: 4 }),
    valueInt: int("value_int"),
    unit: varchar("unit", { length: 50 }).notNull(),
    createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
    updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
    archivedAtUTC: timestamp("archived_at_UTC"),
    activePolicyKey: varchar("active_policy_key", { length: 200 }).generatedAlwaysAs(
      sql`CASE WHEN \`archived_at_UTC\` IS NULL THEN CONCAT(\`household_id\`, ':', \`key\`) ELSE CONCAT(\`household_id\`, ':', \`key\`, ':', \`id\`) END`,
      { mode: "stored" }
    ),
  },
  (table) => ({
    activeKeyUnique: uniqueIndex("household_policies_active_key_unique").on(table.activePolicyKey),
  })
);

// Household + scenario overrides
export const scenarioPolicies = mysqlTable(
  "scenario_policies",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    householdId: varchar("household_id", { length: 36 }).notNull(),
    scenario: mysqlEnum("scenario", ["shelter_in_place", "evacuation"]).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    valueDecimal: decimal("value_decimal", { precision: 10, scale: 4 }),
    valueInt: int("value_int"),
    unit: varchar("unit", { length: 50 }).notNull(),
    createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
    updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
    archivedAtUTC: timestamp("archived_at_UTC"),
    activePolicyKey: varchar("active_policy_key", { length: 220 }).generatedAlwaysAs(
      sql`CASE WHEN \`archived_at_UTC\` IS NULL THEN CONCAT(\`household_id\`, ':', \`scenario\`, ':', \`key\`) ELSE CONCAT(\`household_id\`, ':', \`scenario\`, ':', \`key\`, ':', \`id\`) END`,
      { mode: "stored" }
    ),
  },
  (table) => ({
    activeKeyUnique: uniqueIndex("scenario_policies_active_key_unique").on(table.activePolicyKey),
  })
);

// Audit log for all policy / profile changes
export const auditLog = mysqlTable("audit_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  action: varchar("action", { length: 50 }).notNull(),
  changedBy: varchar("changed_by", { length: 255 }),
  oldValue: varchar("old_value", { length: 1000 }),
  newValue: varchar("new_value", { length: 1000 }),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
});
