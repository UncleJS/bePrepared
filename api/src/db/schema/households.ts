// schema/households.ts
import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  text,
  boolean,
  mysqlEnum,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const households = mysqlTable("households", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  targetPeople: int("target_people").notNull().default(2),
  activeProfileId: varchar("active_profile_id", { length: 36 }),
  notes: text("notes"),
  createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
  updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
  archivedAtUTC: timestamp("archived_at_UTC"),
});

export const householdPeopleProfiles = mysqlTable(
  "household_people_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    householdId: varchar("household_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    peopleCount: int("people_count").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    scenarioBound: mysqlEnum("scenario_bound", ["shelter_in_place", "evacuation"]),
    notes: text("notes"),
    createdAtUTC: timestamp("created_at_UTC").notNull().defaultNow(),
    updatedAtUTC: timestamp("updated_at_UTC").notNull().defaultNow().onUpdateNow(),
    archivedAtUTC: timestamp("archived_at_UTC"),
  },
  (table) => ({
    householdNameUnique: uniqueIndex("household_people_profiles_household_name_unique").on(
      table.householdId,
      table.name
    ),
  })
);
