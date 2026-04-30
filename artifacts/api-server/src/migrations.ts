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

export async function runStartupMigrations() {
  await ensureApiKeysTable();
  await ensureApiUsageTable();
  await ensureUsersSpendOverrideColumn();
  await ensureWebhooksTable();
  await ensureWebhookDeliveriesTable();
  await ensurePersonalScansTable();
  await ensurePersonalAlertsTable();
  await ensureDevScansTable();
  await ensureFirewallOutcomesTable();
  await ensureBurstLimitHitsTable();
  await ensureContactInquiriesTable();
  try {
    const demoDatasets = await db.execute(sql`
      SELECT id FROM datasets WHERE user_id = 'system-demo-user'
    `);

    if (demoDatasets.rows.length > 0) {
      const ids = demoDatasets.rows.map((r: Record<string, unknown>) => r.id as string);
      for (const id of ids) {
        await db.execute(sql`DELETE FROM analysis_results WHERE dataset_id = ${id}`);
        await db.execute(sql`DELETE FROM dataset_operations WHERE dataset_id = ${id}`);

        const versions = await db.execute(sql`SELECT id FROM dataset_versions WHERE dataset_id = ${id}`);
        for (const v of versions.rows) {
          await db.execute(sql`DELETE FROM dataset_rows WHERE version_id = ${(v as Record<string, unknown>).id}`);
        }
        await db.execute(sql`DELETE FROM dataset_versions WHERE dataset_id = ${id}`);
        await db.execute(sql`DELETE FROM datasets WHERE id = ${id}`);
      }
    }

    await db.execute(sql`DELETE FROM feedback WHERE user_id = 'system-demo-user'`);
    await db.execute(sql`DELETE FROM users WHERE id = 'system-demo-user'`);

    logger.info("Startup migration: cleaned up legacy demo user data");
  } catch (err) {
    logger.warn({ err }, "Startup migration warning (non-fatal)");
  }
}
