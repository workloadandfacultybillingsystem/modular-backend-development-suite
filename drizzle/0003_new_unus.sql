CREATE TABLE `holidays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`affects_department` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `salary_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faculty_id` integer NOT NULL,
	`lecture_rate_per_hour` integer NOT NULL,
	`practical_rate_per_hour` integer NOT NULL,
	`tutorial_rate_per_hour` integer NOT NULL,
	`extra_class_bonus` integer NOT NULL,
	`makeup_class_bonus` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `syllabus_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_id` integer NOT NULL,
	`semester` text NOT NULL,
	`required_lecture_hours` integer NOT NULL,
	`required_practical_hours` integer NOT NULL,
	`required_tutorial_hours` integer NOT NULL,
	`total_weeks` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workload_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faculty_id` integer NOT NULL,
	`period` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`total_lectures` integer NOT NULL,
	`total_practicals` integer NOT NULL,
	`total_tutorials` integer NOT NULL,
	`total_hours` integer NOT NULL,
	`extra_classes` integer NOT NULL,
	`makeup_classes` integer NOT NULL,
	`subjects_count` integer NOT NULL,
	`estimated_salary` integer NOT NULL,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `timetable` ADD `class_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `timetable` ADD `is_extra_class` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `timetable` ADD `is_makeup_class` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `timetable` ADD `original_class_id` integer;