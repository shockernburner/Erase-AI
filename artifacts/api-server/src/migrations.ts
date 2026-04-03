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
    logger.info("Startup migration: api_usage table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: api_usage table warning (non-fatal)");
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

export async function runStartupMigrations() {
  await ensureApiKeysTable();
  await ensureApiUsageTable();
  await ensureWebhooksTable();
  await ensureWebhookDeliveriesTable();
  await ensurePersonalScansTable();
  await ensurePersonalAlertsTable();
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
