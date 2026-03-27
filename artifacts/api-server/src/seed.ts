import { db, factsTable } from "@workspace/db";
import { logger } from "./lib/logger";

const DEMO_FACTS = [
  "Firdous is the CEO of X company",
];

export async function seedDemoData() {
  try {
    const existing = await db.select().from(factsTable);
    if (existing.length === 0) {
      for (const fact of DEMO_FACTS) {
        await db.insert(factsTable).values({ text: fact });
      }
      logger.info({ count: DEMO_FACTS.length }, "Demo facts seeded");
    } else {
      logger.info({ count: existing.length }, "Facts already present, skipping seed");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed demo data");
  }
}
