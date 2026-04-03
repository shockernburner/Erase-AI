import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider", { length: 20 }).notNull().default("email"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  planType: varchar("plan_type", { length: 20 }).notNull().default("free"),
  subscriptionId: varchar("subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 30 }),
  planStartDate: timestamp("plan_start_date", { withTimezone: true }),
  planEndDate: timestamp("plan_end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const feedbackTable = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
]);

export type Feedback = typeof feedbackTable.$inferSelect;
export type InsertFeedback = typeof feedbackTable.$inferInsert;

export const apiKeysTable = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("idx_api_keys_user_id").on(table.userId),
  index("idx_api_keys_key_hash").on(table.keyHash),
]);

export type ApiKey = typeof apiKeysTable.$inferSelect;
export type InsertApiKey = typeof apiKeysTable.$inferInsert;

export const apiUsageTable = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeysTable.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  responseStatus: integer("response_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_api_usage_key_created").on(table.apiKeyId, table.createdAt),
]);

export type ApiUsage = typeof apiUsageTable.$inferSelect;
export type InsertApiUsage = typeof apiUsageTable.$inferInsert;

export const webhooksTable = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 2000 }).notNull(),
  secret: varchar("secret", { length: 64 }).notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_webhooks_user_id").on(table.userId),
  index("idx_webhooks_user_id_unique").on(table.userId),
]);

export type Webhook = typeof webhooksTable.$inferSelect;
export type InsertWebhook = typeof webhooksTable.$inferInsert;

export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooksTable.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attempt: integer("attempt").notNull().default(1),
  success: integer("success").notNull().default(0),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_webhook_deliveries_webhook_id").on(table.webhookId),
  index("idx_webhook_deliveries_delivered_at").on(table.deliveredAt),
]);

export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveriesTable.$inferInsert;

export const pageVisitsTable = pgTable("page_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: varchar("path", { length: 500 }).notNull(),
  userId: varchar("user_id"),
  userAgent: varchar("user_agent", { length: 1000 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_page_visits_created_at").on(table.createdAt),
]);
