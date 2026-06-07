// schema/alerts.ts
import { mysqlTable, varchar, text, boolean, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const alerts = mysqlTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }).notNull(),
  severity: mysqlEnum("severity", ["upcoming", "due", "overdue"]).notNull().default("upcoming"),
  category: mysqlEnum("category", [
    "expiry",
    "replacement",
    "maintenance",
    "low_stock",
    "task_due",
    "policy",
  ]).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  detail: text("detail"),
  dueAtUTC: timestamp("due_at_UTC"),
  isRead: boolean("is_read").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAtUTC: timestamp("resolved_at_UTC"),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});
