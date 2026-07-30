import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("invited"),
  plan: text("plan").notNull().default("beta"),
  workspaceId: text("workspace_id").notNull(),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(false),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
  uniqueIndex("users_workspace_idx").on(table.workspaceId),
  index("users_status_idx").on(table.status),
]);

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authCredentials = sqliteTable("auth_credentials", {
  userId: text("user_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  iterations: integer("iterations").notNull().default(100000),
  updatedAt: text("updated_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [
  uniqueIndex("auth_sessions_token_idx").on(table.tokenHash),
  index("auth_sessions_user_idx").on(table.userId),
  index("auth_sessions_expires_idx").on(table.expiresAt),
]);

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  kind: text("kind").notNull().default("invite"),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  revokedAt: text("revoked_at"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("invitations_token_idx").on(table.tokenHash),
  index("invitations_user_idx").on(table.userId, table.createdAt),
  index("invitations_expires_idx").on(table.expiresAt),
]);

export const loginAttempts = sqliteTable("login_attempts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("login_attempts_email_idx").on(table.email, table.createdAt),
]);

export const assistantProfiles = sqliteTable("assistant_profiles", {
  workspaceId: text("workspace_id").primaryKey(),
  assistantName: text("assistant_name").notNull().default("SOL"),
  userName: text("user_name").notNull(),
  mission: text("mission").notNull().default(""),
  motivation: text("motivation").notNull().default(""),
  tone: text("tone").notNull().default("direto"),
  challengeLevel: integer("challenge_level").notNull().default(8),
  initiativeLevel: integer("initiative_level").notNull().default(8),
  adhdSupport: integer("adhd_support", { mode: "boolean" }).notNull().default(true),
  focusAreas: text("focus_areas").notNull().default("receita recorrente, automação, família"),
  workHours: text("work_hours").notNull().default("08:00-18:00"),
  quietHours: text("quiet_hours").notNull().default("22:00-07:00"),
  monthlyGoal: real("monthly_goal").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  name: text("name").notNull(),
  objective: text("objective").notNull().default(""),
  status: text("status").notNull().default("planejamento"),
  priority: text("priority").notNull().default("media"),
  reason: text("reason").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  recurringValue: real("recurring_value").notNull().default(0),
  oneTimeValue: real("one_time_value").notNull().default(0),
  dueDate: text("due_date"),
  lastUpdate: text("last_update").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("projects_workspace_idx").on(table.workspaceId),
  index("projects_status_idx").on(table.status),
  index("projects_updated_idx").on(table.updatedAt),
]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("pendente"),
  priority: text("priority").notNull().default("media"),
  reason: text("reason").notNull().default(""),
  dueAt: text("due_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("tasks_workspace_idx").on(table.workspaceId),
  index("tasks_project_idx").on(table.projectId),
  index("tasks_status_idx").on(table.status),
  index("tasks_due_idx").on(table.dueAt),
]);

export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("history_workspace_idx").on(table.workspaceId),
  index("history_created_idx").on(table.createdAt),
  index("history_entity_idx").on(table.entityType, table.entityId),
]);

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("contexto"),
  content: text("content").notNull(),
  importance: integer("importance").notNull().default(5),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
}, (table) => [
  index("memories_workspace_idx").on(table.workspaceId),
  index("memories_project_idx").on(table.projectId),
  index("memories_importance_idx").on(table.importance),
]);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  dayKey: text("day_key").notNull().unique(),
  summary: text("summary").notNull().default(""),
  greetedAt: text("greeted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("ws_diego"),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  provider: text("provider"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("messages_workspace_idx").on(table.workspaceId),
  index("messages_conversation_idx").on(table.conversationId, table.createdAt),
]);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  activeProvider: text("active_provider").notNull().default("openai"),
  openaiModel: text("openai_model").notNull().default("gpt-5.6-terra"),
  googleModel: text("google_model").notNull().default("gemini-3.6-flash"),
  anthropicModel: text("anthropic_model").notNull().default("claude-sonnet-5"),
  userName: text("user_name").notNull().default("Diego"),
  mission: text("mission").notNull().default("Transformar a vida da minha família com receita recorrente, automação e liberdade."),
  monthlyGoal: real("monthly_goal").notNull().default(20000),
  updatedAt: text("updated_at").notNull(),
});

export const providerCredentials = sqliteTable("provider_credentials", {
  provider: text("provider").primaryKey(),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contextCache = sqliteTable("context_cache", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expiresAt: text("expires_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  operation: text("operation").notNull().default("assistant"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  audioBytes: integer("audio_bytes").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("usage_workspace_idx").on(table.workspaceId, table.createdAt),
  index("usage_user_idx").on(table.userId, table.createdAt),
]);
