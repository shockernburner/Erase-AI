import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// The five live plan names. Kept here (rather than imported from
// `@workspace/api-zod`) so the DB package has no dependency on the HTTP
// layer. Mirror of `AuthUserPlanType` in lib/api-zod — keep them in sync.
// Enforced at the DB level by the `plan_type_valid` CHECK constraint on
// `users.plan_type` so the column can never hold e.g. "trial", "PRO", or
// a typo (task #138).
export const PLAN_TYPES = ["free", "personal", "pro", "business", "enterprise"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

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
  planType: varchar("plan_type", { length: 20 }).$type<PlanType>().notNull().default("free"),
  subscriptionId: varchar("subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 30 }),
  // Stripe customer id (cus_...) — created on first checkout and reused for
  // subsequent checkouts and cancellations. `subscription_id` above holds the
  // active Stripe subscription id (sub_...).
  stripeCustomerId: varchar("stripe_customer_id"),
  planStartDate: timestamp("plan_start_date", { withTimezone: true }),
  planEndDate: timestamp("plan_end_date", { withTimezone: true }),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: varchar("terms_version", { length: 20 }),
  // Admin-controlled per-customer override for the monthly vendor-spend cap
  // enforced on /api/v1/* (stored in micro-USD, i.e. 1 = $0.000001). NULL
  // means use the plan default from PLAN_SPEND_BUDGET_MICROS. Set to -1 to
  // explicitly mark a customer as unlimited (e.g. negotiated enterprise
  // contracts) without changing their planType.
  apiSpendOverrideMicros: bigint("api_spend_override_micros", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check(
    "plan_type_valid",
    sql`${table.planType} IN ('free', 'personal', 'pro', 'business', 'enterprise')`,
  ),
]);

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
  // Task #158 — public-visitor demo keys minted by /api/dev/demo-key.
  // For normal user-created keys these are NULL and behave as before.
  // - expiresAt: hard expiry; the key is rejected after this timestamp.
  // - requestQuota: total requests this key may serve over its lifetime
  //   (counted from api_usage rows for this key_id).
  // - ipHash: short SHA-256 of the issuing IP, used to enforce a
  //   1-issuance-per-IP-per-24h cap on the mint endpoint.
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  requestQuota: integer("request_quota"),
  ipHash: varchar("ip_hash", { length: 32 }),
}, (table) => [
  index("idx_api_keys_user_id").on(table.userId),
  index("idx_api_keys_key_hash").on(table.keyHash),
  index("idx_api_keys_ip_hash_created").on(table.ipHash, table.createdAt),
]);

export type ApiKey = typeof apiKeysTable.$inferSelect;
export type InsertApiKey = typeof apiKeysTable.$inferInsert;

export const apiUsageTable = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeysTable.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  responseStatus: integer("response_status"),
  // Token + cost telemetry for the per-key monthly vendor-spend cap (task
  // #132). `tokens` is the estimated total prompt+completion tokens this
  // request would have cost a vendor (we approximate by request+response
  // byte size / 4). `costMicros` is that token count multiplied by the
  // plan's per-token rate, stored in micro-USD (1 = $0.000001) so we can
  // sum it as a plain integer in SQL without floating-point drift. Both
  // default to 0 for legacy rows and for non-vendor routes.
  tokens: integer("tokens").notNull().default(0),
  costMicros: bigint("cost_micros", { mode: "number" }).notNull().default(0),
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
  uniqueIndex("idx_webhooks_user_id_unique").on(table.userId),
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
