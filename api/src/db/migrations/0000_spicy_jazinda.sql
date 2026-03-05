CREATE TABLE `household_people_profiles` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`people_count` int NOT NULL DEFAULT 1,
	`is_default` boolean NOT NULL DEFAULT false,
	`scenario_bound` enum('shelter_in_place','evacuation'),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `household_people_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`target_people` int NOT NULL DEFAULT 2,
	`active_scenario` enum('shelter_in_place','evacuation') NOT NULL DEFAULT 'shelter_in_place',
	`active_profile_id` varchar(36),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36),
	`entity` varchar(100) NOT NULL,
	`entity_id` varchar(36),
	`action` varchar(50) NOT NULL,
	`changed_by` varchar(255),
	`old_value` varchar(1000),
	`new_value` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `household_policies` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value_decimal` decimal(10,4),
	`value_int` int,
	`unit` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `household_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_defaults` (
	`key` varchar(100) NOT NULL,
	`value_decimal` decimal(10,4),
	`value_int` int,
	`unit` varchar(50) NOT NULL,
	`description` varchar(500),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policy_defaults_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `scenario_policies` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`scenario` enum('shelter_in_place','evacuation') NOT NULL,
	`key` varchar(100) NOT NULL,
	`value_decimal` decimal(10,4),
	`value_int` int,
	`unit` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `scenario_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guidance_docs` (
	`id` varchar(36) NOT NULL,
	`section_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`badge_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `guidance_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon_name` varchar(100),
	`sort_order` int NOT NULL DEFAULT 0,
	`category` enum('water','food','shelter','medical','security','comms','sanitation','power','mobility','general') NOT NULL DEFAULT 'general',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `modules_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_dependencies` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`depends_on_task_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_progress` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`status` enum('pending','in_progress','completed','overdue') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`next_due_at` timestamp,
	`evidence_note` text,
	`completed_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `task_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`section_id` varchar(36),
	`title` varchar(500) NOT NULL,
	`description` text,
	`task_class` enum('acquire','prepare','test','maintain','document') NOT NULL DEFAULT 'acquire',
	`readiness_level` enum('l1_72h','l2_14d','l3_30d','l4_90d') NOT NULL DEFAULT 'l1_72h',
	`scenario` enum('both','shelter_in_place','evacuation') NOT NULL DEFAULT 'both',
	`is_recurring` boolean NOT NULL DEFAULT false,
	`recur_days` int,
	`sort_order` int NOT NULL DEFAULT 0,
	`evidence_prompt` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`module_id` varchar(36),
	`sort_order` int NOT NULL DEFAULT 0,
	`archived_at` timestamp,
	CONSTRAINT `inventory_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`category_id` varchar(36),
	`name` varchar(500) NOT NULL,
	`description` text,
	`unit` varchar(50) NOT NULL DEFAULT 'unit',
	`location` varchar(255),
	`target_qty` decimal(10,2),
	`low_stock_threshold` decimal(10,2),
	`default_replace_days` int,
	`is_tracked_by_expiry` boolean NOT NULL DEFAULT false,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_lots` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`qty` decimal(10,2) NOT NULL,
	`acquired_at` date,
	`expires_at` date,
	`replace_days` int,
	`next_replace_at` date,
	`batch_ref` varchar(255),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	`replaced_by_lot_id` varchar(36),
	CONSTRAINT `inventory_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `battery_profiles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`chemistry` enum('alkaline','lithium_primary','liion','nimh','lead_acid','other') NOT NULL,
	`shelf_life_days` int,
	`recheck_cycle_days` int,
	`storage_temp_min` int,
	`storage_temp_max` int,
	`notes` text,
	`archived_at` timestamp,
	CONSTRAINT `battery_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_items` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`category_slug` varchar(100) NOT NULL,
	`name` varchar(500) NOT NULL,
	`model` varchar(255),
	`serial_no` varchar(255),
	`location` varchar(255),
	`status` enum('operational','needs_service','unserviceable','retired') NOT NULL DEFAULT 'operational',
	`acquired_at` date,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `equipment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_events` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`equipment_item_id` varchar(36) NOT NULL,
	`performed_at` timestamp NOT NULL,
	`performed_by` varchar(255),
	`meter_reading` decimal(10,2),
	`next_due_at` date,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`archived_at` timestamp,
	CONSTRAINT `maintenance_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_schedules` (
	`id` varchar(36) NOT NULL,
	`equipment_item_id` varchar(36) NOT NULL,
	`template_id` varchar(36),
	`name` varchar(500) NOT NULL,
	`cal_days` int,
	`usage_meter_unit` varchar(50),
	`usage_interval` decimal(10,2),
	`grace_days` int NOT NULL DEFAULT 7,
	`last_done_at` date,
	`last_meter_value` decimal(10,2),
	`next_due_at` date,
	`next_due_meter` decimal(10,2),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `maintenance_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_templates` (
	`id` varchar(36) NOT NULL,
	`category_slug` varchar(100) NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`task_type` enum('inspect','clean','lubricate','test','full_service','recharge','replace') NOT NULL DEFAULT 'inspect',
	`default_cal_days` int,
	`usage_meter_unit` varchar(50),
	`default_usage_interval` decimal(10,2),
	`grace_days` int NOT NULL DEFAULT 7,
	`archived_at` timestamp,
	CONSTRAINT `maintenance_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` varchar(36) NOT NULL,
	`household_id` varchar(36) NOT NULL,
	`severity` enum('upcoming','due','overdue') NOT NULL DEFAULT 'upcoming',
	`category` enum('expiry','replacement','maintenance','low_stock','task_due','policy') NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`detail` text,
	`due_at` timestamp,
	`is_read` boolean NOT NULL DEFAULT false,
	`is_resolved` boolean NOT NULL DEFAULT false,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived_at` timestamp,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
