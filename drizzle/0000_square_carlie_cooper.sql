CREATE TABLE `context_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`day_key` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`greeted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_day_key_unique` ON `conversations` (`day_key`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_created_idx` ON `history` (`created_at`);--> statement-breakpoint
CREATE INDEX `history_entity_idx` ON `history` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`kind` text DEFAULT 'contexto' NOT NULL,
	`content` text NOT NULL,
	`importance` integer DEFAULT 5 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memories_project_idx` ON `memories` (`project_id`);--> statement-breakpoint
CREATE INDEX `memories_importance_idx` ON `memories` (`importance`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`provider` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planejamento' NOT NULL,
	`priority` text DEFAULT 'media' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`recurring_value` real DEFAULT 0 NOT NULL,
	`one_time_value` real DEFAULT 0 NOT NULL,
	`due_date` text,
	`last_update` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_updated_idx` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`provider` text PRIMARY KEY NOT NULL,
	`encrypted_key` text NOT NULL,
	`iv` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`active_provider` text DEFAULT 'openai' NOT NULL,
	`openai_model` text DEFAULT 'gpt-5.6-terra' NOT NULL,
	`google_model` text DEFAULT 'gemini-3.6-flash' NOT NULL,
	`anthropic_model` text DEFAULT 'claude-sonnet-5' NOT NULL,
	`user_name` text DEFAULT 'Diego' NOT NULL,
	`mission` text DEFAULT 'Transformar a vida da minha família com receita recorrente, automação e liberdade.' NOT NULL,
	`monthly_goal` real DEFAULT 20000 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`priority` text DEFAULT 'media' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`due_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`id`, `updated_at`) VALUES (1, '2026-07-30T08:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `projects` (`id`,`name`,`objective`,`status`,`priority`,`reason`,`next_action`,`recurring_value`,`one_time_value`,`due_date`,`last_update`,`created_at`,`updated_at`) VALUES
('prj_ismael','Dr. Ismael','Entregar uma IA com CRM no WhatsApp e transformar a solução em produto escalável.','negociacao','critica','Construir receita recorrente com um produto replicável para empresários mentorados.','Fazer o follow-up da proposta e fechar o escopo do MVP.',0,0,'2026-07-30T15:00:00.000Z','2026-07-25T12:00:00.000Z','2026-07-15T12:00:00.000Z','2026-07-25T12:00:00.000Z'),
('prj_aston','Aston','Publicar o novo site e estruturar a operação digital.','ativo','alta','Avançar uma oportunidade com potencial de contrato de longo prazo.','Confirmar a próxima reunião e o apontamento do domínio.',0,0,'2026-07-31T12:00:00.000Z','2026-07-28T12:00:00.000Z','2026-07-21T12:00:00.000Z','2026-07-28T12:00:00.000Z'),
('prj_exterior','Prospecção Exterior','Vender automações para brasileiros que moram no exterior.','planejamento','alta','Criar receita em moeda forte com ofertas automatizadas e recorrentes.','Definir nicho inicial, oferta e lista dos primeiros 30 contatos.',0,0,'2026-08-01T18:00:00.000Z','2026-07-30T08:00:00.000Z','2026-07-30T08:00:00.000Z','2026-07-30T08:00:00.000Z'),
('prj_chocomilk','Chocomilk','Entregar cardápio digital e controle simples de estoque.','aguardando','media','Validar um produto replicável em outros comércios.','Confirmar se a apresentação da proposta será presencial ou online.',0,0,NULL,'2026-07-26T12:00:00.000Z','2026-07-21T12:00:00.000Z','2026-07-26T12:00:00.000Z'),
('prj_cris','Cris Paula','Gerar leads qualificados para planos de saúde e consolidar um case.','ativo','alta','Transformar gestão pontual em acompanhamento recorrente de marketing.','Documentar resultados da campanha e preparar a próxima oferta.',0,1200,NULL,'2026-07-23T12:00:00.000Z','2026-07-19T12:00:00.000Z','2026-07-23T12:00:00.000Z'),
('prj_ducks','Duck''s Team','Evoluir a plataforma de gestão do time de poker.','aguardando','media','Manter um projeto recorrente com expansão de módulos.','Aguardar validação do cliente sobre grade, perfis e desempenho técnico.',0,0,NULL,'2026-07-21T12:00:00.000Z','2026-06-12T12:00:00.000Z','2026-07-21T12:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `tasks` (`id`,`project_id`,`title`,`description`,`status`,`priority`,`reason`,`due_at`,`completed_at`,`created_at`,`updated_at`) VALUES
('tsk_ismael_followup','prj_ismael','Fazer follow-up da proposta do Dr. Ismael','','pendente','critica','O projeto está mais próximo de virar receita recorrente e produto escalável.','2026-07-30T15:00:00.000Z',NULL,'2026-07-25T12:00:00.000Z','2026-07-25T12:00:00.000Z'),
('tsk_aston_next','prj_aston','Definir próxima ação comercial da Aston','','pendente','alta','A oportunidade tem potencial de contrato de longo prazo.','2026-07-30T17:00:00.000Z',NULL,'2026-07-28T12:00:00.000Z','2026-07-28T12:00:00.000Z'),
('tsk_exterior_offer','prj_exterior','Preparar oferta para brasileiros no exterior','','pendente','alta','A oferta pode gerar receita em moeda forte com automações replicáveis.','2026-07-30T20:00:00.000Z',NULL,'2026-07-30T08:00:00.000Z','2026-07-30T08:00:00.000Z'),
('tsk_chocomilk_format','prj_chocomilk','Confirmar formato da apresentação da Chocomilk','','aguardando','media','A validação pode abrir um produto para outras sorveterias.','2026-07-31T15:00:00.000Z',NULL,'2026-07-26T12:00:00.000Z','2026-07-26T12:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `history` (`id`,`type`,`entity_type`,`entity_id`,`summary`,`detail`,`created_at`) VALUES
('evt_initial','criado','sistema',NULL,'SOL v0.5.0 iniciada','Banco, memória compartilhada, cache e provedores de IA preparados.','2026-07-30T08:00:00.000Z');
