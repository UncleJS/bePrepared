ALTER TABLE `inventory_categories`
  ADD COLUMN `household_id` varchar(36) NULL,
  ADD COLUMN `is_system` boolean NOT NULL DEFAULT false,
  ADD COLUMN `created_at` timestamp NOT NULL DEFAULT (now()),
  ADD COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;
--> statement-breakpoint
UPDATE `inventory_categories` SET `is_system` = true WHERE `is_system` = false;
--> statement-breakpoint
ALTER TABLE `inventory_categories` DROP INDEX `inventory_categories_slug_unique`;
--> statement-breakpoint
CREATE INDEX `inventory_categories_household_idx` ON `inventory_categories` (`household_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_categories_household_slug_unique` ON `inventory_categories` (`household_id`,`slug`);
--> statement-breakpoint
CREATE TABLE `equipment_categories` (
  `id` varchar(36) NOT NULL,
  `household_id` varchar(36),
  `is_system` boolean NOT NULL DEFAULT false,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `archived_at` timestamp,
  CONSTRAINT `equipment_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `equipment_categories_household_idx` ON `equipment_categories` (`household_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_categories_household_slug_unique` ON `equipment_categories` (`household_id`,`slug`);
--> statement-breakpoint
INSERT INTO `equipment_categories` (`id`,`household_id`,`is_system`,`name`,`slug`,`sort_order`)
SELECT UUID(), NULL, true,
  CONCAT(UCASE(LEFT(`category_slug`,1)), REPLACE(SUBSTRING(`category_slug`,2), '_', ' ')),
  `category_slug`,
  0
FROM `equipment_items`
WHERE `category_slug` IS NOT NULL
GROUP BY `category_slug`;
--> statement-breakpoint
ALTER TABLE `equipment_items` ADD COLUMN `category_id` varchar(36) NULL;
--> statement-breakpoint
UPDATE `equipment_items` ei
JOIN `equipment_categories` ec ON ec.`slug` = ei.`category_slug` AND ec.`household_id` IS NULL AND ec.`is_system` = true
SET ei.`category_id` = ec.`id`
WHERE ei.`category_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `inventory_categories`
  ADD CONSTRAINT `inventory_categories_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `equipment_categories`
  ADD CONSTRAINT `equipment_categories_household_fk`
  FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_category_fk`
  FOREIGN KEY (`category_id`) REFERENCES `inventory_categories`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `inventory_lots`
  ADD CONSTRAINT `inventory_lots_item_fk`
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `equipment_items`
  ADD CONSTRAINT `equipment_items_category_fk`
  FOREIGN KEY (`category_id`) REFERENCES `equipment_categories`(`id`) ON DELETE SET NULL;
