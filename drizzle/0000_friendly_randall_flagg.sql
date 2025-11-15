CREATE TABLE `classrooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_number` text NOT NULL,
	`building` text NOT NULL,
	`capacity` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_room_number_unique` ON `classrooms` (`room_number`);--> statement-breakpoint
CREATE TABLE `faculty` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_email_unique` ON `faculty` (`email`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`credits` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);--> statement-breakpoint
CREATE TABLE `timetable` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faculty_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`classroom_id` integer NOT NULL,
	`day_of_week` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`semester` text NOT NULL,
	`student_group` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE no action
);
