// schema/tasks.ts
import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  sectionId: varchar("section_id", { length: 36 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  taskClass: mysqlEnum("task_class", ["acquire", "prepare", "test", "maintain", "document"])
    .notNull()
    .default("acquire"),
  readinessLevel: mysqlEnum("readiness_level", ["l1_72h", "l2_14d", "l3_30d", "l4_90d"])
    .notNull()
    .default("l1_72h"),
  scenario: mysqlEnum("scenario", ["both", "shelter_in_place", "evacuation"])
    .notNull()
    .default("both"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurDays: int("recur_days"), // recurrence interval in days
  sortOrder: int("sort_order").notNull().default(0),
  evidencePrompt: varchar("evidence_prompt", { length: 500 }),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

export const taskDependencies = mysqlTable("task_dependencies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskId: varchar("task_id", { length: 36 }).notNull(),
  dependsOnTaskId: varchar("depends_on_task_id", { length: 36 }).notNull(),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
});

export const taskProgress = mysqlTable("task_progress", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }).notNull(),
  taskId: varchar("task_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"])
    .notNull()
    .default("pending"),
  completedAtUTC: timestamp("completed_at_UTC"),
  nextDueAtUTC: timestamp("next_due_at_UTC"),
  evidenceNote: text("evidence_note"),
  completedBy: varchar("completed_by", { length: 255 }),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});
