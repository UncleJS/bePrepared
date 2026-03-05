UPDATE `task_progress` tp
JOIN `task_progress` winner
  ON winner.`household_id` = tp.`household_id`
 AND winner.`task_id` = tp.`task_id`
 AND winner.`archived_at` IS NULL
 AND (
   winner.`updated_at` > tp.`updated_at`
   OR (winner.`updated_at` = tp.`updated_at` AND winner.`created_at` > tp.`created_at`)
   OR (winner.`updated_at` = tp.`updated_at` AND winner.`created_at` = tp.`created_at` AND winner.`id` > tp.`id`)
 )
SET tp.`archived_at` = NOW()
WHERE tp.`archived_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `task_progress`
  ADD COLUMN `active_task_key` varchar(128)
  GENERATED ALWAYS AS (
    CASE
      WHEN `archived_at` IS NULL THEN CONCAT(`household_id`, ':', `task_id`)
      ELSE CONCAT(`household_id`, ':', `task_id`, ':', `id`)
    END
  ) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX `task_progress_active_task_unique`
  ON `task_progress` (`active_task_key`);
