import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

async function ensureApiKeysTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        key_prefix VARCHAR(8) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`);
    // Task #158 — demo-key columns. Idempotent.
    await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS request_quota INTEGER`);
    await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(32)`);
    // Managed-rollout keys may only run firewall checks.
    await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'full'`);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_ip_hash_created
        ON api_keys(ip_hash, created_at)
    `);
    logger.info("Startup migration: api_keys table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: api_keys table warning (non-fatal)");
  }
}

async function ensureApiUsageTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_usage (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id VARCHAR NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        endpoint VARCHAR(500) NOT NULL,
        response_status INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_usage_key_created ON api_usage(api_key_id, created_at)`);
    // Task #132 — vendor spend telemetry columns. Idempotent.
    await db.execute(sql`ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS tokens INTEGER NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS cost_micros BIGINT NOT NULL DEFAULT 0`);
    logger.info("Startup migration: api_usage table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: api_usage table warning (non-fatal)");
  }
}

async function ensureUsersSpendOverrideColumn() {
  // Task #132 — admin per-customer spend cap override.
  // null = plan default, -1 = unlimited, >= 0 = cap in micro-USD.
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_spend_override_micros BIGINT`,
    );
    logger.info("Startup migration: users.api_spend_override_micros column ensured");
  } catch (err) {
    logger.warn(
      { err },
      "Startup migration: users.api_spend_override_micros column warning (non-fatal)",
    );
  }
}

async function ensureUsersStripeColumns() {
  // Task #186 — Stripe migration. `stripe_customer_id` holds the cus_... id
  // created on first checkout; the existing `subscription_id` column now stores
  // the active Stripe subscription id (sub_...). Idempotent.
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR`,
    );
    logger.info("Startup migration: users.stripe_customer_id column ensured");
  } catch (err) {
    logger.warn(
      { err },
      "Startup migration: users.stripe_customer_id column warning (non-fatal)",
    );
  }
}

async function ensureWebhooksTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url VARCHAR(2000) NOT NULL,
        secret VARCHAR(64) NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_webhooks_user_id_unique ON webhooks(user_id)`);
    logger.info("Startup migration: webhooks table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: webhooks table warning (non-fatal)");
  }
}

async function ensureWebhookDeliveriesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id VARCHAR NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        attempt INTEGER NOT NULL DEFAULT 1,
        success INTEGER NOT NULL DEFAULT 0,
        delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at)`);
    logger.info("Startup migration: webhook_deliveries table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: webhook_deliveries table warning (non-fatal)");
  }
}

async function ensurePersonalScansTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS personal_scans (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        flags TEXT NOT NULL,
        suggestions TEXT NOT NULL,
        level TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_personal_scans_user_id ON personal_scans(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_personal_scans_created_at ON personal_scans(user_id, created_at)`);
    logger.info("Startup migration: personal_scans table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: personal_scans table warning (non-fatal)");
  }
}

async function ensurePersonalAlertsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS personal_alerts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        related_scan_id INTEGER,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_personal_alerts_user_id ON personal_alerts(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_personal_alerts_user_read ON personal_alerts(user_id, is_read)`);
    logger.info("Startup migration: personal_alerts table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: personal_alerts table warning (non-fatal)");
  }
}

async function ensureMobileProtectedAppsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mobile_protected_apps (
        user_id TEXT PRIMARY KEY,
        packages JSONB NOT NULL DEFAULT '[]'::jsonb,
        firewall_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Startup migration: mobile_protected_apps table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: mobile_protected_apps table warning (non-fatal)");
  }
}

async function ensureDevScansTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dev_scans (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        input_text TEXT NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        issues TEXT NOT NULL DEFAULT '[]',
        sanitized_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dev_scans_user_id ON dev_scans(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dev_scans_user_created ON dev_scans(user_id, created_at)`);
    logger.info("Startup migration: dev_scans table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: dev_scans table warning (non-fatal)");
  }
}

async function ensureFirewallOutcomesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS firewall_outcomes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        api_key_id TEXT,
        level TEXT NOT NULL,
        action TEXT NOT NULL,
        risk_score INTEGER,
        categories TEXT NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_firewall_outcomes_user_id ON firewall_outcomes(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_firewall_outcomes_api_key_day ON firewall_outcomes(api_key_id, created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_firewall_outcomes_created_at ON firewall_outcomes(created_at)`);
    // Task #142: extension 1.3.5 attaches a content-free `pieces` summary
    // (counts of prompt + file pieces, per-piece level histogram) so we
    // can answer "how often did file scanning fire?" without ever
    // ingesting attachment text. Nullable for backward compatibility
    // with 1.3.4 and earlier clients which never send the field.
    await db.execute(sql`ALTER TABLE firewall_outcomes ADD COLUMN IF NOT EXISTS pieces JSONB`);
    logger.info("Startup migration: firewall_outcomes table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: firewall_outcomes table warning (non-fatal)");
  }
}

async function ensureBurstLimitHitsTable() {
  // Backing store for the per-minute burst limiter. One row per request,
  // pruned in-line by `PostgresBurstLimiter.hit()` (each call deletes its
  // own key's expired rows). Lives in Postgres so the counters survive
  // restarts and are shared across api-server instances — see task #131.
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS burst_limit_hits (
        id BIGSERIAL PRIMARY KEY,
        scope VARCHAR(32) NOT NULL,
        bucket_key VARCHAR(128) NOT NULL,
        hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_burst_limit_hits_lookup
        ON burst_limit_hits(scope, bucket_key, hit_at)
    `);
    logger.info("Startup migration: burst_limit_hits table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: burst_limit_hits table warning (non-fatal)");
  }
}

// Anonymous extension uninstall survey (POST /api/extension/uninstall-feedback).
// No user id, email or IP is stored — only the reason, an optional short
// comment and the extension version.
async function ensureExtensionUninstallFeedbackTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extension_uninstall_feedback (
        id SERIAL PRIMARY KEY,
        reason VARCHAR(32) NOT NULL,
        comment TEXT,
        extension_version VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Startup migration: extension_uninstall_feedback table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: extension_uninstall_feedback table warning (non-fatal)");
  }
}

async function ensureContactInquiriesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Startup migration: contact_inquiries table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: contact_inquiries table warning (non-fatal)");
  }
}

async function ensureOrganizationTables() {
  // Organizations (Team / Enterprise) and their members. Mirrors
  // lib/db/src/schema/organizations.ts. Idempotent.
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        plan VARCHAR(20) NOT NULL DEFAULT 'business',
        seat_limit INTEGER NOT NULL DEFAULT 10,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT organizations_plan_valid CHECK (plan IN ('business', 'enterprise')),
        CONSTRAINT organizations_status_valid CHECK (status IN ('active', 'suspended')),
        CONSTRAINT organizations_seat_limit_positive CHECK (seat_limit >= 1)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organization_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(320) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        status VARCHAR(20) NOT NULL DEFAULT 'invited',
        invite_token_hash VARCHAR(64),
        invited_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        joined_at TIMESTAMPTZ,
        removed_at TIMESTAMPTZ,
        CONSTRAINT organization_members_role_valid CHECK (role IN ('owner', 'admin', 'member')),
        CONSTRAINT organization_members_status_valid CHECK (status IN ('invited', 'active', 'removed'))
      )
    `);
    // Self-serve Team billing columns.
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30)`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_period VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ`);
    // Managed rollout columns.
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_domains TEXT`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enrollment_token_hash VARCHAR(64)`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enrollment_token_prefix VARCHAR(12)`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS organizations_enrollment_token_hash_unique
        ON organizations(enrollment_token_hash)
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_subscription_id_unique
        ON organizations(stripe_subscription_id)
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_invite_token ON organization_members(invite_token_hash)`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_one_active_org
        ON organization_members(user_id) WHERE status = 'active'
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_live_email
        ON organization_members(org_id, email) WHERE status <> 'removed'
    `);
    logger.info("Startup migration: organization tables ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: organization tables warning (non-fatal)");
  }
}

async function ensurePasswordResetTokensTable() {
  // One-time password reset links (sha256 of the token only). Idempotent.
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
        ON password_reset_tokens(user_id, created_at)
    `);
    logger.info("Startup migration: password_reset_tokens table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: password_reset_tokens table warning (non-fatal)");
  }
}

export async function runStartupMigrations() {
  await ensureApiKeysTable();
  await ensureApiUsageTable();
  await ensureUsersSpendOverrideColumn();
  await ensureUsersStripeColumns();
  await ensureWebhooksTable();
  await ensureWebhookDeliveriesTable();
  await ensurePersonalScansTable();
  await ensurePersonalAlertsTable();
  await ensureMobileProtectedAppsTable();
  await ensureDevScansTable();
  await ensureFirewallOutcomesTable();
  await ensureBurstLimitHitsTable();
  await ensureContactInquiriesTable();
  await ensureExtensionUninstallFeedbackTable();
  await ensureOrganizationTables();
  await ensurePasswordResetTokensTable();
  await ensureDemoUser();
}

// Task #158 — single shared "demo" account that public-visitor demo
// API keys (POST /api/dev/demo-key) are bound to. Idempotent. The user
// is created with planType="personal" so the v1 router's "free plans
// can't call /api/v1/*" gate doesn't block demo-key calls; the actual
// 50-request lifetime cap on each demo key is enforced separately by
// apiKeyAuth via api_keys.request_quota.
const DEMO_USER_ID = "system-demo-user";

async function ensureDemoUser() {
  try {
    await db.execute(sql`
      INSERT INTO users (id, email, first_name, last_name, plan_type, auth_provider, role)
      VALUES (${DEMO_USER_ID}, 'demo@eraseai.local', 'Demo', 'User', 'personal', 'system', 'user')
      ON CONFLICT (id) DO UPDATE
        SET plan_type = 'personal'
    `);
    logger.info("Startup migration: demo user ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: demo user warning (non-fatal)");
  }
}
