// Postgres-backed burst limiter — durable across api-server restarts and
// shared across multiple api-server instances.
//
// Implements the same `{ hit, reset, size }` contract as the in-memory
// `BurstLimiter`, except `hit()` returns a Promise (the Express middleware
// factory in `burst-limiter.mjs` already detects and awaits this).
//
// Backing table: `burst_limit_hits(scope, bucket_key, hit_at)`. One row
// per request, indexed on (scope, bucket_key, hit_at). The sliding-window
// check, the cleanup of expired rows, and the insert of the new hit all
// happen in a single round-trip CTE so we don't pay 2-3 RTTs per request.
//
// Concurrency note: at the boundary, two parallel requests for the same
// key could both observe `count < maxHits` in the same snapshot and both
// insert, briefly admitting (maxHits + 1). That's acceptable for an
// abuse brake — we're not protecting a critical-section invariant, we're
// keeping a leaked key from cooking the AI bill — and it's the same
// trade-off Redis-INCR-with-EXPIRE makes.

import { sql } from "drizzle-orm";

export class PostgresBurstLimiter {
  constructor({ db, windowMs, maxHits, scope, now = () => new Date() } = {}) {
    if (!db || typeof db.execute !== "function") {
      throw new Error("PostgresBurstLimiter: db (Drizzle node-postgres) is required");
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error("PostgresBurstLimiter: windowMs must be a positive number");
    }
    if (!Number.isFinite(maxHits) || maxHits <= 0) {
      throw new Error("PostgresBurstLimiter: maxHits must be a positive number");
    }
    if (typeof scope !== "string" || scope.length === 0) {
      throw new Error("PostgresBurstLimiter: scope (string) is required");
    }
    this.db = db;
    this.windowMs = windowMs;
    this.maxHits = maxHits;
    this.scope = scope;
    this.now = now;
  }

  async hit(key) {
    const nowDate = this.now();
    const nowMs = nowDate instanceof Date ? nowDate.getTime() : Number(nowDate);
    const cutoffDate = new Date(nowMs - this.windowMs);
    const insertDate = new Date(nowMs);

    // One round-trip:
    //   1) delete rows that fell out of this key's window (housekeeping),
    //   2) count rows still in the window + grab the oldest's timestamp,
    //   3) insert a new hit iff cnt < maxHits,
    //   4) return cnt, oldest, and whether we inserted.
    // All four CTEs see the same snapshot, so the count we report is the
    // count *before* our own insert (which is what the in-memory limiter
    // returns too).
    const result = await this.db.execute(sql`
      WITH del AS (
        DELETE FROM burst_limit_hits
        WHERE scope = ${this.scope}
          AND bucket_key = ${key}
          AND hit_at <= ${cutoffDate}
        RETURNING 1
      ),
      existing AS (
        SELECT hit_at FROM burst_limit_hits
        WHERE scope = ${this.scope}
          AND bucket_key = ${key}
          AND hit_at > ${cutoffDate}
      ),
      agg AS (
        SELECT COUNT(*)::int AS cnt, MIN(hit_at) AS oldest FROM existing
      ),
      ins AS (
        INSERT INTO burst_limit_hits (scope, bucket_key, hit_at)
        SELECT ${this.scope}, ${key}, ${insertDate} FROM agg WHERE cnt < ${this.maxHits}
        RETURNING hit_at
      )
      SELECT
        agg.cnt AS cnt,
        agg.oldest AS oldest,
        EXISTS(SELECT 1 FROM ins) AS inserted
      FROM agg
    `);

    const row = result.rows?.[0] ?? {};
    const cnt = Number(row.cnt ?? 0);
    const inserted = row.inserted === true || row.inserted === "t";
    if (!inserted) {
      const oldestRaw = row.oldest;
      const oldestMs = oldestRaw instanceof Date
        ? oldestRaw.getTime()
        : (oldestRaw ? new Date(oldestRaw).getTime() : nowMs);
      const retryAfterMs = Math.max(0, oldestMs + this.windowMs - nowMs);
      return { allowed: false, retryAfterMs, remaining: 0 };
    }
    // remaining mirrors the in-memory limiter: maxHits - (cnt + 1) where
    // cnt is the pre-insert count.
    const remaining = Math.max(0, this.maxHits - (cnt + 1));
    return { allowed: true, retryAfterMs: 0, remaining };
  }

  async reset(key) {
    if (key === undefined) {
      await this.db.execute(sql`DELETE FROM burst_limit_hits WHERE scope = ${this.scope}`);
    } else {
      await this.db.execute(
        sql`DELETE FROM burst_limit_hits WHERE scope = ${this.scope} AND bucket_key = ${key}`,
      );
    }
  }

  async size() {
    const r = await this.db.execute(sql`
      SELECT COUNT(DISTINCT bucket_key)::int AS n
      FROM burst_limit_hits
      WHERE scope = ${this.scope}
    `);
    return Number(r.rows?.[0]?.n ?? 0);
  }
}
