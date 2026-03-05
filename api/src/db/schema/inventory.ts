// schema/inventory.ts
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
} from "drizzle-orm/mysql-core";

export const inventoryCategories = mysqlTable("inventory_categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }),
  isSystem: boolean("is_system").notNull().default(false),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp("archived_at"),
});

export const inventoryItems = mysqlTable("inventory_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 }).notNull(),
  categoryId: varchar("category_id", { length: 36 }),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 50 }).notNull().default("unit"),
  location: varchar("location", { length: 255 }),
  targetQty: decimal("target_qty", { precision: 10, scale: 2 }),
  lowStockThreshold: decimal("low_stock_threshold", { precision: 10, scale: 2 }),
  defaultReplaceDays: int("default_replace_days"), // cycle-based replacement
  isTrackedByExpiry: boolean("is_tracked_by_expiry").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp("archived_at"),
});

// Each physical lot/batch of an inventory item
export const inventoryLots = mysqlTable("inventory_lots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  itemId: varchar("item_id", { length: 36 }).notNull(),
  householdId: varchar("household_id", { length: 36 }).notNull(),
  qty: decimal("qty", { precision: 10, scale: 2 }).notNull(),
  acquiredAt: date("acquired_at"),
  expiresAt: date("expires_at"),
  replaceDays: int("replace_days"), // override default
  nextReplaceAt: date("next_replace_at"),
  batchRef: varchar("batch_ref", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp("archived_at"), // archived = consumed/disposed
  replacedByLotId: varchar("replaced_by_lot_id", { length: 36 }), // restore ref
});
