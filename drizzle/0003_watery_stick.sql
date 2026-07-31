CREATE TABLE `cost_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`usd_to_brl` real DEFAULT 5.5 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_pricing` (
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_usd_per_million` real DEFAULT 0 NOT NULL,
	`output_usd_per_million` real DEFAULT 0 NOT NULL,
	`audio_usd_per_minute` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`provider`, `model`)
);
--> statement-breakpoint
ALTER TABLE `usage_logs` ADD `audio_duration_seconds` real DEFAULT 0 NOT NULL;