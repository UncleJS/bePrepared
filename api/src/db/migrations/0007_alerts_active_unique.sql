UPDATE `alerts` a
JOIN `alerts` winner
  ON winner.`household_id` = a.`household_id`
 AND winner.`entity_type` = a.`entity_type`
 AND winner.`entity_id` = a.`entity_id`
 AND winner.`is_resolved` = 0
 AND winner.`archived_at` IS NULL
 AND a.`is_resolved` = 0
 AND a.`archived_at` IS NULL
 AND (
   winner.`updated_at` > a.`updated_at`
   OR (winner.`updated_at` = a.`updated_at` AND winner.`created_at` > a.`created_at`)
   OR (winner.`updated_at` = a.`updated_at` AND winner.`created_at` = a.`created_at` AND winner.`id` > a.`id`)
  )
SET a.`archived_at` = NOW()
WHERE a.`is_resolved` = 0
  AND a.`archived_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `alerts`
  ADD COLUMN `active_alert_key` varchar(256)
  GENERATED ALWAYS AS (
    CASE
      WHEN `is_resolved` = 0 AND `archived_at` IS NULL
        THEN CONCAT(`household_id`, ':', `entity_type`, ':', `entity_id`)
      ELSE CONCAT(`household_id`, ':', `entity_type`, ':', `entity_id`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_active_alert_unique`
  ON `alerts` (`active_alert_key`);
