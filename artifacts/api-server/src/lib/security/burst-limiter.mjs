import crypto from "node:crypto";

export class BurstLimiter {
  constructor({ windowMs, maxHits, now = () => Date.now() } = {}) {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error("BurstLimiter: windowMs must be a positive number");
    }
    if (!Number.isFinite(maxHits) || maxHits <= 0) {
      throw new Error("BurstLimiter: maxHits must be a positive number");
    }
    this.windowMs = windowMs;
    this.maxHits = maxHits;
    this.now = now;
    this.buckets = new Map();
  }

  hit(key) {
    const now = this.now();
    const cutoff = now - this.windowMs;
    let arr = this.buckets.get(key);
    if (!arr) {
      arr = [];
      this.buckets.set(key, arr);
    }
    let drop = 0;
    while (drop < arr.length && arr[drop] <= cutoff) drop++;
    if (drop > 0) arr.splice(0, drop);
    if (arr.length >= this.maxHits) {
      const oldest = arr[0];
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
      return { allowed: false, retryAfterMs, remaining: 0 };
    }
    arr.push(now);
    return { allowed: true, retryAfterMs: 0, remaining: this.maxHits - arr.length };
  }

  reset(key) {
    if (key === undefined) this.buckets.clear();
    else this.buckets.delete(key);
  }

  size() {
    return this.buckets.size;
  }
}

export function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

function send429(res, { maxHits, retryAfterMs, code, scope }) {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  res.setHeader("Retry-After", String(retryAfterSec));
  res.status(429).json({
    error: `${scope} burst limit exceeded: ${maxHits} requests per minute. Try again in ${retryAfterSec}s.`,
    code,
    retryAfter: retryAfterSec,
    limit: maxHits,
  });
}

export function createApiKeyBurstMiddleware({ windowMs = 60_000, maxHits = 60, limiter } = {}) {
  const lim = limiter ?? new BurstLimiter({ windowMs, maxHits });
  return (req, res, next) => {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) return next();
    const r = lim.hit(apiKeyId);
    if (!r.allowed) {
      return send429(res, {
        maxHits,
        retryAfterMs: r.retryAfterMs,
        code: "BURST_LIMIT_EXCEEDED",
        scope: "Per-API-key",
      });
    }
    next();
  };
}

export function createIpBurstMiddleware({ windowMs = 60_000, maxHits = 30, limiter } = {}) {
  const lim = limiter ?? new BurstLimiter({ windowMs, maxHits });
  return (req, res, next) => {
    const rawIp = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const key = hashIp(rawIp);
    const r = lim.hit(key);
    if (!r.allowed) {
      return send429(res, {
        maxHits,
        retryAfterMs: r.retryAfterMs,
        code: "IP_BURST_LIMIT_EXCEEDED",
        scope: "Per-IP",
      });
    }
    next();
  };
}
