import type { RequestHandler } from "express";

export interface BurstHitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export interface BurstLimiterLike {
  windowMs: number;
  maxHits: number;
  hit(key: string): BurstHitResult | Promise<BurstHitResult>;
  reset(key?: string): void | Promise<void>;
  size?(): number | Promise<number>;
}

export class BurstLimiter implements BurstLimiterLike {
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
  limiter?: BurstLimiterLike;
}): RequestHandler;

export function createIpBurstMiddleware(opts?: {
  windowMs?: number;
  maxHits?: number;
  limiter?: BurstLimiterLike;
}): RequestHandler;
