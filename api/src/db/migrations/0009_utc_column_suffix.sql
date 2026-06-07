-- Rename every UTC datetime column to carry the _UTC suffix (global standard:
-- timezone semantics must be visible at every call site).
-- date-only columns (acquired_at, expires_at, next_replace_at) are unchanged —
-- they carry no time component.
--
-- alerts.active_alert_key and task_progress.active_task_key are STORED generated
-- columns whose expressions reference archived_at, so they (and their unique
-- indexes) are dropped and recreated around the renames.

DROP INDEX `alerts_active_alert_unique` ON `alerts`;
--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `active_alert_key`;
--> statement-breakpoint
ALTER TABLE `alerts`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`,
  RENAME COLUMN `due_at` TO `due_at_UTC`,
  RENAME COLUMN `resolved_at` TO `resolved_at_UTC`;
--> statement-breakpoint
ALTER TABLE `alerts`
  ADD COLUMN `active_alert_key` varchar(256)
  GENERATED ALWAYS AS (
    CASE
      WHEN `is_resolved` = 0 AND `archived_at_UTC` IS NULL
        THEN CONCAT(`household_id`, ':', `entity_type`, ':', `entity_id`)
      ELSE CONCAT(`household_id`, ':', `entity_type`, ':', `entity_id`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_active_alert_unique`
  ON `alerts` (`active_alert_key`);
--> statement-breakpoint
DROP INDEX `task_progress_active_task_unique` ON `task_progress`;
--> statement-breakpoint
ALTER TABLE `task_progress` DROP COLUMN `active_task_key`;
--> statement-breakpoint
ALTER TABLE `task_progress`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`,
  RENAME COLUMN `completed_at` TO `completed_at_UTC`,
  RENAME COLUMN `next_due_at` TO `next_due_at_UTC`;
--> statement-breakpoint
ALTER TABLE `task_progress`
  ADD COLUMN `active_task_key` varchar(128)
  GENERATED ALWAYS AS (
    CASE
      WHEN `archived_at_UTC` IS NULL THEN CONCAT(`household_id`, ':', `task_id`)
      ELSE CONCAT(`household_id`, ':', `task_id`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `task_progress_active_task_unique`
  ON `task_progress` (`active_task_key`);
--> statement-breakpoint
ALTER TABLE `audit_log`
  RENAME COLUMN `created_at` TO `created_at_UTC`;
--> statement-breakpoint
ALTER TABLE `battery_profiles`
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `equipment_categories`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `equipment_items`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `guidance_docs`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `household_people_profiles`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `household_policies`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `households`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `inventory_categories`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `inventory_items`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `inventory_lots`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `maintenance_events`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `performed_at` TO `performed_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `maintenance_schedules`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `maintenance_templates`
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `module_categories`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `modules`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `policy_defaults`
  RENAME COLUMN `updated_at` TO `updated_at_UTC`;
--> statement-breakpoint
ALTER TABLE `scenario_policies`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `sections`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `task_dependencies`
  RENAME COLUMN `created_at` TO `created_at_UTC`;
--> statement-breakpoint
ALTER TABLE `tasks`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
--> statement-breakpoint
ALTER TABLE `users`
  RENAME COLUMN `created_at` TO `created_at_UTC`,
  RENAME COLUMN `updated_at` TO `updated_at_UTC`,
  RENAME COLUMN `archived_at` TO `archived_at_UTC`;
