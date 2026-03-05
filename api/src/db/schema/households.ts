// schema/households.ts
import {
  mysqlTable, varchar, int, timestamp, text, boolean, mysqlEnum, uniqueIndex
} from "drizzle-orm/mysql-core";

export const households = mysqlTable("households", {
  id:           varchar("id", { length: 36 }).primaryKey(),
  name:         varchar("name", { length: 255 }).notNull(),
  targetPeople: int("target_people").notNull().default(2),
  activeScenario: mysqlEnum("active_scenario", ["shelter_in_place", "evacuation"])
                    .notNull().default("shelter_in_place"),
  activeProfileId: varchar("active_profile_id", { length: 36 }),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt:   timestamp("archived_at"),
});

export const householdPeopleProfiles = mysqlTable("household_people_profiles", {
  id:             varchar("id", { length: 36 }).primaryKey(),
  householdId:    varchar("household_id", { length: 36 }).notNull(),
  name:           varchar("name", { length: 255 }).notNull(),
  peopleCount:    int("people_count").notNull().default(1),
  isDefault:      boolean("is_default").notNull().default(false),
  scenarioBound:  mysqlEnum("scenario_bound", ["shelter_in_place", "evacuation"]),
  notes:          text("notes"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  archivedAt:     timestamp("archived_at"),
}, (table) => ({
  householdNameUnique: uniqueIndex("household_people_profiles_household_name_unique").on(table.householdId, table.name),
}));
