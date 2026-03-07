-- Migration 0006: introduce module_categories table, migrate modules.category enum → category_id FK
-- ---------------------------------------------------------------------------

-- 1. Create the module_categories table
CREATE TABLE `module_categories` (
  `id` varchar(36) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `archived_at` timestamp,
  CONSTRAINT `module_categories_id` PRIMARY KEY (`id`),
  CONSTRAINT `module_categories_slug_unique` UNIQUE (`slug`)
);
--> statement-breakpoint

-- 2. Add the new category_id column (nullable first so existing rows don't violate NOT NULL)
ALTER TABLE `modules` ADD COLUMN `category_id` varchar(36) NULL;
--> statement-breakpoint

-- 3. Backfill: insert the 10 system categories and set category_id on each module
--    (values match the old enum exactly; UUIDs are stable so re-runs are idempotent)
INSERT IGNORE INTO `module_categories` (`id`, `slug`, `title`, `sort_order`) VALUES
  ('cat-water-000000-0000-0000-000000000001', 'water',      'Water',                   1),
  ('cat-food-0000000-0000-0000-000000000002', 'food',       'Food',                    2),
  ('cat-shelter-0000-0000-0000-000000000003', 'shelter',    'Shelter',                 3),
  ('cat-medical-0000-0000-0000-000000000004', 'medical',    'Medical',                 4),
  ('cat-power-00000-0000-0000-000000000005', 'power',       'Power',                   5),
  ('cat-comms-00000-0000-0000-000000000006', 'comms',       'Communications',          6),
  ('cat-sanit-00000-0000-0000-000000000007', 'sanitation',  'Sanitation',              7),
  ('cat-secur-00000-0000-0000-000000000008', 'security',    'Security',                8),
  ('cat-mobil-00000-0000-0000-000000000009', 'mobility',    'Mobility',                9),
  ('cat-gener-00000-0000-0000-000000000010', 'general',     'General Preparedness',   10);
--> statement-breakpoint

-- 4. Backfill category_id on modules using the matching slug
UPDATE `modules` m
  JOIN `module_categories` mc ON mc.`slug` = m.`category`
  SET m.`category_id` = mc.`id`;
--> statement-breakpoint

-- 5. Now make category_id NOT NULL
ALTER TABLE `modules` MODIFY COLUMN `category_id` varchar(36) NOT NULL;
--> statement-breakpoint

-- 6. Add FK constraint
ALTER TABLE `modules`
  ADD CONSTRAINT `modules_category_id_fk`
  FOREIGN KEY (`category_id`) REFERENCES `module_categories`(`id`);
--> statement-breakpoint

-- 7. Drop the old enum column
ALTER TABLE `modules` DROP COLUMN `category`;
