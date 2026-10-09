-- Active policy uniqueness, profile scenario uniqueness, remaining FKs, and
-- maintenance scan index aligned to the equipment join path.

ALTER TABLE `household_policies`
  ADD COLUMN `active_policy_key` varchar(200)
  GENERATED ALWAYS AS (
    CASE
      WHEN `archived_at_UTC` IS NULL THEN CONCAT(`household_id`, ':', `key`)
      ELSE CONCAT(`household_id`, ':', `key`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `household_policies_active_key_unique`
  ON `household_policies` (`active_policy_key`);
--> statement-breakpoint
ALTER TABLE `scenario_policies`
  ADD COLUMN `active_policy_key` varchar(220)
  GENERATED ALWAYS AS (
    CASE
      WHEN `archived_at_UTC` IS NULL THEN CONCAT(`household_id`, ':', `scenario`, ':', `key`)
      ELSE CONCAT(`household_id`, ':', `scenario`, ':', `key`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_policies_active_key_unique`
  ON `scenario_policies` (`active_policy_key`);
--> statement-breakpoint
ALTER TABLE `household_people_profiles`
  ADD COLUMN `active_scenario_key` varchar(120)
  GENERATED ALWAYS AS (
    CASE
      WHEN `scenario_bound` IS NOT NULL AND `archived_at_UTC` IS NULL
        THEN CONCAT(`household_id`, ':', `scenario_bound`)
      ELSE CONCAT(`household_id`, ':', IFNULL(`scenario_bound`, '_'), ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `household_people_profiles_active_scenario_unique`
  ON `household_people_profiles` (`active_scenario_key`);
--> statement-breakpoint
ALTER TABLE `task_progress`
  ADD CONSTRAINT `task_progress_task_fk`
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `maintenance_events`
  ADD CONSTRAINT `maintenance_events_schedule_fk`
  FOREIGN KEY (`schedule_id`) REFERENCES `maintenance_schedules`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `maintenance_events`
  ADD CONSTRAINT `maintenance_events_equipment_fk`
  FOREIGN KEY (`equipment_item_id`) REFERENCES `equipment_items`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX `maintenance_schedules_equipment_due_idx`
  ON `maintenance_schedules` (`equipment_item_id`, `is_active`, `archived_at_UTC`, `next_due_at`);
--> statement-breakpoint
-- Drop dangling active_profile_id values before adding the FK.
UPDATE `households` h
  LEFT JOIN `household_people_profiles` p ON p.id = h.active_profile_id
  SET h.active_profile_id = NULL
  WHERE h.active_profile_id IS NOT NULL AND p.id IS NULL;
--> statement-breakpoint
ALTER TABLE `households`
  ADD CONSTRAINT `households_active_profile_fk`
  FOREIGN KEY (`active_profile_id`) REFERENCES `household_people_profiles`(`id`)
  ON DELETE SET NULL;
