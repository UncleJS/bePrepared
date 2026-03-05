// schema/tasks.ts
import {
  mysqlTable, varchar, text, int, boolean, timestamp, mysqlEnum
} from "drizzle-orm/mysql-core";

export const tasks = mysqlTable("tasks", {
  id:             varchar("id", { length: 36 }).primaryKey(),
  moduleId:       varchar("module_id", { length: 36 }).notNull(),
  sectionId:      varchar("section_id", { length: 36 }),
  title:          varchar("title", { length: 500 }).notNull(),
  description:    text("description"),
  taskClass:      mysqlEnum("task_class", [
                    "acquire", "prepare", "test", "maintain", "document"
                  ]).notNull().default("acquire"),
  readinessLevel: mysqlEnum("readiness_level", ["l1_72h", "l2_14d", "l3_30d", "l4_90d"])
                    .notNull().default("l1_72h"),
  scenario:       mysqlEnum("scenario", ["both", "shelter_in_place", "evacuation"])
                    .notNull().default("both"),
  isRecurring:    boolean("is_recurring").notNull().default(false),
  recurDays:      int("recur_days"),     // recurrence interval in days
  sortOrder:      int("sort_order").notNull().default(0),
  evidencePrompt: varchar("evidence_prompt", { length: 500 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt:     timestamp("archived_at"),
});

export const taskDependencies = mysqlTable("task_dependencies", {
  id:              varchar("id", { length: 36 }).primaryKey(),
  taskId:          varchar("task_id", { length: 36 }).notNull(),
  dependsOnTaskId: varchar("depends_on_task_id", { length: 36 }).notNull(),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

export const taskProgress = mysqlTable("task_progress", {
  id:           varchar("id", { length: 36 }).primaryKey(),
  householdId:  varchar("household_id", { length: 36 }).notNull(),
  taskId:       varchar("task_id", { length: 36 }).notNull(),
  status:       mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"])
                  .notNull().default("pending"),
  completedAt:  timestamp("completed_at"),
  nextDueAt:    timestamp("next_due_at"),
  evidenceNote: text("evidence_note"),
  completedBy:  varchar("completed_by", { length: 255 }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt:   timestamp("archived_at"),
});
