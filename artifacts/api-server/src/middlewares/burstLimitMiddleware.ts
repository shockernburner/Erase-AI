import type { RequestHandler } from "express";
import {
  BurstLimiter,
  createApiKeyBurstMiddleware,
  createIpBurstMiddleware,
} from "../lib/security/burst-limiter.mjs";

const apiKeyLimiter = new BurstLimiter({ windowMs: 60_000, maxHits: 60 });
const ipLimiter = new BurstLimiter({ windowMs: 60_000, maxHits: 30 });

export function apiKeyBurstLimit(): RequestHandler {
  return createApiKeyBurstMiddleware({ limiter: apiKeyLimiter, maxHits: 60 });
}

export function ipBurstLimit(): RequestHandler {
  return createIpBurstMiddleware({ limiter: ipLimiter, maxHits: 30 });
}

export function _resetBurstLimitersForTesting(): void {
  apiKeyLimiter.reset();
  ipLimiter.reset();
}
