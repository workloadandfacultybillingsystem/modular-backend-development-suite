CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`notification_type` text NOT NULL,
	`severity` text NOT NULL,
	`target_user_type` text NOT NULL,
	`target_user_id` integer,
	`reference_type` text,
	`reference_id` integer,
	`metadata` text,
	`is_read` integer DEFAULT false,
	`is_sent` integer DEFAULT true,
	`sent_at` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL
);
