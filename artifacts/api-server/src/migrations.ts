import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

const SYSTEM_USER_ID = "system-demo-user";

export async function runStartupMigrations() {
  await db.execute(sql`
    INSERT INTO users (id, username, email, first_name, last_name, created_at, updated_at)
    VALUES (${SYSTEM_USER_ID}, 'system', NULL, 'System', 'Demo', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  const result = await db.execute(sql`
    UPDATE datasets SET user_id = ${SYSTEM_USER_ID} WHERE user_id IS NULL
  `);

  logger.info("Startup migration: ensured system demo user exists and assigned orphaned datasets");
}
