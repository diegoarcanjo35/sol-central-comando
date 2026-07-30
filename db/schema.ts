import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
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
  index("projects_status_idx").on(table.status),
  index("projects_updated_idx").on(table.updatedAt),
]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
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
  index("tasks_project_idx").on(table.projectId),
  index("tasks_status_idx").on(table.status),
  index("tasks_due_idx").on(table.dueAt),
]);

export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("history_created_idx").on(table.createdAt),
  index("history_entity_idx").on(table.entityType, table.entityId),
]);

export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("contexto"),
  content: text("content").notNull(),
  importance: integer("importance").notNull().default(5),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
}, (table) => [
  index("memories_project_idx").on(table.projectId),
  index("memories_importance_idx").on(table.importance),
]);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull().unique(),
  summary: text("summary").notNull().default(""),
  greetedAt: text("greeted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  provider: text("provider"),
  createdAt: text("created_at").notNull(),
}, (table) => [
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
