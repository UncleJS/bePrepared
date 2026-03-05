DELETE p1 FROM household_people_profiles p1
INNER JOIN household_people_profiles p2
  ON p1.household_id = p2.household_id
 AND p1.name = p2.name
 AND p1.id > p2.id;
--> statement-breakpoint
DELETE s1 FROM sections s1
INNER JOIN sections s2
  ON s1.module_id = s2.module_id
 AND s1.slug = s2.slug
 AND s1.id > s2.id;
--> statement-breakpoint
DELETE t1 FROM maintenance_templates t1
INNER JOIN maintenance_templates t2
  ON t1.category_slug = t2.category_slug
 AND t1.name = t2.name
 AND t1.id > t2.id;
--> statement-breakpoint
DELETE b1 FROM battery_profiles b1
INNER JOIN battery_profiles b2
  ON b1.name = b2.name
 AND b1.id > b2.id;
--> statement-breakpoint
CREATE UNIQUE INDEX `household_people_profiles_household_name_unique` ON `household_people_profiles` (`household_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sections_module_slug_unique` ON `sections` (`module_id`,`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_templates_category_name_unique` ON `maintenance_templates` (`category_slug`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `battery_profiles_name_unique` ON `battery_profiles` (`name`);
