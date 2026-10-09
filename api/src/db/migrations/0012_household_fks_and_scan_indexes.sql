-- Tenant foreign keys and scan indexes for alert jobs.
-- Forward-only. Fails if a household_id points at a missing household.

ALTER TABLE `users`
  ADD CONSTRAINT `users_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `inventory_lots`
  ADD CONSTRAINT `inventory_lots_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `equipment_items`
  ADD CONSTRAINT `equipment_items_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `household_policies`
  ADD CONSTRAINT `household_policies_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `scenario_policies`
  ADD CONSTRAINT `scenario_policies_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `household_people_profiles`
  ADD CONSTRAINT `household_people_profiles_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `task_progress`
  ADD CONSTRAINT `task_progress_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `maintenance_schedules`
  ADD CONSTRAINT `maintenance_schedules_equipment_fk`
  FOREIGN KEY (`equipment_item_id`) REFERENCES `equipment_items`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX `inventory_lots_expiry_scan_idx`
  ON `inventory_lots` (`household_id`, `archived_at_UTC`, `expires_at`);
--> statement-breakpoint
CREATE INDEX `inventory_lots_replace_scan_idx`
  ON `inventory_lots` (`household_id`, `archived_at_UTC`, `next_replace_at`);
--> statement-breakpoint
CREATE INDEX `equipment_items_household_active_idx`
  ON `equipment_items` (`household_id`, `archived_at_UTC`);
--> statement-breakpoint
CREATE INDEX `maintenance_schedules_due_scan_idx`
  ON `maintenance_schedules` (`is_active`, `archived_at_UTC`, `next_due_at`);
--> statement-breakpoint
CREATE INDEX `alerts_household_due_idx`
  ON `alerts` (`household_id`, `archived_at_UTC`, `due_at_UTC`);
