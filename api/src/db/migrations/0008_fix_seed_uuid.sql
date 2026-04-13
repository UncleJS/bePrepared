-- Fix seed IDs: convert demo-household-001 slug to proper UUID
-- Required because POST /users and PATCH /users/:id validate householdId as exactly 36 chars.
-- The slug "demo-household-001" (18 chars) failed that validation, blocking user creation.
--
-- inventory_categories and equipment_categories have FK constraints pointing to households.id,
-- so they must be updated before the parent households row.
SET FOREIGN_KEY_CHECKS=0;
--> statement-breakpoint
UPDATE `inventory_categories`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `equipment_categories`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `households`
  SET `id` = '00000000-0000-0000-0000-000000000001'
  WHERE `id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `household_people_profiles`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `users`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `household_policies`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `scenario_policies`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `audit_log`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `task_progress`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `inventory_items`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `inventory_lots`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `equipment_items`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
UPDATE `alerts`
  SET `household_id` = '00000000-0000-0000-0000-000000000001'
  WHERE `household_id` = 'demo-household-001';
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS=1;
