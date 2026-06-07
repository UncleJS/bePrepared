// schema/modules.ts
import { mysqlTable, varchar, text, int, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";

export const moduleCategories = mysqlTable("module_categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

export const modules = mysqlTable("modules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 100 }),
  sortOrder: int("sort_order").notNull().default(0),
  categoryId: varchar("category_id", { length: 36 })
    .notNull()
    .references(() => moduleCategories.id),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

export const sections = mysqlTable(
  "sections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    moduleId: varchar("module_id", { length: 36 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
    updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
    archivedAtUTC: timestamp("archived_at_UTC"),
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
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});
