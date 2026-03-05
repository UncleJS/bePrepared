// schema/modules.ts
import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const modules = mysqlTable("modules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 100 }),
  sortOrder: int("sort_order").notNull().default(0),
  category: mysqlEnum("category", [
    "water",
    "food",
    "shelter",
    "medical",
    "security",
    "comms",
    "sanitation",
    "power",
    "mobility",
    "general",
  ])
    .notNull()
    .default("general"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp("archived_at"),
});

export const sections = mysqlTable(
  "sections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    moduleId: varchar("module_id", { length: 36 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => ({
    moduleSlugUnique: uniqueIndex("sections_module_slug_unique").on(table.moduleId, table.slug),
  })
);

export const guidanceDocs = mysqlTable("guidance_docs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sectionId: varchar("section_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(), // Markdown (rendered in frontend)
  sortOrder: int("sort_order").notNull().default(0),
  badgeJson: text("badge_json"), // JSON array of shields.io badge configs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp("archived_at"),
});
