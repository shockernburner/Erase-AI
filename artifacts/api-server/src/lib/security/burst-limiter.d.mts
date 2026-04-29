import type { RequestHandler } from "express";

export interface BurstHitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export class BurstLimiter {
  constructor(opts: {
    windowMs: number;
    maxHits: number;
    now?: () => number;
  });
  windowMs: number;
  maxHits: number;
  hit(key: string): BurstHitResult;
  reset(key?: string): void;
  size(): number;
}

export function hashIp(ip: string): string;

export function createApiKeyBurstMiddleware(opts?: {
  windowMs?: number;
  maxHits?: number;
  limiter?: BurstLimiter;
}): RequestHandler;

export function createIpBurstMiddleware(opts?: {
  windowMs?: number;
  maxHits?: number;
  limiter?: BurstLimiter;
}): RequestHandler;
