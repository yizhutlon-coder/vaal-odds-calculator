CREATE TABLE `ritual_stats` (
	`ritual` text PRIMARY KEY NOT NULL,
	`choices` integer DEFAULT 0 NOT NULL,
	`successes` integer DEFAULT 0 NOT NULL
);
