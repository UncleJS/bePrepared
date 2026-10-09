-- Active alerts are unique per household + category + entity, so an expiring
-- lot can also have a replacement alert. Inactive rows stay unique via id.
DROP INDEX `alerts_active_alert_unique` ON `alerts`;
--> statement-breakpoint
ALTER TABLE `alerts` DROP COLUMN `active_alert_key`;
--> statement-breakpoint
ALTER TABLE `alerts`
  ADD COLUMN `active_alert_key` varchar(320)
  GENERATED ALWAYS AS (
    CASE
      WHEN `is_resolved` = 0 AND `archived_at_UTC` IS NULL
        THEN CONCAT(`household_id`, ':', `category`, ':', `entity_type`, ':', `entity_id`)
      ELSE CONCAT(`household_id`, ':', `category`, ':', `entity_type`, ':', `entity_id`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_active_alert_unique`
  ON `alerts` (`active_alert_key`);
