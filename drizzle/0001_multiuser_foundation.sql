CREATE TABLE `assistant_profiles` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`assistant_name` text DEFAULT 'SOL' NOT NULL,
	`user_name` text NOT NULL,
	`mission` text DEFAULT '' NOT NULL,
	`motivation` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'direto' NOT NULL,
	`challenge_level` integer DEFAULT 8 NOT NULL,
	`initiative_level` integer DEFAULT 8 NOT NULL,
	`adhd_support` integer DEFAULT true NOT NULL,
	`focus_areas` text DEFAULT 'receita recorrente, automação, família' NOT NULL,
	`work_hours` text DEFAULT '08:00-18:00' NOT NULL,
	`quiet_hours` text DEFAULT '22:00-07:00' NOT NULL,
	`monthly_goal` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`operation` text DEFAULT 'assistant' NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`audio_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_workspace_idx` ON `usage_logs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `usage_user_idx` ON `usage_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`plan` text DEFAULT 'beta' NOT NULL,
	`workspace_id` text NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`last_login_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_workspace_idx` ON `users` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `users` (
	`id`, `email`, `name`, `role`, `status`, `plan`, `workspace_id`,
	`onboarding_completed`, `created_at`, `updated_at`
) VALUES (
	'usr_diego', 'elevensites04@gmail.com', 'Diego', 'superadmin', 'active',
	'founder', 'ws_diego', true, datetime('now'), datetime('now')
);
--> statement-breakpoint
INSERT INTO `workspaces` (
	`id`, `owner_user_id`, `name`, `status`, `created_at`, `updated_at`
) VALUES (
	'ws_diego', 'usr_diego', 'Workspace de Diego', 'active', datetime('now'), datetime('now')
);
--> statement-breakpoint
INSERT INTO `assistant_profiles` (
	`workspace_id`, `assistant_name`, `user_name`, `mission`, `motivation`,
	`tone`, `challenge_level`, `initiative_level`, `adhd_support`, `focus_areas`,
	`work_hours`, `quiet_hours`, `monthly_goal`, `updated_at`
)
SELECT
	'ws_diego', 'SOL', `user_name`, `mission`,
	'Transformar a vida da minha família por meio de receita recorrente, automação e liberdade.',
	'incisivo', 10, 10, true, 'receita recorrente, automação, família',
	'08:00-18:00', '22:00-07:00', `monthly_goal`, datetime('now')
FROM `settings`
WHERE `id` = 1;
--> statement-breakpoint
ALTER TABLE `conversations` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
UPDATE `conversations` SET `day_key` = 'ws_diego:' || `day_key` WHERE `day_key` NOT LIKE 'ws_%:%';--> statement-breakpoint
UPDATE `context_cache` SET `key` = 'ws_diego:' || `key` WHERE `key` NOT LIKE 'ws_%:%';--> statement-breakpoint
ALTER TABLE `history` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
CREATE INDEX `history_workspace_idx` ON `history` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `memories` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
CREATE INDEX `memories_workspace_idx` ON `memories` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `messages` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
CREATE INDEX `messages_workspace_idx` ON `messages` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
CREATE INDEX `projects_workspace_idx` ON `projects` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `workspace_id` text DEFAULT 'ws_diego' NOT NULL;--> statement-breakpoint
CREATE INDEX `tasks_workspace_idx` ON `tasks` (`workspace_id`);
