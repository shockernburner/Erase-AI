import type { RequestHandler } from "express";
import { db } from "@workspace/db";
import {
  BurstLimiter,
  createApiKeyBurstMiddleware,
  createIpBurstMiddleware,
} from "../lib/security/burst-limiter.mjs";
import { PostgresBurstLimiter } from "../lib/security/pg-burst-limiter.mjs";

// Production: counters live in Postgres (`burst_limit_hits` table). They
// survive api-server restarts and are shared across every api-server
// instance behind the load balancer, so the per-key 60/min budget stays a
// real per-key budget instead of `60 × N instances`. See task #131.
//
// The in-memory `BurstLimiter` is still exported for the unit tests in
// `tests/burst-limiter.test.mjs` — both backends satisfy the same
// `{ hit, reset, size }` contract, so the middleware factories below
// don't care which is wired in.
const apiKeyLimiter = new PostgresBurstLimiter({
  db,
  windowMs: 60_000,
  maxHits: 60,
  scope: "api-key",
});
const ipLimiter = new PostgresBurstLimiter({
  db,
  windowMs: 60_000,
  maxHits: 30,
  scope: "ip",
});

export function apiKeyBurstLimit(): RequestHandler {
  return createApiKeyBurstMiddleware({ limiter: apiKeyLimiter, maxHits: 60 });
}

export function ipBurstLimit(): RequestHandler {
  return createIpBurstMiddleware({ limiter: ipLimiter, maxHits: 30 });
}

export async function _resetBurstLimitersForTesting(): Promise<void> {
  await apiKeyLimiter.reset();
  await ipLimiter.reset();
}

// Used by the in-memory unit tests / scripts that want a fresh
// process-local limiter without touching Postgres.
export { BurstLimiter };
