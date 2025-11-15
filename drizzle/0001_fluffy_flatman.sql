CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_type` text NOT NULL,
	`user_id` text,
	`user_name` text,
	`timestamp` text NOT NULL,
	`description` text NOT NULL,
	`reference_type` text,
	`reference_id` integer,
	`previous_value` text,
	`new_value` text,
	`metadata` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`is_system_action` integer DEFAULT false,
	`created_at` text NOT NULL
);
