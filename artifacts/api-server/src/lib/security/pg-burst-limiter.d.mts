import type { BurstHitResult, BurstLimiterLike } from "./burst-limiter.d.mts";

export class PostgresBurstLimiter implements BurstLimiterLike {
  constructor(opts: {
    db: { execute: (query: unknown) => Promise<{ rows?: Record<string, unknown>[] }> };
    windowMs: number;
    maxHits: number;
    scope: string;
    now?: () => Date;
  });
  windowMs: number;
  maxHits: number;
  scope: string;
  hit(key: string): Promise<BurstHitResult>;
  reset(key?: string): Promise<void>;
  size(): Promise<number>;
}
