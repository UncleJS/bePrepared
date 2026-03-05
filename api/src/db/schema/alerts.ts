// schema/alerts.ts
import {
  mysqlTable, varchar, text, boolean, timestamp, mysqlEnum
} from "drizzle-orm/mysql-core";

export const alerts = mysqlTable("alerts", {
  id:           varchar("id", { length: 36 }).primaryKey(),
  householdId:  varchar("household_id", { length: 36 }).notNull(),
  severity:     mysqlEnum("severity", ["upcoming", "due", "overdue"])
                  .notNull().default("upcoming"),
  category:     mysqlEnum("category", [
                  "expiry", "replacement", "maintenance", "low_stock",
                  "task_due", "policy"
                ]).notNull(),
  entityType:   varchar("entity_type", { length: 100 }).notNull(),
  entityId:     varchar("entity_id", { length: 36 }).notNull(),
  title:        varchar("title", { length: 500 }).notNull(),
  detail:       text("detail"),
  dueAt:        timestamp("due_at"),
  isRead:       boolean("is_read").notNull().default(false),
  isResolved:   boolean("is_resolved").notNull().default(false),
  resolvedAt:   timestamp("resolved_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt:   timestamp("archived_at"),
});
